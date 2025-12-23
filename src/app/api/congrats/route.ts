// src/app/api/congrats/route.ts
import { NextResponse } from "next/server";
import { generateCongratsForQuest } from "@/lib/congrats/generateCongrats";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);

        const chapter_quest_id =
            typeof body?.chapter_quest_id === "string" ? body.chapter_quest_id.trim() : "";

        // ✅ La ligne que tu voulais (et qu’il te manquait ailleurs)
        const quest_title = typeof body?.quest_title === "string" ? body.quest_title.trim() : "";

        const room_code = typeof body?.room_code === "string" ? body.room_code.trim() : null;

        const difficulty = typeof body?.difficulty === "number" ? body.difficulty : null;

        const mission_md = typeof body?.mission_md === "string" ? body.mission_md : null;

        if (!chapter_quest_id) {
            return NextResponse.json({ error: "Missing chapter_quest_id" }, { status: 400 });
        }

        if (!quest_title) {
            return NextResponse.json({ error: "Missing quest_title" }, { status: 400 });
        }

        const { congrats, meta } = await generateCongratsForQuest({
            chapter_quest_id,
            quest_title,
            room_code,
            difficulty,
            mission_md,
        });

        return NextResponse.json({ congrats, meta });
    } catch (e) {
        console.error("POST /api/congrats error:", e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 }
        );
    }
}
