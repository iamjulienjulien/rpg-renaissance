// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";
import { createClient } from "@supabase/supabase-js";

type UserRow = {
    id: string;
    email: string | null;
    created_at: string;
};

type UserAggRow = {
    user_id: string;
    email: string | null;
    created_at: string;

    sessions_count: number;
    adventures_count: number;
    quests_count: number;
};

function clampInt(v: any, def: number, min: number, max: number) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, Math.floor(n)));
}

function makeAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    return createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export async function GET(req: NextRequest) {
    // ✅ TODO: remplace par un vrai guard admin
    await getActiveSessionOrThrow();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const limit = clampInt(searchParams.get("limit"), 25, 1, 100);
    const offset = clampInt(searchParams.get("offset"), 0, 0, 1_000_000);

    const supabaseAdmin = makeAdminSupabase();

    // ---------------------------------------------------------------------
    // 1) LIST USERS (auth.users)
    // ---------------------------------------------------------------------
    // Supabase Admin API: listUsers
    // (pagination: page/perPage)
    const page = Math.floor(offset / limit) + 1;
    const perPage = limit;

    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
    });

    if (usersErr) {
        return NextResponse.json({ error: usersErr.message }, { status: 500 });
    }

    const users: UserRow[] = (usersData?.users ?? []).map((u: any) => ({
        id: String(u.id),
        email: u.email ?? null,
        created_at: String(u.created_at),
    }));

    // Filtre q côté serveur (email / id)
    const filteredUsers = q
        ? users.filter((u) => (u.email ?? "").toLowerCase().includes(q) || u.id.includes(q))
        : users;

    const userIds = filteredUsers.map((u) => u.id);

    // Total count users (approx: Supabase renvoie parfois total, sinon fallback)
    // listUsers renvoie souvent `total` dans data. Si pas dispo, on renvoie null.
    const total =
        typeof (usersData as any)?.total === "number"
            ? (usersData as any).total
            : typeof usersData?.users?.length === "number"
              ? null
              : null;

    if (userIds.length === 0) {
        return NextResponse.json({
            rows: [],
            count: total,
            limit,
            offset,
        });
    }

    // ---------------------------------------------------------------------
    // 2) sessions_count par user (game_sessions)
    // ---------------------------------------------------------------------
    // On utilise supabaseAdmin aussi pour éviter toute surprise de RLS.
    const { data: sessions, error: sessErr } = await supabaseAdmin
        .from("game_sessions")
        .select("id,user_id")
        .in("user_id", userIds);

    if (sessErr) {
        return NextResponse.json({ error: sessErr.message }, { status: 500 });
    }

    const sessionsCountByUser: Record<string, number> = {};
    const sessionIdsByUser: Record<string, string[]> = {};

    for (const s of sessions ?? []) {
        const uid = String((s as any).user_id);
        const sid = String((s as any).id);
        sessionsCountByUser[uid] = (sessionsCountByUser[uid] ?? 0) + 1;
        if (!sessionIdsByUser[uid]) sessionIdsByUser[uid] = [];
        sessionIdsByUser[uid].push(sid);
    }

    // ---------------------------------------------------------------------
    // 3) adventures_count par user
    // adventures.session_id -> game_sessions.id
    // ---------------------------------------------------------------------
    const allSessionIds = (sessions ?? []).map((s: any) => String(s.id));

    let adventuresCountByUser: Record<string, number> = {};
    let questsCountByUser: Record<string, number> = {};

    if (allSessionIds.length > 0) {
        const { data: adventures, error: advErr } = await supabaseAdmin
            .from("adventures")
            .select("id,session_id")
            .in("session_id", allSessionIds);

        if (advErr) {
            return NextResponse.json({ error: advErr.message }, { status: 500 });
        }

        // session_id -> user_id (via game_sessions)
        const sessionToUser: Record<string, string> = {};
        for (const s of sessions ?? []) {
            sessionToUser[String((s as any).id)] = String((s as any).user_id);
        }

        const advIdsByUser: Record<string, Set<string>> = {};
        const adventureIds = (adventures ?? []).map((a: any) => String(a.id));

        for (const a of adventures ?? []) {
            const sid = String((a as any).session_id);
            const uid = sessionToUser[sid];
            if (!uid) continue;

            if (!advIdsByUser[uid]) advIdsByUser[uid] = new Set();
            advIdsByUser[uid].add(String((a as any).id));
        }

        for (const uid of userIds) {
            adventuresCountByUser[uid] = advIdsByUser[uid]?.size ?? 0;
        }

        // -----------------------------------------------------------------
        // 4) quests_count par user
        // chapters.adventure_id -> adventures.id
        // chapter_quests.chapter_id -> chapters.id
        // -----------------------------------------------------------------
        if (adventureIds.length > 0) {
            const { data: chapters, error: chErr } = await supabaseAdmin
                .from("chapters")
                .select("id,adventure_id")
                .in("adventure_id", adventureIds);

            if (chErr) {
                return NextResponse.json({ error: chErr.message }, { status: 500 });
            }

            const chapterIds = (chapters ?? []).map((c: any) => String(c.id));
            const adventureToUser: Record<string, string> = {};

            // adventure_id -> user_id via session_id
            // On refait une map aventure -> session -> user
            const advToSession: Record<string, string> = {};
            for (const a of adventures ?? [])
                advToSession[String((a as any).id)] = String((a as any).session_id);

            for (const advId of Object.keys(advToSession)) {
                const sid = advToSession[advId];
                const uid = sessionToUser[sid];
                if (uid) adventureToUser[advId] = uid;
            }

            const chapterToUser: Record<string, string> = {};
            for (const c of chapters ?? []) {
                const advId = String((c as any).adventure_id);
                const uid = adventureToUser[advId];
                if (uid) chapterToUser[String((c as any).id)] = uid;
            }

            if (chapterIds.length > 0) {
                const { data: cqs, error: cqErr } = await supabaseAdmin
                    .from("chapter_quests")
                    .select("id,chapter_id")
                    .in("chapter_id", chapterIds);

                if (cqErr) {
                    return NextResponse.json({ error: cqErr.message }, { status: 500 });
                }

                for (const r of cqs ?? []) {
                    const cid = String((r as any).chapter_id);
                    const uid = chapterToUser[cid];
                    if (!uid) continue;
                    questsCountByUser[uid] = (questsCountByUser[uid] ?? 0) + 1;
                }
            }
        }
    }

    // ---------------------------------------------------------------------
    // 5) build rows
    // ---------------------------------------------------------------------
    const rows: UserAggRow[] = filteredUsers.map((u) => ({
        user_id: u.id,
        email: u.email,
        created_at: u.created_at,

        sessions_count: sessionsCountByUser[u.id] ?? 0,
        adventures_count: adventuresCountByUser[u.id] ?? 0,
        quests_count: questsCountByUser[u.id] ?? 0,
    }));

    return NextResponse.json({
        rows,
        count: total, // peut être null si Supabase ne renvoie pas total
        limit,
        offset,
    });
}
