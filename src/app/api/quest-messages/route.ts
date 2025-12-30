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

const ALLOWED_ROLE = new Set(["mj", "system"]); // MVP: pas de "user" tant que RLS le bloque
const ALLOWED_KIND = new Set(["message", "photo_recognition", "system_event"]);

/* ============================================================================
GET /api/quest-messages?threadId=uuid&limit=80
============================================================================ */
export async function GET(req: NextRequest) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const sp = req.nextUrl.searchParams;
    const threadId = (sp.get("threadId") ?? "").trim();
    if (!threadId) return jsonError("Missing threadId", 400);

    const limit = Math.max(10, Math.min(200, toInt(sp.get("limit"), 120)));

    const { data: rows, error } = await supabase
        .from("quest_messages")
        .select(
            "id, thread_id, chapter_quest_id, role, kind, title, content, meta, photo_id, created_at"
        )
        .eq("thread_id", threadId)
        .eq("session_id", session.id)
        .order("created_at", { ascending: true })
        .limit(limit);

    if (error) return jsonError(error.message, 500);

    return NextResponse.json({ rows: rows ?? [] });
}

/* ============================================================================
POST /api/quest-messages
body:
{
  thread_id, chapter_quest_id,
  role: 'mj'|'system',
  kind: 'message'|'photo_recognition'|'system_event',
  content, title?, meta?, photo_id?
}
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

    const thread_id = String(body?.thread_id ?? "").trim();
    const chapter_quest_id = String(body?.chapter_quest_id ?? "").trim();
    const role = String(body?.role ?? "").trim();
    const kind = String(body?.kind ?? "message").trim();
    const content = String(body?.content ?? "").trim();

    const title = typeof body?.title === "string" ? body.title.trim() : null;
    const meta = body?.meta ?? null;
    const photo_id = typeof body?.photo_id === "string" ? body.photo_id.trim() : null;

    if (!thread_id) return jsonError("Missing thread_id", 400);
    if (!chapter_quest_id) return jsonError("Missing chapter_quest_id", 400);
    if (!role) return jsonError("Missing role", 400);
    if (!ALLOWED_ROLE.has(role)) return jsonError("Invalid role", 400);
    if (!ALLOWED_KIND.has(kind)) return jsonError("Invalid kind", 400);
    if (!content) return jsonError("Missing content", 400);

    // Check CQ belongs to session active
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id, session_id")
        .eq("id", chapter_quest_id)
        .eq("session_id", session.id)
        .maybeSingle();

    if (cqErr) return jsonError(cqErr.message, 500);
    if (!cq) return jsonError("Not found", 404);

    // Check thread matches CQ + session (avoid mixing)
    const { data: th, error: thErr } = await supabase
        .from("quest_threads")
        .select("id, session_id, chapter_quest_id")
        .eq("id", thread_id)
        .eq("session_id", session.id)
        .maybeSingle();

    if (thErr) return jsonError(thErr.message, 500);
    if (!th) return jsonError("Thread not found", 404);
    if (th.chapter_quest_id !== chapter_quest_id) return jsonError("Thread/CQ mismatch", 400);

    const { data, error } = await supabase
        .from("quest_messages")
        .insert({
            session_id: session.id,
            thread_id,
            chapter_quest_id,
            role,
            kind,
            content,
            title,
            meta,
            photo_id,
        })
        .select(
            "id, thread_id, chapter_quest_id, role, kind, title, content, meta, photo_id, created_at"
        )
        .maybeSingle();

    if (error) return jsonError(error.message, 500);

    return NextResponse.json({ message: data });
}
