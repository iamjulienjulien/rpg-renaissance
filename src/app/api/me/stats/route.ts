// src/app/api/me/stats/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function toDateKey(d: Date) {
    // YYYY-MM-DD (UTC)
    return d.toISOString().slice(0, 10);
}

function startOfDayUTC(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetweenUTC(a: Date, b: Date) {
    const A = startOfDayUTC(a).getTime();
    const B = startOfDayUTC(b).getTime();
    return Math.round((B - A) / (1000 * 60 * 60 * 24));
}

function safeInt(x: any, fallback = 0) {
    const n = Number(x);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/* ============================================================================
GET /api/me/stats
============================================================================ */

export async function GET() {
    const supabase = await supabaseServer();

    /* ------------------------------------------------------------
     Auth
    ------------------------------------------------------------ */
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) return jsonError("Not authenticated", 401);
    const user_id = auth.user.id;

    /* ------------------------------------------------------------
     Active session
    ------------------------------------------------------------ */
    let session: { id: string; created_at?: string | null } | null = null;

    try {
        const s = await getActiveSessionOrThrow();
        session = { id: s.id, created_at: (s as any)?.created_at ?? null };
    } catch {
        // Fallback: last session of user
        const { data: maybe } = await supabase
            .from("game_sessions")
            .select("id, created_at")
            .eq("user_id", user_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        session = maybe?.id ? (maybe as any) : null;
    }

    if (!session?.id) return jsonError("No session found", 404);
    const session_id = session.id;

    /* ------------------------------------------------------------
     Time windows
    ------------------------------------------------------------ */
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    /* ------------------------------------------------------------
     Fetch
    ------------------------------------------------------------ */
    const [
        renownRes,
        renownLevelRes,
        chaptersRes,
        chapterQuestsRes,
        adventureQuestsRes,
        journalRes30,
        journalResRecent,
        aiGenRes30,
        aiJobsRes30,
        achRes,
        badgesRes,
        toastsUnreadRes,
        photosRes30,
        photosAllRes,
    ] = await Promise.all([
        // Renown
        supabase
            .from("player_renown")
            .select("value, level, updated_at")
            .eq("user_id", user_id)
            .eq("session_id", session_id)
            .maybeSingle(),

        // Renown catalog (tu peux limiter au level exact si tu veux optimiser)
        supabase
            .from("renown_levels_catalog")
            .select("level, tier, tier_title, full_title, is_milestone"),

        // Chapters
        supabase
            .from("chapters")
            .select("id, title, status, created_at, adventure_id, chapter_code")
            .eq("session_id", session_id)
            .order("created_at", { ascending: false }),

        // Chapter quests
        supabase
            .from("chapter_quests")
            .select("id, chapter_id, status, created_at, adventure_quest_id")
            .eq("session_id", session_id),

        // Adventure quests (difficulty, room_code)
        supabase
            .from("adventure_quests")
            .select("id, room_code, difficulty, estimate_min, urgency, priority, created_at")
            .eq("session_id", session_id),

        // Journal last 30d (activity/heatmap)
        supabase
            .from("journal_entries")
            .select("id, kind, title, created_at, chapter_id, quest_id, adventure_quest_id")
            .eq("session_id", session_id)
            .gte("created_at", since30.toISOString())
            .order("created_at", { ascending: false }),

        // Journal recent (streak best-effort)
        supabase
            .from("journal_entries")
            .select("id, created_at")
            .eq("session_id", session_id)
            .order("created_at", { ascending: false })
            .limit(1500),

        // AI generations last 30d
        supabase
            .from("ai_generations")
            .select("id, generation_type, status, model, duration_ms, created_at")
            .eq("session_id", session_id)
            .eq("user_id", user_id)
            .gte("created_at", since30.toISOString()),

        // AI jobs last 30d
        supabase
            .from("ai_jobs")
            .select("id, job_type, status, attempts, max_attempts, created_at, finished_at")
            .eq("user_id", user_id)
            .gte("created_at", since30.toISOString()),

        // Achievement unlocks (⚠️ FIX: pas de colonne "scope" sur achievement_unlocks)
        supabase
            .from("achievement_unlocks")
            .select(
                `
                id,
                unlocked_at,
                scope_key,
                achievement:achievement_id (
                    code,
                    name,
                    description,
                    icon,
                    scope,
                    is_repeatable
                )
                `
            )
            .eq("user_id", user_id)
            .order("unlocked_at", { ascending: false })
            .limit(90),

        // Badges
        supabase
            .from("player_badges")
            .select(
                `
                id,
                unlocked_at,
                source,
                badge:badge_id ( code, title, emoji, description )
                `
            )
            .eq("user_id", user_id)
            .order("unlocked_at", { ascending: false })
            .limit(60),

        // Unread toasts
        supabase
            .from("user_toasts")
            .select("id, kind, title, status, created_at")
            .eq("user_id", user_id)
            .eq("status", "unread")
            .order("created_at", { ascending: false })
            .limit(80),

        // Photos last 30d (activity)
        supabase
            .from("photos")
            .select("id, created_at, category, is_cover")
            .eq("user_id", user_id)
            .eq("session_id", session_id)
            .gte("created_at", since30.toISOString()),

        // Photos all (counts)
        supabase
            .from("photos")
            .select("id, category, is_cover, created_at")
            .eq("user_id", user_id)
            .eq("session_id", session_id),
    ]);

    const anyError =
        renownRes.error ||
        renownLevelRes.error ||
        chaptersRes.error ||
        chapterQuestsRes.error ||
        adventureQuestsRes.error ||
        journalRes30.error ||
        journalResRecent.error ||
        aiGenRes30.error ||
        aiJobsRes30.error ||
        achRes.error ||
        badgesRes.error ||
        toastsUnreadRes.error ||
        photosRes30.error ||
        photosAllRes.error;

    if (anyError) {
        return NextResponse.json(
            { error: (anyError as any)?.message ?? "Stats fetch failed" },
            { status: 500 }
        );
    }

    /* ------------------------------------------------------------
     Progression: chapters & quests
    ------------------------------------------------------------ */
    const chapters = (chaptersRes.data ?? []) as any[];
    const chapterQuests = (chapterQuestsRes.data ?? []) as any[];
    const adventureQuests = (adventureQuestsRes.data ?? []) as any[];

    const chapters_total = chapters.length;
    const chapters_by_status = chapters.reduce((acc: Record<string, number>, c) => {
        const k = String(c.status ?? "unknown");
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
    }, {});

    const recent_chapters = chapters.slice(0, 6).map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        created_at: c.created_at,
        chapter_code: c.chapter_code ?? null,
        adventure_id: c.adventure_id ?? null,
    }));

    const quests_total = chapterQuests.length;
    const quests_done = chapterQuests.filter((q) => q.status === "done").length;
    const quests_todo = chapterQuests.filter((q) => q.status === "todo").length;

    const quests_by_status = chapterQuests.reduce((acc: Record<string, number>, q) => {
        const k = String(q.status ?? "unknown");
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
    }, {});

    const aqById = new Map<string, any>();
    for (const aq of adventureQuests) aqById.set(aq.id, aq);

    const difficulties: number[] = [];
    const roomCodes = new Set<string>();

    for (const cq of chapterQuests) {
        const aq = aqById.get(cq.adventure_quest_id);
        if (aq?.difficulty != null) difficulties.push(Number(aq.difficulty));
        if (typeof aq?.room_code === "string" && aq.room_code.trim()) roomCodes.add(aq.room_code);
    }

    const difficulty_avg =
        difficulties.length > 0
            ? Math.round((difficulties.reduce((a, b) => a + b, 0) / difficulties.length) * 10) / 10
            : null;

    const rooms_touched_count = roomCodes.size;

    /* ------------------------------------------------------------
     Activity: heatmap + streaks (journal)
    ------------------------------------------------------------ */
    const journal30 = (journalRes30.data ?? []) as any[];
    const journalRecent = (journalResRecent.data ?? []) as any[];

    const activityMap = new Map<string, number>();
    for (const e of journal30) {
        const k = toDateKey(new Date(e.created_at));
        activityMap.set(k, (activityMap.get(k) ?? 0) + 1);
    }

    const activity_last_30: Array<{ date: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const k = toDateKey(d);
        activity_last_30.push({ date: k, count: activityMap.get(k) ?? 0 });
    }

    const activeDays = new Set<string>();
    for (const e of journalRecent) activeDays.add(toDateKey(new Date(e.created_at)));

    let current_streak_days = 0;
    for (let i = 0; i < 400; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const k = toDateKey(d);
        if (!activeDays.has(k)) break;
        current_streak_days += 1;
    }

    const sortedDays = Array.from(activeDays)
        .map((k) => new Date(k + "T00:00:00Z"))
        .sort((a, b) => a.getTime() - b.getTime());

    let best_streak_days = sortedDays.length ? 1 : 0;
    let run = sortedDays.length ? 1 : 0;

    for (let i = 1; i < sortedDays.length; i++) {
        const prev = sortedDays[i - 1];
        const cur = sortedDays[i];
        const diff = daysBetweenUTC(prev, cur);
        if (diff === 1) {
            run += 1;
            if (run > best_streak_days) best_streak_days = run;
        } else {
            run = 1;
        }
    }

    const active_days_last_30 = activity_last_30.filter((d) => d.count > 0).length;
    const last_entry_at = journal30[0]?.created_at ?? null;

    /* ------------------------------------------------------------
     AI usage
   ------------------------------------------------------------ */
    const aiGen30 = (aiGenRes30.data ?? []) as any[];
    const aiJobs30 = (aiJobsRes30.data ?? []) as any[];

    const ai_generations_total_30 = aiGen30.length;
    const ai_generations_success_30 = aiGen30.filter((g) => g.status === "success").length;
    const ai_generations_error_30 = aiGen30.filter((g) => g.status === "error").length;

    const byGenType: Record<string, number> = {};
    const durations: number[] = [];

    for (const g of aiGen30) {
        const k = String(g.generation_type ?? "unknown");
        byGenType[k] = (byGenType[k] ?? 0) + 1;
        if (g.duration_ms != null) durations.push(Number(g.duration_ms));
    }

    const ai_generation_types_top = Object.entries(byGenType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([type, count]) => ({ type, count }));

    const ai_duration_avg_ms =
        durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : null;

    const ai_jobs_total_30 = aiJobs30.length;

    const ai_jobs_by_status = aiJobs30.reduce((acc: Record<string, number>, j) => {
        const k = String(j.status ?? "unknown");
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
    }, {});

    const ai_jobs_by_type = aiJobs30.reduce((acc: Record<string, number>, j) => {
        const k = String(j.job_type ?? "unknown");
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
    }, {});

    const ai_job_types_top = Object.entries(ai_jobs_by_type)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([job_type, count]) => ({ job_type, count }));

    /* ------------------------------------------------------------
     Achievements / badges / toasts
   ------------------------------------------------------------ */
    const unlocks = (achRes.data ?? []) as any[];
    const badges = (badgesRes.data ?? []) as any[];
    const toastsUnread = (toastsUnreadRes.data ?? []) as any[];

    const achievements_total = unlocks.length;
    const achievements_recent = unlocks.slice(0, 8).map((u) => ({
        id: u.id,
        unlocked_at: u.unlocked_at,
        scope_key: u.scope_key ?? null,
        code: u.achievement?.code ?? null,
        name: u.achievement?.name ?? null,
        icon: u.achievement?.icon ?? null,
        scope: u.achievement?.scope ?? null,
        is_repeatable: !!u.achievement?.is_repeatable,
    }));

    const badges_total = badges.length;
    const badges_recent = badges.slice(0, 8).map((b) => ({
        id: b.id,
        unlocked_at: b.unlocked_at,
        code: b.badge?.code ?? null,
        title: b.badge?.title ?? null,
        emoji: b.badge?.emoji ?? null,
    }));

    const toasts_unread_count = toastsUnread.length;
    const toasts_unread_recent = toastsUnread.slice(0, 10).map((t) => ({
        id: t.id,
        kind: t.kind,
        title: t.title,
        created_at: t.created_at,
    }));

    /* ------------------------------------------------------------
     Photos
   ------------------------------------------------------------ */
    const photos30 = (photosRes30.data ?? []) as any[];
    const photosAll = (photosAllRes.data ?? []) as any[];

    const photos_total = photosAll.length;
    const photos_cover_total = photosAll.filter((p) => !!p.is_cover).length;
    const photos_last_30 = photos30.length;

    const photos_by_category = photosAll.reduce((acc: Record<string, number>, p) => {
        const k = String(p.category ?? "other");
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
    }, {});

    /* ------------------------------------------------------------
     Renown
   ------------------------------------------------------------ */
    const renown = renownRes.data ?? null;
    const renown_value = safeInt(renown?.value, 0);
    const renown_level = safeInt(renown?.level, 1);

    const levelsCatalog = (renownLevelRes.data ?? []) as any[];
    const levelRow = levelsCatalog.find((r) => Number(r.level) === renown_level) ?? null;

    /* ------------------------------------------------------------
     Response
   ------------------------------------------------------------ */
    return NextResponse.json({
        session: {
            id: session_id,
            created_at: session.created_at ?? null,
        },

        progression: {
            renown: {
                value: renown_value,
                level: renown_level,
                tier: levelRow?.tier ?? null,
                tier_title: levelRow?.tier_title ?? null,
                full_title: levelRow?.full_title ?? null,
                is_milestone: !!levelRow?.is_milestone,
                updated_at: renown?.updated_at ?? null,
            },

            chapters: {
                total: chapters_total,
                by_status: chapters_by_status,
                recent: recent_chapters,
            },

            quests: {
                total: quests_total,
                done: quests_done,
                todo: quests_todo,
                by_status: quests_by_status,
                difficulty_avg,
                rooms_touched_count,
            },
        },

        activity: {
            last_entry_at,
            current_streak_days,
            best_streak_days,
            active_days_last_30,
            activity_last_30,
        },

        ai: {
            generations_last_30: {
                total: ai_generations_total_30,
                success: ai_generations_success_30,
                error: ai_generations_error_30,
                avg_duration_ms: ai_duration_avg_ms,
                types_top: ai_generation_types_top,
            },
            jobs_last_30: {
                total: ai_jobs_total_30,
                by_status: ai_jobs_by_status,
                types_top: ai_job_types_top,
            },
        },

        achievements: {
            total: achievements_total,
            recent: achievements_recent,
        },

        badges: {
            total: badges_total,
            recent: badges_recent,
        },

        toasts: {
            unread_count: toasts_unread_count,
            unread_recent: toasts_unread_recent,
        },

        photos: {
            total: photos_total,
            cover_total: photos_cover_total,
            last_30: photos_last_30,
            by_category: photos_by_category,
        },

        meta: {
            generated_at: new Date().toISOString(),
            windows: {
                last_30_from: since30.toISOString(),
            },
        },
    });
}
