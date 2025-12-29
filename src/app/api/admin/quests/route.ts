// src/app/api/admin/quests/route.ts
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

function cleanUuid(v: string | null) {
    const s = (v ?? "").trim();
    if (!s || s === "undefined" || s === "null") return "";
    return s;
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
    const userId = cleanUuid(sp.get("userId"));
    const sessionId = cleanUuid(sp.get("sessionId"));
    const adventureId = cleanUuid(sp.get("adventureId"));
    const chapterId = cleanUuid(sp.get("chapterId"));
    const status = (sp.get("status") ?? "").trim(); // todo|doing|done

    const limit = toInt(sp.get("limit"), 25);
    const offset = toInt(sp.get("offset"), 0);

    // ---------------------------------------------------------------------
    // DATA QUERY
    // ---------------------------------------------------------------------
    // Base: chapter_quests -> adventure_quests + chapters -> adventures -> game_sessions
    // + on récupère quelques libellés utiles (chapter_code, titles)
    let dataQ = supabase
        .from("chapter_quests")
        .select(
            `
            id,
            chapter_id,
            adventure_quest_id,
            status,
            created_at,
            session_id,

            adventure_quests:adventure_quests!chapter_quests_adventure_quest_id_fkey (
                id,
                title,
                room_code,
                difficulty,
                estimate_min,
                priority,
                urgency,
                adventure_id
            ),

            chapters:chapters!chapter_quests_chapter_id_fkey (
                id,
                chapter_code,
                title,
                adventure_id
            )
        `
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    // Filters
    if (chapterId) dataQ = dataQ.eq("chapter_id", chapterId);
    if (sessionId) dataQ = dataQ.eq("session_id", sessionId);
    if (status && ["todo", "doing", "done"].includes(status)) dataQ = dataQ.eq("status", status);

    // Filter adventureId via chapters.adventure_id
    if (adventureId) dataQ = dataQ.eq("chapters.adventure_id", adventureId);

    // Filter userId via game_sessions.user_id (en passant par sessions)
    if (userId) {
        const { data: sessIds, error: sErr } = await supabase
            .from("game_sessions")
            .select("id")
            .eq("user_id", userId);

        if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

        const ids = (sessIds ?? []).map((s: any) => s.id);
        if (ids.length === 0) return NextResponse.json({ rows: [], count: 0 });

        dataQ = dataQ.in("session_id", ids);
    }

    // Search (simple): title ILIKE sur adventure_quests
    if (q) dataQ = dataQ.ilike("adventure_quests.title", `%${q}%`);

    const { data, error } = await dataQ;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rowsRaw = Array.isArray(data) ? data : [];

    // ---------------------------------------------------------------------
    // COUNT QUERY
    // ---------------------------------------------------------------------
    let countQ = supabase.from("chapter_quests").select("id", { count: "exact", head: true });

    if (chapterId) countQ = countQ.eq("chapter_id", chapterId);
    if (sessionId) countQ = countQ.eq("session_id", sessionId);
    if (status && ["todo", "doing", "done"].includes(status)) countQ = countQ.eq("status", status);
    if (adventureId) countQ = countQ.eq("chapters.adventure_id", adventureId); // requires FK select context in supabase; if it fails, we fallback below

    if (userId) {
        const { data: sessIds2, error: sErr2 } = await supabase
            .from("game_sessions")
            .select("id")
            .eq("user_id", userId);

        if (sErr2) return NextResponse.json({ error: sErr2.message }, { status: 500 });

        const ids2 = (sessIds2 ?? []).map((s: any) => s.id);
        if (ids2.length === 0) return NextResponse.json({ rows: [], count: 0 });

        countQ = countQ.in("session_id", ids2);
    }

    if (q) countQ = countQ.ilike("adventure_quests.title", `%${q}%`);

    // Si la clause chapters.* pose problème sur count, tu peux simplifier:
    // -> calculer count côté client (approx) ou faire une requête SQL RPC.
    const { count } = await countQ;

    // ---------------------------------------------------------------------
    // SESSION + USER (pour user_id, session_title)
    // ---------------------------------------------------------------------
    const sessionIds = Array.from(new Set(rowsRaw.map((r: any) => r.session_id).filter(Boolean)));

    const { data: sessions, error: gsErr } = await supabase
        .from("game_sessions")
        .select("id,user_id,title,created_at,updated_at")
        .in("id", sessionIds);

    if (gsErr) return NextResponse.json({ error: gsErr.message }, { status: 500 });

    const sessionById = new Map<string, any>();
    (sessions ?? []).forEach((s: any) => sessionById.set(s.id, s));

    // ---------------------------------------------------------------------
    // Adventures titles (optional label)
    // ---------------------------------------------------------------------
    const adventureIds = Array.from(
        new Set(
            rowsRaw
                .map((r: any) => r?.chapters?.adventure_id ?? r?.adventure_quests?.adventure_id)
                .filter(Boolean)
        )
    );

    const { data: advs } = await supabase
        .from("adventures")
        .select("id,title")
        .in("id", adventureIds);

    const advTitleById = new Map<string, string>();
    (advs ?? []).forEach((a: any) => advTitleById.set(a.id, a.title));

    // ---------------------------------------------------------------------
    // Build rows
    // ---------------------------------------------------------------------
    const rows = rowsRaw.map((r: any) => {
        const aq = r.adventure_quests ?? null;
        const ch = r.chapters ?? null;
        const sess = sessionById.get(r.session_id);

        const uid = sess?.user_id ?? "";
        const advId = ch?.adventure_id ?? aq?.adventure_id ?? "";

        return {
            chapter_quest_id: r.id,

            chapter_id: r.chapter_id,
            adventure_id: advId,
            session_id: r.session_id,
            user_id: uid,
            user_email: null, // rempli côté store via /users-emails

            adventure_quest_id: r.adventure_quest_id,
            title: aq?.title ?? "—",
            room_code: aq?.room_code ?? null,

            status: r.status,
            created_at: r.created_at,

            difficulty: aq?.difficulty ?? null,
            estimate_min: aq?.estimate_min ?? null,
            priority: aq?.priority ?? null,
            urgency: aq?.urgency ?? null,

            chapter_code: ch?.chapter_code ?? null,
            chapter_title: ch?.title ?? null,
            adventure_title: advTitleById.get(advId) ?? null,
            session_title: sess?.title ?? null,
        };
    });

    return NextResponse.json({
        rows,
        count: typeof count === "number" ? count : null,
    });
}
