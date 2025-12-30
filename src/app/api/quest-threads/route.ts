import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function toInt(v: string | null, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

/* ============================================================================
GET /api/quest-threads?chapterQuestId=uuid&withMessages=1&limit=50
============================================================================ */
export async function GET(req: NextRequest) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const sp = req.nextUrl.searchParams;
    const chapterQuestId = (sp.get("chapterQuestId") ?? "").trim();
    if (!chapterQuestId) return jsonError("Missing chapterQuestId", 400);

    // Vérifie que la CQ appartient bien à la session active
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id, session_id")
        .eq("id", chapterQuestId)
        .eq("session_id", session.id)
        .maybeSingle();

    if (cqErr) return jsonError(cqErr.message, 500);
    if (!cq) return jsonError("Not found", 404);

    const { data: thread, error: tErr } = await supabase
        .from("quest_threads")
        .select("id, session_id, chapter_quest_id, created_at, updated_at")
        .eq("chapter_quest_id", chapterQuestId)
        .eq("session_id", session.id)
        .maybeSingle();

    if (tErr) return jsonError(tErr.message, 500);

    const withMessages = ["1", "true", "yes", "on"].includes(
        String(sp.get("withMessages") ?? "").toLowerCase()
    );

    if (!withMessages || !thread) {
        return NextResponse.json({ thread: thread ?? null, messages: [] });
    }

    const limit = Math.max(1, Math.min(200, toInt(sp.get("limit"), 80)));

    const { data: messages, error: mErr } = await supabase
        .from("quest_messages")
        .select(
            "id, thread_id, chapter_quest_id, role, kind, title, content, meta, photo_id, created_at"
        )
        .eq("thread_id", thread.id)
        .eq("session_id", session.id)
        .order("created_at", { ascending: true })
        .limit(limit);

    if (mErr) return jsonError(mErr.message, 500);

    return NextResponse.json({
        thread,
        messages: messages ?? [],
    });
}

/* ============================================================================
POST /api/quest-threads
body: { chapter_quest_id: uuid }
- Crée le thread si absent, sinon renvoie l’existant
============================================================================ */
export async function POST(req: NextRequest) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    let body: any = null;
    try {
        body = await req.json();
    } catch {
        return jsonError("Invalid JSON", 400);
    }

    const chapterQuestId = String(body?.chapter_quest_id ?? "").trim();
    if (!chapterQuestId) return jsonError("Missing chapter_quest_id", 400);

    // Vérifie appartenance à la session active
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id, session_id")
        .eq("id", chapterQuestId)
        .eq("session_id", session.id)
        .maybeSingle();

    if (cqErr) return jsonError(cqErr.message, 500);
    if (!cq) return jsonError("Not found", 404);

    // get existing
    const { data: existing, error: exErr } = await supabase
        .from("quest_threads")
        .select("id, session_id, chapter_quest_id, created_at, updated_at")
        .eq("chapter_quest_id", chapterQuestId)
        .eq("session_id", session.id)
        .maybeSingle();

    if (exErr) return jsonError(exErr.message, 500);
    if (existing) return NextResponse.json({ thread: existing });

    // create
    const { data: created, error: insErr } = await supabase
        .from("quest_threads")
        .insert({
            session_id: session.id,
            chapter_quest_id: chapterQuestId,
        })
        .select("id, session_id, chapter_quest_id, created_at, updated_at")
        .maybeSingle();

    if (insErr) {
        // possible course condition: unique(chapter_quest_id)
        // retry fetch
        const { data: retry } = await supabase
            .from("quest_threads")
            .select("id, session_id, chapter_quest_id, created_at, updated_at")
            .eq("chapter_quest_id", chapterQuestId)
            .eq("session_id", session.id)
            .maybeSingle();

        if (retry) return NextResponse.json({ thread: retry });
        return jsonError(insErr.message, 500);
    }

    return NextResponse.json({ thread: created });
}
