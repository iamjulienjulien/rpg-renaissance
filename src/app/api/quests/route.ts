import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = supabaseServer();

    const url = new URL(req.url);
    const chapterId = url.searchParams.get("chapterId");

    let query = supabase
        .from("quests")
        .select("id,title,description,status,priority,chapter_id,created_at,updated_at")
        .order("created_at", { ascending: false });

    if (chapterId) {
        query = query.eq("chapter_id", chapterId);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quests: data ?? [] });
}

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const body = await req.json().catch(() => null);

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) {
        return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const payload = {
        title,
        description: typeof body?.description === "string" ? body.description : null,
        status: body?.status ?? "todo",
        priority: typeof body?.priority === "number" ? body.priority : 2,
    };

    const { data, error } = await supabase
        .from("quests")
        .insert(payload)
        .select("id,title,description,status,priority,created_at,updated_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quest: data }, { status: 201 });
}
