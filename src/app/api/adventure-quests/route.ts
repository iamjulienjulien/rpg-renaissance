import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = supabaseServer();
    const url = new URL(req.url);
    const adventureId = url.searchParams.get("adventureId");

    if (!adventureId) {
        return NextResponse.json({ error: "Missing adventureId" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("adventure_quests")
        .select("id,adventure_id,room_code,title,description,difficulty,estimate_min,created_at")
        .eq("adventure_id", adventureId)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ quests: data ?? [] });
}

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const body = await req.json().catch(() => null);

    const adventure_id = typeof body?.adventure_id === "string" ? body.adventure_id : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";

    if (!adventure_id || !title) {
        return NextResponse.json({ error: "Missing adventure_id or title" }, { status: 400 });
    }

    const payload = {
        adventure_id,
        room_code: typeof body?.room_code === "string" ? body.room_code : null,
        title,
        description: typeof body?.description === "string" ? body.description : null,
        difficulty: typeof body?.difficulty === "number" ? body.difficulty : 2,
        estimate_min: typeof body?.estimate_min === "number" ? body.estimate_min : null,
    };

    const { data, error } = await supabase
        .from("adventure_quests")
        .insert(payload)
        .select("id,adventure_id,room_code,title,description,difficulty,estimate_min,created_at")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ quest: data }, { status: 201 });
}
