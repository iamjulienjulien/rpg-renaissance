// src/app/api/briefing/route.ts
import { NextResponse } from "next/server";
import { generateBriefingForAdventure, type AdventureInfo } from "@/lib/briefing/generateBriefing";

export async function POST(req: Request) {
    // const body = await req.json().catch(() => null);
    // const adventure = body?.adventure as AdventureInfo | undefined;

    // if (!adventure?.code || !adventure?.title) {
    //     return NextResponse.json({ error: "Missing adventure payload" }, { status: 400 });
    // }

    // try {
    //     const result = await generateBriefingForAdventure(adventure);
    return NextResponse.json(true, { status: 200 });
    // } catch (e) {
    //     return NextResponse.json(
    //         { error: e instanceof Error ? e.message : "Unexpected error" },
    //         { status: 500 }
    //     );
    // }
}
