import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";
import { generateStoryForChapter } from "@/lib/story/generateChapterStory";

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);
    const chapterId = url.searchParams.get("chapterId") ?? "";

    if (!chapterId) {
        return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });
    }

    const session = await getActiveSessionOrThrow();

    const { data, error } = await supabase
        .from("chapter_stories")
        .select("chapter_id, session_id, story_json, story_md, model, updated_at, created_at")
        .eq("chapter_id", chapterId)
        .eq("session_id", session.id)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ story: data ?? null });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const body = await req.json().catch(() => null);
    const chapterId = typeof body?.chapterId === "string" ? body.chapterId : "";

    if (!chapterId) {
        return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });
    }

    const session = await getActiveSessionOrThrow();

    // ✅ Vérifier que le chapitre appartient à la session active
    const { data: ch, error: chErr } = await supabase
        .from("chapters")
        .select("id, session_id")
        .eq("id", chapterId)
        .maybeSingle();

    if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });
    if (!ch) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    if (ch.session_id !== session.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const result = await generateStoryForChapter(chapterId, force);
        return NextResponse.json({ story: result.story, cached: result.cached });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Generation failed" }, { status: 500 });
    }
}
