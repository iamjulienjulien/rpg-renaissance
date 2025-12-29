import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

async function assertAdminOrThrow(supabase: any, userId: string) {
    const { data, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Forbidden");
}

function toInt(v: string | null, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function GET(req: NextRequest) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    // 0) récupérer l'utilisateur via la session de jeu active
    const { data: gs, error: gs0Err } = await supabase
        .from("game_sessions")
        .select("id,user_id")
        .eq("id", session.id)
        .maybeSingle();

    if (gs0Err) return NextResponse.json({ error: gs0Err.message }, { status: 500 });
    if (!gs?.user_id)
        return NextResponse.json({ error: "No user on active session" }, { status: 403 });

    // ✅ Vérif admin (admin_users.user_id)
    try {
        await assertAdminOrThrow(supabase, gs.user_id);
    } catch (e: any) {
        const msg = e?.message === "Forbidden" ? "Forbidden" : e?.message || "Forbidden";
        return NextResponse.json({ error: msg }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;

    const q = (sp.get("q") ?? "").trim();
    const userId = (sp.get("userId") ?? "").trim();
    const sessionId = (sp.get("sessionId") ?? "").trim();
    const adventureId = (sp.get("adventureId") ?? "").trim();

    const limit = toInt(sp.get("limit"), 25);
    const offset = toInt(sp.get("offset"), 0);

    // 0) userId -> sessionIds (game_sessions.user_id)
    let allowedSessionIds: string[] | null = null;

    if (userId && userId !== "undefined") {
        const { data: sess, error: sErr } = await supabase
            .from("game_sessions")
            .select("id")
            .eq("user_id", userId);

        if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

        allowedSessionIds = (sess ?? []).map((x: any) => x.id);

        if (allowedSessionIds.length === 0) {
            return NextResponse.json({ rows: [], count: 0 });
        }
    }

    // 1) fetch chapters
    let chQ = supabase
        .from("chapters")
        .select("id,title,chapter_code,kind,pace,status,created_at,adventure_id,session_id", {
            count: "exact",
        })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (adventureId && adventureId !== "undefined") chQ = chQ.eq("adventure_id", adventureId);
    if (sessionId && sessionId !== "undefined") chQ = chQ.eq("session_id", sessionId);

    if (allowedSessionIds) {
        chQ = chQ.in("session_id", allowedSessionIds);
    }

    if (q) {
        // title ILIKE OR chapter_code ILIKE (simple)
        chQ = chQ.or(`title.ilike.%${q}%,chapter_code.ilike.%${q}%`);
    }

    const { data: chapters, error: chErr, count } = await chQ;
    if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });

    const chapterIds = (chapters ?? []).map((c: any) => c.id);
    const sessionIds = Array.from(
        new Set((chapters ?? []).map((c: any) => c.session_id).filter(Boolean))
    );

    // 2) sessions -> user_id
    const { data: sessions, error: gsErr } = await supabase
        .from("game_sessions")
        .select("id,user_id")
        .in("id", sessionIds);

    if (gsErr) return NextResponse.json({ error: gsErr.message }, { status: 500 });

    const userIdBySessionId = new Map<string, string>();
    (sessions ?? []).forEach((s: any) => {
        if (s?.id && s?.user_id) userIdBySessionId.set(s.id, s.user_id);
    });

    // 3) quests counts by chapter
    let cqs: any[] = [];
    if (chapterIds.length > 0) {
        const { data, error } = await supabase
            .from("chapter_quests")
            .select("chapter_id,status")
            .in("chapter_id", chapterIds);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        cqs = data ?? [];
    }

    const totalByChapter = new Map<string, number>();
    const doneByChapter = new Map<string, number>();

    cqs.forEach((cq: any) => {
        const cid = cq.chapter_id;
        totalByChapter.set(cid, (totalByChapter.get(cid) ?? 0) + 1);
        if (cq.status === "done") {
            doneByChapter.set(cid, (doneByChapter.get(cid) ?? 0) + 1);
        }
    });

    // 4) build rows
    const rows = (chapters ?? []).map((c: any) => {
        const total = totalByChapter.get(c.id) ?? 0;
        const done = doneByChapter.get(c.id) ?? 0;
        const rate = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;

        const uid = c.session_id ? (userIdBySessionId.get(c.session_id) ?? null) : null;

        return {
            chapter_id: c.id,

            adventure_id: c.adventure_id ?? null,
            session_id: c.session_id ?? null,

            user_id: uid,
            user_email: null, // hydraté côté store

            title: c.title,
            chapter_code: c.chapter_code,
            kind: c.kind,
            pace: c.pace,
            status: c.status,

            created_at: c.created_at,

            quests_count: total,
            quests_done_count: done,
            completion_rate: rate,
        };
    });

    return NextResponse.json({
        rows,
        count: typeof count === "number" ? count : null,
    });
}
