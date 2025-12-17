import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = supabaseServer();

    const url = new URL(req.url);
    const chapterId = url.searchParams.get("chapterId");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);

    let query = supabase
        .from("journal_entries")
        .select("id,kind,title,content,chapter_id,quest_id,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (chapterId) {
        query = query.eq("chapter_id", chapterId);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: data ?? [] });
}
