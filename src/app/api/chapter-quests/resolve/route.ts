import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

export async function GET(req: NextRequest) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const sp = req.nextUrl.searchParams;
    const chapterId = sp.get("chapterId");
    const adventureQuestId = sp.get("adventureQuestId");

    if (!chapterId || !adventureQuestId) {
        return NextResponse.json(
            { error: "Missing chapterId or adventureQuestId" },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from("chapter_quests")
        .select("id, chapter_id, adventure_quest_id, status")
        .eq("session_id", session.id)
        .eq("chapter_id", chapterId)
        .eq("adventure_quest_id", adventureQuestId)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ chapterQuestId: null }, { status: 200 });

    return NextResponse.json({ chapterQuestId: data.id });
}
