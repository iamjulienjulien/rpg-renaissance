import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

const baseSelect = `
    id,
    chapter_id,
    adventure_quest_id,
    status,
    created_at,
    adventure_quests:adventure_quests!chapter_quests_adventure_quest_id_fkey (
        id,
        adventure_id,
        room_code,
        title,
        description,
        difficulty,
        estimate_min,
        priority,
        urgency,
        created_at
    )
`;

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const chapterId = url.searchParams.get("chapterId");

    // ✅ NEW: filtre status optionnel
    const status = url.searchParams.get("status");

    if (status && !["todo", "doing", "done"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (!id && !chapterId) {
        return NextResponse.json({ error: "Missing id or chapterId" }, { status: 400 });
    }

    // ✅ 1) Item par ID (scopé session)
    if (id) {
        let q = supabase
            .from("chapter_quests")
            .select(baseSelect)
            .eq("id", id)
            .eq("session_id", session.id);

        if (status) q = q.eq("status", status);

        const { data, error } = await q.maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({ item: data });
    }

    // ✅ 2) Liste par chapter (scopée session) + filtre status si fourni
    let q = supabase
        .from("chapter_quests")
        .select(baseSelect)
        .eq("chapter_id", chapterId!)
        .eq("session_id", session.id)
        .order("created_at", { ascending: false });

    if (status) q = q.eq("status", status);

    const { data, error } = await q;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const body = await req.json().catch(() => null);

    const chapter_id = typeof body?.chapter_id === "string" ? body.chapter_id : "";
    const adventure_quest_ids = Array.isArray(body?.adventure_quest_ids)
        ? body.adventure_quest_ids
        : [];

    if (!chapter_id || adventure_quest_ids.length === 0) {
        return NextResponse.json(
            { error: "Missing chapter_id or adventure_quest_ids" },
            { status: 400 }
        );
    }

    // ✅ 0) Vérifier que le chapitre appartient à la session active
    const { data: chapter, error: chErr } = await supabase
        .from("chapters")
        .select("id, session_id, status")
        .eq("id", chapter_id)
        .eq("session_id", session.id)
        .maybeSingle();

    if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });
    if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

    // ✅ 0bis) Filtrer les quêtes pour n’insérer que celles de la session
    const wantedQuestIds = adventure_quest_ids.filter(
        (x: unknown) => typeof x === "string" && x.length > 0
    ) as string[];

    const { data: allowedQuests, error: aqErr } = await supabase
        .from("adventure_quests")
        .select("id")
        .in("id", wantedQuestIds)
        .eq("session_id", session.id);

    if (aqErr) return NextResponse.json({ error: aqErr.message }, { status: 500 });

    const allowedQuestIds = new Set((allowedQuests ?? []).map((q) => q.id));
    const safeQuestIds = wantedQuestIds.filter((id) => allowedQuestIds.has(id));

    if (safeQuestIds.length === 0) {
        return NextResponse.json(
            { error: "No adventure_quests belong to active session" },
            { status: 400 }
        );
    }

    // 1️⃣ Créer les chapter_quests (avec session_id)
    const rows = safeQuestIds.map((id: string) => ({
        session_id: session.id,
        chapter_id,
        adventure_quest_id: id,
        status: "todo",
    }));

    const { data, error } = await supabase
        .from("chapter_quests")
        .insert(rows)
        .select("id,chapter_id,adventure_quest_id,status,created_at,session_id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const items = data ?? [];

    // 2️⃣ ✅ Activer le chapitre (scopé session)
    const { error: chapterErr } = await supabase
        .from("chapters")
        .update({ status: "active" })
        .eq("id", chapter_id)
        .eq("session_id", session.id);

    if (chapterErr) return NextResponse.json({ error: chapterErr.message }, { status: 500 });

    // 3️⃣ Génération auto des briefs (si possible)
    // const apiKey = process.env.OPENAI_API_KEY ?? "";
    // if (apiKey) {
    //     const { generateMissionForChapterQuest } = await import("@/lib/mission/generateMission");

    //     await Promise.all(
    //         items.map(async (it) => {
    //             try {
    //                 // ✅ login-only: generateMission va récupérer le style via auth.user -> player_profiles
    //                 await generateMissionForChapterQuest(it.id, false);
    //             } catch (e) {
    //                 console.error("Mission generation failed for", it.id, e);
    //             }
    //         })
    //     );
    // }

    return NextResponse.json(
        {
            items,
            chapter: { id: chapter_id, status: "active" },
            // missionGeneration: apiKey ? "queued" : "skipped_missing_api_key",
            session_id: session.id,
        },
        { status: 201 }
    );
}

export async function PATCH(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const body = await req.json().catch(() => null);

    const id = typeof body?.id === "string" ? body.id : "";
    const status = typeof body?.status === "string" ? body.status : "";

    if (!id || !status) {
        return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    if (!["todo", "doing", "done"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("chapter_quests")
        .update({ status })
        .eq("id", id)
        .eq("session_id", session.id)
        .select("id,chapter_id,adventure_quest_id,status,created_at,session_id")
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ item: data });
}

export async function DELETE(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { error } = await supabase
        .from("chapter_quests")
        .delete()
        .eq("id", id)
        .eq("session_id", session.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
