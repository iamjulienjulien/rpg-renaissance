import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";
import { generateMissionForChapterQuest } from "@/lib/mission/generateMission";

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);
    const chapterQuestId = url.searchParams.get("chapterQuestId") ?? "";

    if (!chapterQuestId) {
        return NextResponse.json({ error: "Missing chapterQuestId" }, { status: 400 });
    }

    // ✅ session active
    const session = await getActiveSessionOrThrow();

    // ✅ mission cache scoped à la session
    const { data, error } = await supabase
        .from("quest_mission_orders")
        .select("chapter_quest_id, mission_json, mission_md, model, updated_at, session_id")
        .eq("chapter_quest_id", chapterQuestId)
        .eq("session_id", session.id)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ mission: data ?? null });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const body = await req.json().catch(() => null);
    const chapterQuestId = typeof body?.chapterQuestId === "string" ? body.chapterQuestId : "";

    if (!chapterQuestId) {
        return NextResponse.json({ error: "Missing chapterQuestId" }, { status: 400 });
    }

    // ✅ session active
    const session = await getActiveSessionOrThrow();

    // ✅ Vérifier que ce chapter_quest appartient à la session active
    // (évite accès cross-session par simple UUID)
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id, session_id")
        .eq("id", chapterQuestId)
        .maybeSingle();

    if (cqErr) return NextResponse.json({ error: cqErr.message }, { status: 500 });
    if (!cq) return NextResponse.json({ error: "Chapter quest not found" }, { status: 404 });

    if (cq.session_id !== session.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // ⚠️ Tant que generateMissionForChapterQuest n’est pas migrée,
        // elle ne “connait” pas la session. Mais on a sécurisé avant.
        const result = await generateMissionForChapterQuest(chapterQuestId, force);

        return NextResponse.json({ mission: result.mission, cached: result.cached });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Generation failed" }, { status: 500 });
    }
}
