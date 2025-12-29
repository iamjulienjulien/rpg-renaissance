import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createJournalEntry, type JournalKind } from "@/lib/journal/createJournalEntry";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

/* ============================
   GET /api/journal
   ============================ */
export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);

    const chapterId = url.searchParams.get("chapterId");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);

    let session;
    try {
        session = await getActiveSessionOrThrow();
    } catch (e) {
        const msg = e instanceof Error ? e.message : "No active session";
        return NextResponse.json({ error: msg }, { status: 401 });
    }

    let query = supabase
        .from("journal_entries")
        .select(
            "id,kind,title,content,chapter_id,quest_id,adventure_quest_id,session_id,created_at,meta"
        )
        .eq("session_id", session.id) // ✅ clé multi-partie
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

/* ============================
   POST /api/journal
   ============================ */
export async function POST(req: Request) {
    const body = await req.json().catch(() => null);

    const kind = (typeof body?.kind === "string" ? body.kind : "note") as JournalKind;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content : null;

    const chapter_id = typeof body?.chapter_id === "string" ? body.chapter_id : null;
    const quest_id = typeof body?.quest_id === "string" ? body.quest_id : null;
    const adventure_quest_id =
        typeof body?.adventure_quest_id === "string" ? body.adventure_quest_id : null;

    let session;
    try {
        session = await getActiveSessionOrThrow();
    } catch (e) {
        const msg = e instanceof Error ? e.message : "No active session";
        return NextResponse.json({ error: msg }, { status: 401 });
    }

    if (!title) {
        return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    try {
        await createJournalEntry({
            session_id: session.id, // ✅ toujours côté serveur
            kind,
            title,
            content,
            chapter_id,
            quest_id,
            adventure_quest_id,
        });

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
