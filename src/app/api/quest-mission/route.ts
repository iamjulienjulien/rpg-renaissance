import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";
import { generateMissionForChapterQuest } from "@/lib/mission/generateMission";

function safeString(x: unknown) {
    return typeof x === "string" ? x : "";
}

export async function GET(req: Request) {
    const supabase = supabaseServer();
    const url = new URL(req.url);
    const chapterQuestId = url.searchParams.get("chapterQuestId");

    if (!chapterQuestId) {
        return NextResponse.json({ error: "Missing chapterQuestId" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("quest_mission_orders")
        .select("chapter_quest_id, mission_json, mission_md, model, updated_at")
        .eq("chapter_quest_id", chapterQuestId)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ mission: data ?? null });
}

export async function POST(req: Request) {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const body = await req.json().catch(() => null);
    const chapterQuestId = typeof body?.chapterQuestId === "string" ? body.chapterQuestId : "";

    if (!chapterQuestId) {
        return NextResponse.json({ error: "Missing chapterQuestId" }, { status: 400 });
    }

    try {
        const result = await generateMissionForChapterQuest(chapterQuestId, force);
        return NextResponse.json({ mission: result.mission, cached: result.cached });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Generation failed" }, { status: 500 });
    }
}
