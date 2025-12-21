import { NextResponse } from "next/server";
import { generateEncouragementForQuest } from "@/lib/encouragement/generateEncouragement";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);

    const quest_title = typeof body?.quest_title === "string" ? body.quest_title : "";
    const room_code = typeof body?.room_code === "string" ? body.room_code : null;
    const difficulty = Number.isFinite(Number(body?.difficulty)) ? Number(body.difficulty) : null;
    const mission_md = typeof body?.mission_md === "string" ? body.mission_md : null;

    if (!quest_title) {
        return NextResponse.json({ error: "Missing quest_title" }, { status: 400 });
    }

    try {
        const data = await generateEncouragementForQuest({
            quest_title,
            room_code,
            difficulty,
            mission_md,
        });

        return NextResponse.json(data, { status: 200 });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Unexpected error" },
            { status: 500 }
        );
    }
}
