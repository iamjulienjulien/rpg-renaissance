import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const baseSelect = `
    id,
    chapter_id,
    adventure_quest_id,
    status,
    created_at,
    adventure_quests!chapter_quests_adventure_quest_id_fkey (
        id,
        adventure_id,
        room_code,
        title,
        description,
        difficulty,
        estimate_min,
        created_at
    )
`;

export async function GET(_req: NextRequest, context: Ctx) {
    const supabase = supabaseServer();
    const { id } = await context.params;

    const { data, error } = await supabase
        .from("chapter_quests")
        .select(baseSelect)
        .eq("id", id)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // ✅ format attendu par QuestClient
    const quest = Array.isArray((data as any).adventure_quests)
        ? ((data as any).adventure_quests[0] ?? null)
        : ((data as any).adventure_quests ?? null);

    const chapterQuest = {
        id: data.id,
        chapter_id: data.chapter_id,
        adventure_quest_id: data.adventure_quest_id,
        status: data.status,
        created_at: data.created_at,
    };

    return NextResponse.json({ chapterQuest, quest });
}

export async function PATCH(req: NextRequest, context: Ctx) {
    const supabase = supabaseServer();
    const { id } = await context.params;

    const body = await req.json().catch(() => null);
    const status = typeof body?.status === "string" ? body.status : "";

    if (!status) {
        return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }

    if (!["todo", "doing", "done"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("chapter_quests")
        .update({ status })
        .eq("id", id)
        .select(baseSelect)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const chapterQuest = {
        id: data.id,
        chapter_id: data.chapter_id,
        adventure_quest_id: data.adventure_quest_id,
        status: data.status,
        created_at: data.created_at,
    };

    return NextResponse.json({ chapterQuest });
}

export async function DELETE(_req: NextRequest, context: Ctx) {
    const supabase = supabaseServer();
    const { id } = await context.params;

    const { error } = await supabase.from("chapter_quests").delete().eq("id", id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
