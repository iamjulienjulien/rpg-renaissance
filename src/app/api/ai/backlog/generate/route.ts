import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabase/server";

type InputRoom = {
    code: string;
    title: string;
};

type GeneratedQuest = {
    room_code: string | null;
    title: string;
    difficulty: number;
    estimate_min: number | null;
};

function clampInt(n: unknown, min: number, max: number, fallback: number) {
    const v = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(v)));
}

function safeTrim(s: unknown) {
    return typeof s === "string" ? s.trim() : "";
}

function normalizeDifficulty(d: unknown) {
    const v = clampInt(d, 1, 3, 2);
    return v;
}

function normalizeEstimate(n: unknown) {
    if (n === null || n === undefined) return null;
    const v = clampInt(n, 1, 240, 10);
    return v;
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);

        const adventureId = safeTrim(body?.adventureId);
        const perRoomCount = clampInt(body?.perRoomCount, 1, 10, 5);
        const allowGlobal = !!body?.allowGlobal;
        const rooms = (Array.isArray(body?.rooms) ? body.rooms : []) as InputRoom[];

        if (!adventureId) {
            return NextResponse.json({ error: "Missing adventureId" }, { status: 400 });
        }

        if (!rooms.length) {
            return NextResponse.json({ error: "No rooms provided" }, { status: 400 });
        }

        const apiKey = process.env.OPENAI_API_KEY ?? "";
        if (!apiKey) {
            return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
        }

        const supabase = supabaseServer();

        // 1) Charger les quêtes existantes (pour éviter les doublons)
        const { data: existing, error: existingErr } = await supabase
            .from("adventure_quests")
            .select("title, room_code")
            .eq("adventure_id", adventureId);

        if (existingErr) {
            return NextResponse.json({ error: existingErr.message }, { status: 500 });
        }

        const existingSet = new Set<string>();
        for (const q of existing ?? []) {
            const key = `${q.room_code ?? ""}::${(q.title ?? "").toLowerCase().trim()}`;
            existingSet.add(key);
        }

        // 2) Appeler OpenAI pour proposer des quêtes structurées
        const client = new OpenAI({ apiKey });

        const roomList = rooms.map((r) => `- ${r.code}: ${r.title}`).join("\n");

        const system = [
            "Tu es un Maître du Jeu bienveillant pour une app de RPG du quotidien.",
            "But: proposer des quêtes domestiques concrètes, courtes, motivantes, sans culpabiliser.",
            "Style: titres courts, actionnables. Pas de jargon. Pas de morale.",
            "Contraintes: pas de tâches dangereuses. Pas de conseil médical.",
            "Retour attendu: JSON strict uniquement (pas de markdown).",
        ].join(" ");

        const user = [
            `Aventure: "Réalignement du foyer".`,
            `Pièces actives:\n${roomList}`,
            "",
            `Génère ${perRoomCount} quêtes par pièce (donc ${perRoomCount * rooms.length} au total).`,
            allowGlobal
                ? `Tu peux aussi ajouter 1 à 2 quêtes "globales" (room_code=null) si pertinent.`
                : `Ne génère aucune quête globale (room_code doit être une pièce).`,
            "",
            "Format JSON attendu:",
            '{ "quests": [ { "room_code": "cuisine", "title": "Laver la vaisselle", "difficulty": 2, "estimate_min": 10 }, ... ] }',
            "",
            "Règles:",
            "- room_code doit être exactement l’un des codes ci-dessus (ou null si global autorisé).",
            "- difficulty ∈ [1..3].",
            "- estimate_min: minutes (1..60) ou null.",
            "- Pas de doublons évidents par pièce.",
        ].join("\n");

        const completion = await client.chat.completions.create({
            // Tu peux changer de modèle plus tard si tu veux.
            model: "gpt-4.1-mini",
            temperature: 0.7,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
        });

        const raw = completion.choices?.[0]?.message?.content ?? "";
        if (!raw) {
            return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
        }

        let parsed: any = null;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return NextResponse.json(
                { error: "AI response is not valid JSON", raw },
                { status: 500 }
            );
        }

        const questsRaw = Array.isArray(parsed?.quests) ? parsed.quests : [];
        if (!questsRaw.length) {
            return NextResponse.json({ error: "AI returned no quests", raw }, { status: 500 });
        }

        // 3) Normaliser, filtrer doublons, filtrer room_code invalides
        const allowedCodes = new Set<string>(rooms.map((r) => r.code));
        const cleaned: GeneratedQuest[] = [];

        for (const q of questsRaw) {
            const title = safeTrim(q?.title);
            if (!title) continue;

            const room_code = q?.room_code === null ? null : safeTrim(q?.room_code);
            if (room_code !== null && !allowedCodes.has(room_code)) continue;
            if (room_code === null && !allowGlobal) continue;

            const difficulty = normalizeDifficulty(q?.difficulty);
            const estimate_min = normalizeEstimate(q?.estimate_min);

            const key = `${room_code ?? ""}::${title.toLowerCase().trim()}`;
            if (existingSet.has(key)) continue;

            existingSet.add(key);
            cleaned.push({ room_code, title, difficulty, estimate_min });
        }

        if (!cleaned.length) {
            return NextResponse.json(
                { error: "All generated quests were duplicates/invalid" },
                { status: 400 }
            );
        }

        // 4) Insert batch dans adventure_quests
        const insertRows = cleaned.map((q) => ({
            adventure_id: adventureId,
            room_code: q.room_code,
            title: q.title,
            difficulty: q.difficulty,
            estimate_min: q.estimate_min,
        }));

        const { data: inserted, error: insErr } = await supabase
            .from("adventure_quests")
            .insert(insertRows)
            .select("*");

        if (insErr) {
            return NextResponse.json({ error: insErr.message }, { status: 500 });
        }

        return NextResponse.json({
            quests: inserted ?? [],
            generated: cleaned.length,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    }
}
