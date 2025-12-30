import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

type Urgency = "low" | "normal" | "high";
type Priority = "secondary" | "main";

function isUrgency(x: unknown): x is Urgency {
    return x === "low" || x === "normal" || x === "high";
}

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function safeStringOrNull(x: unknown): string | null {
    return typeof x === "string" && x.trim() ? x.trim() : null;
}

function safeNumberOrNull(x: unknown): number | null {
    return typeof x === "number" && Number.isFinite(x) ? x : null;
}

/**
 * ✅ GET /api/adventure-quests?adventureId=...
 * Retourne les quêtes d'une aventure + status (via join chapter_quests) + urgence/priorité
 */
export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);
    const adventureId = url.searchParams.get("adventureId");

    if (!adventureId) {
        return NextResponse.json({ error: "Missing adventureId" }, { status: 400 });
    }

    const session = await getActiveSessionOrThrow();

    const { data, error } = await supabase
        .from("adventure_quests")
        .select(
            `
        id,
        adventure_id,
        room_code,
        title,
        description,
        difficulty,
        estimate_min,
        urgency,
        priority,
        created_at,
        chapter_quests:chapter_quests!chapter_quests_adventure_quest_id_fkey (
            status,
            created_at
        )
        `
        )
        .eq("adventure_id", adventureId)
        .eq("session_id", session.id) // ✅ RLS
        .eq("chapter_quests.session_id", session.id) // ✅ limite le join à la session active
        .order("created_at", { ascending: false })
        .order("created_at", {
            foreignTable: "chapter_quests",
            ascending: true, // ou false selon ton besoin
        });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const quests = (data ?? []).map((q: any) => {
        const cq = Array.isArray(q.chapter_quests)
            ? q.chapter_quests[q.chapter_quests.length - 1]
            : q.chapter_quests;

        return {
            id: q.id,
            adventure_id: q.adventure_id,
            room_code: q.room_code,
            title: q.title,
            description: q.description,
            difficulty: q.difficulty,
            estimate_min: q.estimate_min,
            urgency: q.urgency as Urgency,
            priority: q.priority as Priority,
            created_at: q.created_at,
            status: cq?.status ?? null, // "todo" | "doing" | "done" | null
        };
    });

    return NextResponse.json({ quests, data });
}

/**
 * ✅ POST /api/adventure-quests
 * Crée une quête.
 * Règle: priority existe mais n'est pas éditable => on force à "main".
 */
export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const body = await req.json().catch(() => null);

    const session = await getActiveSessionOrThrow();

    const adventure_id = safeTrim(body?.adventure_id);
    const title = safeTrim(body?.title);

    if (!adventure_id || !title) {
        return NextResponse.json({ error: "Missing adventure_id or title" }, { status: 400 });
    }

    // urgency: modifiable (si fourni), sinon default "normal"
    const urgencyRaw = body?.urgency;
    const urgency: Urgency = isUrgency(urgencyRaw) ? urgencyRaw : "normal";

    // priority: non modifiable pour l'instant => force "main"
    const priority: Priority = "main";

    const payload = {
        session_id: session.id, // ✅ REQUIRED avec RLS
        adventure_id,
        room_code: safeStringOrNull(body?.room_code),
        title,
        description: safeStringOrNull(body?.description),
        difficulty: typeof body?.difficulty === "number" ? body.difficulty : 2,
        estimate_min: safeNumberOrNull(body?.estimate_min),
        urgency,
        priority,
    };

    const { data, error } = await supabase
        .from("adventure_quests")
        .insert(payload)
        .select(
            "id,adventure_id,room_code,title,description,difficulty,estimate_min,urgency,priority,created_at,session_id"
        )
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 📝 Journal — création de quête (best-effort)
    try {
        await createJournalEntry({
            session_id: session.id,
            kind: "quests_seeded", // 💡 si tu veux: "quest_created"
            title: "📜 Nouvelle quête ajoutée",
            content: data.room_code
                ? `Une nouvelle quête a été définie dans la pièce **${data.room_code}** : “${data.title}”.`
                : `Une nouvelle quête a été définie : “${data.title}”.`,
            adventure_quest_id: data.id,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // On retourne quand même la quête créée, sinon UX relou (et ça casse la création pour un souci de journal)
        return NextResponse.json(
            { quest: data, journal_error: "Journal insert failed", details: msg },
            { status: 201 }
        );
    }

    return NextResponse.json({ quest: data }, { status: 201 });
}

/**
 * ✅ PATCH /api/adventure-quests
 * Modifie une quête existante (sans permettre de toucher priority pour l'instant).
 * Body attendu: { id, title?, description?, room_code?, difficulty?, estimate_min?, urgency? }
 */
export async function PATCH(req: Request) {
    const supabase = await supabaseServer();
    const body = await req.json().catch(() => null);

    const session = await getActiveSessionOrThrow();

    const id = safeTrim(body?.id);
    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Construire un patch “whitelist” (et on ignore priority)
    const patch: Record<string, any> = {};

    if (typeof body?.title === "string") patch.title = safeTrim(body.title) || null;
    if (typeof body?.description === "string")
        patch.description = safeStringOrNull(body.description);
    if (body?.room_code === null || typeof body?.room_code === "string")
        patch.room_code = safeStringOrNull(body.room_code);

    if (typeof body?.difficulty === "number") patch.difficulty = body.difficulty;
    if (body?.estimate_min === null || typeof body?.estimate_min === "number")
        patch.estimate_min = safeNumberOrNull(body.estimate_min);

    if (body?.urgency !== undefined) {
        if (!isUrgency(body.urgency)) {
            return NextResponse.json({ error: "Invalid urgency" }, { status: 400 });
        }
        patch.urgency = body.urgency as Urgency;
    }

    // Rien à modifier
    if (!Object.keys(patch).length) {
        return NextResponse.json({ error: "No patch fields" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("adventure_quests")
        .update(patch)
        .eq("id", id)
        .eq("session_id", session.id) // ✅ RLS coherence + sécurité
        .select(
            "id,adventure_id,room_code,title,description,difficulty,estimate_min,urgency,priority,created_at"
        )
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quest: data }, { status: 200 });
}
