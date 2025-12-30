import { NextResponse } from "next/server";
import { generateEncouragementForQuest } from "@/lib/encouragement/generateEncouragement";
import { generateEncouragementQuestMessage } from "@/lib/questMessages/generateEncouragementQuestMessage";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);

    const quest_title = typeof body?.quest_title === "string" ? body.quest_title : "";
    const room_code = typeof body?.room_code === "string" ? body.room_code : null;
    const difficulty = Number.isFinite(Number(body?.difficulty)) ? Number(body.difficulty) : null;
    const mission_md = typeof body?.mission_md === "string" ? body.mission_md : null;
    const chapter_quest_id =
        typeof body?.chapter_quest_id === "string" ? body.chapter_quest_id.trim() : "";

    if (!chapter_quest_id || !quest_title) {
        return NextResponse.json(
            { error: "Missing chapter_quest_id or quest_title" },
            { status: 400 }
        );
    }

    if (!quest_title) {
        return NextResponse.json({ error: "Missing quest_title" }, { status: 400 });
    }

    try {
        const data = await generateEncouragementQuestMessage({
            chapter_quest_id,
        });

        if (!chapter_quest_id || !quest_title) {
            return NextResponse.json(
                { error: "Missing chapter_quest_id or quest_title" },
                { status: 400 }
            );
        }

        return NextResponse.json(data, { status: 200 });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Unexpected error" },
            { status: 500 }
        );
    }
}
