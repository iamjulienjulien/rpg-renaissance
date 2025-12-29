import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: Ctx) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    // ✅ même pattern que ton autre route
    const { id } = await context.params;
    const chainId = typeof id === "string" ? id.trim() : "";

    if (!chainId) {
        return NextResponse.json({ error: "Missing chain id" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("quest_chain_items")
        .select(
            `
            id,
            chain_id,
            position,
            adventure_quests (
                id,
                title,
                room_code,
                difficulty,
                urgency,
                priority
            )
        `
        )
        .eq("session_id", session.id)
        .eq("chain_id", chainId)
        .order("position", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        items: (data ?? []).map((i: any) => ({
            id: i.id,
            chain_id: i.chain_id,
            position: i.position,
            adventure_quest: Array.isArray(i.adventure_quests)
                ? i.adventure_quests[0]
                : i.adventure_quests,
        })),
    });
}

export async function POST(req: NextRequest, context: Ctx) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    // ✅ même pattern que ton autre route
    const { id } = await context.params;
    const chainId = typeof id === "string" ? id.trim() : "";

    if (!chainId) {
        return NextResponse.json({ error: "Missing chain id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);

    const adventureQuestId =
        typeof body?.adventure_quest_id === "string" ? body.adventure_quest_id.trim() : "";

    if (!adventureQuestId) {
        return NextResponse.json({ error: "Missing adventure_quest_id" }, { status: 400 });
    }

    // 🔢 next position (filtré session + chain)
    const { data: maxPos, error: maxErr } = await supabase
        .from("quest_chain_items")
        .select("position")
        .eq("session_id", session.id)
        .eq("chain_id", chainId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (maxErr) return NextResponse.json({ error: maxErr.message }, { status: 500 });

    const position = (maxPos?.position ?? 0) + 1;

    const { data, error } = await supabase
        .from("quest_chain_items")
        .insert({
            session_id: session.id,
            chain_id: chainId,
            adventure_quest_id: adventureQuestId,
            position,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ item: data }, { status: 201 });
}
