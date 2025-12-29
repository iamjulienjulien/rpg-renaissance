import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

// ✅ table de sécurité: admin_users (tu es parti là-dessus)
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

    const limit = toInt(sp.get("limit"), 25);
    const offset = toInt(sp.get("offset"), 0);

    // 1) on récupère les adventures (filtrées)
    let advQ = supabase
        .from("adventures")
        .select("id,title,created_at,session_id")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (sessionId) advQ = advQ.eq("session_id", sessionId);

    // filtre userId via sessions (game_sessions.user_id)
    if (userId) {
        const { data: sessIds, error: sErr } = await supabase
            .from("game_sessions")
            .select("id")
            .eq("user_id", userId);

        if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

        const ids = (sessIds ?? []).map((s: any) => s.id);
        if (ids.length === 0) {
            return NextResponse.json({ rows: [], count: 0 });
        }
        advQ = advQ.in("session_id", ids);
    }

    // recherche textuelle simple
    if (q) {
        // title ILIKE
        advQ = advQ.ilike("title", `%${q}%`);
    }

    const { data: adventures, error: advErr } = await advQ;
    if (advErr) return NextResponse.json({ error: advErr.message }, { status: 500 });

    const advIds = (adventures ?? []).map((a: any) => a.id);
    const sessIds = Array.from(new Set((adventures ?? []).map((a: any) => a.session_id)));

    // Count total (approx: on refait une requête count)
    // (pour rester simple sans SQL custom)
    let countQ = supabase.from("adventures").select("id", { count: "exact", head: true });

    if (sessionId) countQ = countQ.eq("session_id", sessionId);

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

    if (q) countQ = countQ.ilike("title", `%${q}%`);

    const { count } = await countQ;

    // 2) map sessions -> user
    const { data: sessions, error: gsErr } = await supabase
        .from("game_sessions")
        .select("id,user_id,created_at,updated_at")
        .in("id", sessIds);

    if (gsErr) return NextResponse.json({ error: gsErr.message }, { status: 500 });

    const sessionById = new Map<string, any>();
    (sessions ?? []).forEach((s: any) => sessionById.set(s.id, s));

    // 3) emails (route que tu as faite /api/admin/users-emails)
    // Ici on appelle directement la table admin_users + auth (selon ton implémentation)
    // -> on prend un cache: user_id -> email via table user_profiles si besoin
    const userIds = Array.from(
        new Set((sessions ?? []).map((s: any) => s.user_id).filter(Boolean))
    );

    // ✅ on essaye user_profiles (si tu y stockes email: sinon null)
    // Si ton /api/admin/users-emails renvoie un mapping, remplace cette partie par un fetch.
    const { data: authProfiles } = await supabase
        .from("user_profiles")
        .select("user_id")
        .in("user_id", userIds);

    const emailByUserId = new Map<string, string | null>();
    (authProfiles ?? []).forEach((p: any) => emailByUserId.set(p.user_id, null));

    // 4) chapters count
    const { data: chapters, error: chErr } = await supabase
        .from("chapters")
        .select("id,adventure_id")
        .in("adventure_id", advIds);

    if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });

    const chaptersCountByAdv = new Map<string, number>();
    (chapters ?? []).forEach((c: any) => {
        chaptersCountByAdv.set(c.adventure_id, (chaptersCountByAdv.get(c.adventure_id) ?? 0) + 1);
    });

    // 5) quests counts via chapter_quests join chapters(adventure_id)
    // on récupère les chapters ids
    const chapterIds = (chapters ?? []).map((c: any) => c.id);
    let quests: any[] = [];
    if (chapterIds.length > 0) {
        const { data: cqs, error: cqErr } = await supabase
            .from("chapter_quests")
            .select("id,status,chapter_id")
            .in("chapter_id", chapterIds);

        if (cqErr) return NextResponse.json({ error: cqErr.message }, { status: 500 });
        quests = cqs ?? [];
    }

    const advByChapterId = new Map<string, string>();
    (chapters ?? []).forEach((c: any) => advByChapterId.set(c.id, c.adventure_id));

    const questsCountByAdv = new Map<string, number>();
    const questsDoneByAdv = new Map<string, number>();

    quests.forEach((cq: any) => {
        const advId = advByChapterId.get(cq.chapter_id);
        if (!advId) return;

        questsCountByAdv.set(advId, (questsCountByAdv.get(advId) ?? 0) + 1);
        if (cq.status === "done") {
            questsDoneByAdv.set(advId, (questsDoneByAdv.get(advId) ?? 0) + 1);
        }
    });

    // 6) build rows
    const rows = (adventures ?? []).map((a: any) => {
        const sess = sessionById.get(a.session_id);
        const uid = sess?.user_id ?? "";
        const total = questsCountByAdv.get(a.id) ?? 0;
        const done = questsDoneByAdv.get(a.id) ?? 0;
        const rate = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;

        return {
            adventure_id: a.id,
            session_id: a.session_id,
            user_id: uid,
            user_email: emailByUserId.get(uid) ?? null,

            title: a.title,
            created_at: a.created_at,

            chapters_count: chaptersCountByAdv.get(a.id) ?? 0,
            quests_count: total,
            quests_done_count: done,
            completion_rate: rate,
        };
    });

    return NextResponse.json({ rows, count: typeof count === "number" ? count : null });
}
