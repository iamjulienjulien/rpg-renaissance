import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

type Ctx = { params: Promise<{ id: string }> };

/**
 * ✅ baseSelect enrichi: récupère les nouvelles colonnes depuis adventure_quests
 * + jointure mission inchangée
 */
const baseSelect = `
    id,
    chapter_id,
    adventure_quest_id,
    status,
    created_at,
    session_id,
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
        created_at,
        session_id
    ),
    quest_mission_orders (
        id,
        mission_md,
        mission_json,
        model,
        created_at,
        updated_at,
        session_id
    )
`;

function normalizeOne<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function GET(_req: NextRequest, context: Ctx) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();
    const { id } = await context.params;

    let q = supabase
        .from("chapter_quests")
        .select(baseSelect)
        .eq("id", id)
        .eq("session_id", session.id);

    // ✅ Optionnel mais cohérent (si adventure_quests a session_id)
    // Empêche tout retour “cross-session” sur la jointure.
    q = q.eq("adventure_quests.session_id", session.id);

    const { data, error } = await q.maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const quest = normalizeOne((data as any).adventure_quests);
    const mission = normalizeOne((data as any).quest_mission_orders);

    // ✅ compat QuestClient: quest_id attendu
    const chapterQuest = {
        id: data.id,
        chapter_id: data.chapter_id,
        quest_id: data.adventure_quest_id,
        adventure_quest_id: data.adventure_quest_id,
        status: data.status,
        created_at: data.created_at,
        session_id: data.session_id,
    };

    return NextResponse.json({
        chapterQuest,
        quest,
        mission, // ✅ contient mission_md
        mission_md: mission?.mission_md ?? null, // ✅ shortcut pratique
        session_id: session.id,
    });
}

export async function PATCH(req: NextRequest, context: Ctx) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();
    const { id } = await context.params;

    const body = await req.json().catch(() => null);
    const status = typeof body?.status === "string" ? body.status : "";

    if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });
    if (!["todo", "doing", "done"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update scoped session, and re-select enriched join
    let q = supabase
        .from("chapter_quests")
        .update({ status })
        .eq("id", id)
        .eq("session_id", session.id)
        .select(baseSelect)
        .eq("adventure_quests.session_id", session.id)
        .maybeSingle();

    const { data, error } = await q;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const mission = normalizeOne((data as any).quest_mission_orders);

    const chapterQuest = {
        id: data.id,
        chapter_id: data.chapter_id,
        quest_id: data.adventure_quest_id,
        adventure_quest_id: data.adventure_quest_id,
        status: data.status,
        created_at: data.created_at,
        session_id: data.session_id,
    };

    return NextResponse.json({
        chapterQuest,
        mission,
        mission_md: mission?.mission_md ?? null,
        session_id: session.id,
    });
}

export async function DELETE(_req: NextRequest, context: Ctx) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();
    const { id } = await context.params;

    // 1) Vérifier que la quête appartient à la session + récupérer le status
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id,status")
        .eq("id", id)
        .eq("session_id", session.id)
        .maybeSingle();

    if (cqErr) return NextResponse.json({ error: cqErr.message }, { status: 500 });
    if (!cq) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 2) Règle A: autorisé uniquement en todo
    if (cq.status !== "todo") {
        return NextResponse.json(
            { error: `Cannot unassign quest unless status is "todo" (current: ${cq.status})` },
            { status: 409 }
        );
    }

    // 3) Delete
    const { error } = await supabase
        .from("chapter_quests")
        .delete()
        .eq("id", id)
        .eq("session_id", session.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
