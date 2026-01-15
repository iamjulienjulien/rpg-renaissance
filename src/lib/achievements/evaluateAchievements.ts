// src/lib/achievements/evaluateAchievements.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧠 TYPES (alignés JSON Schema v1)
============================================================================ */

type Operator = "AND" | "OR";
type Scope = "global" | "session" | "adventure" | "chapter" | "any";

type ConditionNode = ConditionGroup | ConditionRule;

type ConditionGroup = {
    operator: Operator;
    rules: ConditionNode[];
};

type ConditionRule =
    | { type: "quest_completed_count"; scope?: Scope; value: number }
    | { type: "chapter_completed_count"; scope?: Scope; value: number }
    | { type: "adventure_completed"; scope?: Scope }
    | { type: "photo_uploaded"; scope?: Scope; value: number }
    | { type: "renown_level_reached"; scope?: Scope; value: number }
    | { type: "session_started"; scope?: Scope; value: number };

type ConditionsJson = ConditionGroup;

type Reward =
    | { type: "renown"; value: number }
    | {
          type: "renown_by_difficulty";
          map: { default: number; "1"?: number; "2"?: number; "3"?: number };
      }
    | { type: "badge"; code: string }
    | { type: "title"; code: string };

export type EvaluateAchievementsContext = {
    user_id: string;

    // optionnel selon event
    session_id?: string | null;
    adventure_id?: string | null;
    chapter_id?: string | null;
    chapter_quest_id?: string | null;

    // optionnel: ids de trace/debug
    request_id?: string | null;
    trace_id?: string | null;

    // payload libre
    payload?: Record<string, unknown> | null;
};

type AchievementCatalogRow = {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string | null;
    scope: string;
    is_repeatable: boolean;
    cooldown_hours: number | null;
    trigger_event: string | null;
    conditions: any;
    rewards: any;
};

type UnlockRow = {
    id: string;
    achievement_id: string;
    user_id: string;
    scope_key: string;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeJson<T>(x: any, fallback: T): T {
    try {
        return (x ?? fallback) as T;
    } catch {
        return fallback;
    }
}

function nowIso() {
    return new Date().toISOString();
}

function isGroup(node: any): node is ConditionGroup {
    return (
        !!node &&
        typeof node === "object" &&
        typeof node.operator === "string" &&
        Array.isArray(node.rules)
    );
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function safeSnippet(x: unknown, max = 240) {
    const s = typeof x === "string" ? x.trim() : "";
    if (!s) return "";
    return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * Détermine la scope_key (idempotence)
 * - si scope = "session" => scope_key = `session:<session_id>`
 * - si scope = "adventure" => `adventure:<adventure_id>`
 * - si scope = "chapter" => `chapter:<chapter_id>`
 * - si scope = "chapter_quest" => `chapter_quest:<chapter_quest_id>`
 * - sinon => `user:<user_id>`
 */
function computeScopeKey(scope: string, ctx: EvaluateAchievementsContext): string {
    const s = String(scope || "user");

    if (s === "session")
        return ctx.session_id ? `session:${ctx.session_id}` : `user:${ctx.user_id}`;
    if (s === "adventure")
        return ctx.adventure_id ? `adventure:${ctx.adventure_id}` : `user:${ctx.user_id}`;
    if (s === "chapter")
        return ctx.chapter_id ? `chapter:${ctx.chapter_id}` : `user:${ctx.user_id}`;
    if (s === "chapter_quest")
        return ctx.chapter_quest_id
            ? `chapter_quest:${ctx.chapter_quest_id}`
            : `user:${ctx.user_id}`;

    return `user:${ctx.user_id}`;
}

/**
 * Pour les règles "global" qui doivent passer par session_id -> game_sessions.user_id,
 * on sécurise le fait que la session appartient bien à ctx.user_id.
 */
async function assertSessionOwner(
    supabase: SupabaseClient,
    ctx: EvaluateAchievementsContext
): Promise<{ ok: boolean; user_id: string | null; reason: Record<string, unknown> }> {
    if (!ctx.session_id) return { ok: false, user_id: null, reason: { missing: "session_id" } };

    const { data, error } = await supabase
        .from("game_sessions")
        .select("id,user_id")
        .eq("id", ctx.session_id)
        .maybeSingle();

    if (error) return { ok: false, user_id: null, reason: { error: error.message } };
    const owner = (data as any)?.user_id ?? null;

    if (!owner) return { ok: false, user_id: null, reason: { error: "No user_id on session" } };
    if (String(owner) !== String(ctx.user_id)) {
        return {
            ok: false,
            user_id: owner,
            reason: { mismatch: { ctx_user_id: ctx.user_id, session_user_id: owner } },
        };
    }

    return { ok: true, user_id: owner, reason: { ok: true } };
}

/* ============================================================================
🧩 CONDITIONS EVAL
============================================================================ */

async function evalRule(
    supabase: SupabaseClient,
    rule: ConditionRule,
    ctx: EvaluateAchievementsContext
): Promise<{ ok: boolean; reason: Record<string, unknown> }> {
    // -------------------------
    // QUEST COMPLETED COUNT
    // -------------------------
    if (rule.type === "quest_completed_count") {
        const scope: Scope = rule.scope ?? "global";

        // session scope
        if (scope === "session") {
            if (!ctx.session_id) return { ok: false, reason: { missing: "session_id" } };

            // sécurise que la session appartient au user
            const own = await assertSessionOwner(supabase, ctx);
            if (!own.ok)
                return { ok: false, reason: { rule: "quest_completed_count", ...own.reason } };

            const { count, error } = await supabase
                .from("chapter_quests")
                .select("id", { count: "exact", head: true })
                .eq("session_id", ctx.session_id)
                .eq("status", "done");

            if (error) return { ok: false, reason: { error: error.message } };

            const n = Number(count ?? 0);
            return { ok: n >= rule.value, reason: { quests_done_session: n, needed: rule.value } };
        }

        // global: via sessions du user (chapter_quests n'a pas user_id)
        const { data: sessions, error: sErr } = await supabase
            .from("game_sessions")
            .select("id")
            .eq("user_id", ctx.user_id);

        if (sErr) return { ok: false, reason: { error: sErr.message } };

        const ids = (sessions ?? []).map((x: any) => x.id).filter(Boolean);
        if (ids.length === 0)
            return {
                ok: false,
                reason: { quests_done_global: 0, needed: rule.value, note: "no_sessions" },
            };

        const { count, error } = await supabase
            .from("chapter_quests")
            .select("id", { count: "exact", head: true })
            .in("session_id", ids)
            .eq("status", "done");

        if (error) return { ok: false, reason: { error: error.message } };

        const n = Number(count ?? 0);
        return { ok: n >= rule.value, reason: { quests_done_global: n, needed: rule.value } };
    }

    // -------------------------
    // PHOTO UPLOADED (photos)
    // -------------------------
    if (rule.type === "photo_uploaded") {
        const scope: Scope = rule.scope ?? "global";

        if (scope === "session") {
            if (!ctx.session_id) return { ok: false, reason: { missing: "session_id" } };

            const own = await assertSessionOwner(supabase, ctx);
            if (!own.ok) return { ok: false, reason: { rule: "photo_uploaded", ...own.reason } };

            const { count, error } = await supabase
                .from("photos")
                .select("id", { count: "exact", head: true })
                .eq("session_id", ctx.session_id);

            if (error) return { ok: false, reason: { error: error.message } };
            const n = Number(count ?? 0);
            return { ok: n >= rule.value, reason: { photos_session: n, needed: rule.value } };
        }

        // global (photos a user_id ✅)
        const { count, error } = await supabase
            .from("photos")
            .select("id", { count: "exact", head: true })
            .eq("user_id", ctx.user_id);

        if (error) return { ok: false, reason: { error: error.message } };
        const n = Number(count ?? 0);
        return { ok: n >= rule.value, reason: { photos_global: n, needed: rule.value } };
    }

    // -------------------------
    // RENOWN LEVEL REACHED (player_renown)
    // -------------------------
    if (rule.type === "renown_level_reached") {
        const scope: Scope = rule.scope ?? "session";

        if (scope === "session") {
            if (!ctx.session_id) return { ok: false, reason: { missing: "session_id" } };

            const own = await assertSessionOwner(supabase, ctx);
            if (!own.ok)
                return { ok: false, reason: { rule: "renown_level_reached", ...own.reason } };

            const { data, error } = await supabase
                .from("player_renown")
                .select("level,value")
                .eq("user_id", ctx.user_id)
                .eq("session_id", ctx.session_id)
                .maybeSingle();

            if (error) return { ok: false, reason: { error: error.message } };

            const lvl = Number((data as any)?.level ?? 1);
            return {
                ok: lvl >= rule.value,
                reason: { renown_level_session: lvl, needed: rule.value },
            };
        }

        // global => max level over all sessions
        const { data, error } = await supabase
            .from("player_renown")
            .select("level")
            .eq("user_id", ctx.user_id);

        if (error) return { ok: false, reason: { error: error.message } };

        const maxLvl = Math.max(1, ...(data ?? []).map((x: any) => Number(x.level ?? 1)));
        return {
            ok: maxLvl >= rule.value,
            reason: { renown_level_global_max: maxLvl, needed: rule.value },
        };
    }

    // -------------------------
    // SESSION STARTED (game_sessions)
    // -------------------------
    if (rule.type === "session_started") {
        const scope: Scope = rule.scope ?? "global";

        if (scope === "session") {
            const ok = !!ctx.session_id && rule.value <= 1;
            return { ok, reason: { has_session: !!ctx.session_id, needed: rule.value } };
        }

        const { count, error } = await supabase
            .from("game_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", ctx.user_id);

        if (error) return { ok: false, reason: { error: error.message } };

        const n = Number(count ?? 0);
        return { ok: n >= rule.value, reason: { sessions_global: n, needed: rule.value } };
    }

    // -------------------------
    // NOT IMPLEMENTED YET
    // -------------------------
    if (rule.type === "chapter_completed_count") {
        return {
            ok: false,
            reason: {
                not_implemented: "chapter_completed_count",
                hint: "Need definition of chapter completion",
            },
        };
    }

    if (rule.type === "adventure_completed") {
        return {
            ok: false,
            reason: {
                not_implemented: "adventure_completed",
                hint: "Need definition of adventure completion",
            },
        };
    }

    return { ok: false, reason: { error: "Unknown rule type" } };
}

async function evalNode(
    supabase: SupabaseClient,
    node: ConditionNode,
    ctx: EvaluateAchievementsContext
): Promise<{ ok: boolean; reason: Record<string, unknown> }> {
    if (isGroup(node)) {
        const op: Operator = node.operator ?? "AND";
        const rules = Array.isArray(node.rules) ? node.rules : [];

        const results = [];
        for (const child of rules) {
            const one = await evalNode(supabase, child, ctx);
            results.push({ ok: one.ok, reason: one.reason, node: child });
        }

        const ok = op === "OR" ? results.some((x) => x.ok) : results.every((x) => x.ok);

        return { ok, reason: { operator: op, results } };
    }

    return await evalRule(supabase, node as ConditionRule, ctx);
}

async function evalConditions(
    supabase: SupabaseClient,
    conditions: ConditionsJson,
    ctx: EvaluateAchievementsContext
): Promise<{ ok: boolean; reason: Record<string, unknown> }> {
    if (!conditions || !isGroup(conditions))
        return { ok: false, reason: { error: "Invalid conditions shape" } };
    if (!Array.isArray(conditions.rules) || conditions.rules.length === 0)
        return { ok: false, reason: { error: "No rules" } };
    return await evalNode(supabase, conditions, ctx);
}

/* ============================================================================
🎁 REWARDS
============================================================================ */

async function applyRewards(
    supabase: SupabaseClient,
    rewards: Reward[],
    achievement: AchievementCatalogRow,
    ctx: EvaluateAchievementsContext
): Promise<{ applied: Reward[]; notes: Record<string, unknown> }> {
    const applied: Reward[] = [];
    const notes: Record<string, unknown> = { actions: [] };

    for (const r of rewards) {
        // badge/title: V1 => stocké via payload (unlock + toast)
        if (r.type === "badge" || r.type === "title") {
            applied.push(r);
            (notes.actions as any[]).push({
                type: r.type,
                code: (r as any).code,
                stored: "unlock.reward_payload + toast.payload",
            });
            continue;
        }

        if (r.type === "renown") {
            if (!ctx.session_id) {
                applied.push(r);
                (notes.actions as any[]).push({
                    type: "renown",
                    value: r.value,
                    skipped: "missing session_id",
                });
                continue;
            }

            // sécurise owner
            const own = await assertSessionOwner(supabase, ctx);
            if (!own.ok) {
                applied.push(r);
                (notes.actions as any[]).push({
                    type: "renown",
                    value: r.value,
                    skipped: "session_not_owned",
                    reason: own.reason,
                });
                continue;
            }

            const { data: existing, error: e0 } = await supabase
                .from("player_renown")
                .select("value,level")
                .eq("user_id", ctx.user_id)
                .eq("session_id", ctx.session_id)
                .maybeSingle();

            if (e0) {
                applied.push(r);
                (notes.actions as any[]).push({
                    type: "renown",
                    value: r.value,
                    error: e0.message,
                });
                continue;
            }

            const prevValue = Number((existing as any)?.value ?? 0);
            const nextValue = prevValue + Number(r.value);

            const { error: e1 } = await supabase.from("player_renown").upsert(
                {
                    user_id: ctx.user_id,
                    session_id: ctx.session_id,
                    value: nextValue,
                },
                { onConflict: "user_id,session_id" }
            );

            if (e1) {
                applied.push(r);
                (notes.actions as any[]).push({
                    type: "renown",
                    value: r.value,
                    error: e1.message,
                });
                continue;
            }

            applied.push(r);
            (notes.actions as any[]).push({
                type: "renown",
                value: r.value,
                prev: prevValue,
                next: nextValue,
            });
            continue;
        }

        if (r.type === "renown_by_difficulty") {
            if (!ctx.session_id) {
                applied.push(r);
                (notes.actions as any[]).push({
                    type: "renown_by_difficulty",
                    skipped: "missing session_id",
                });
                continue;
            }

            const own = await assertSessionOwner(supabase, ctx);
            if (!own.ok) {
                applied.push(r);
                (notes.actions as any[]).push({
                    type: "renown_by_difficulty",
                    skipped: "session_not_owned",
                    reason: own.reason,
                });
                continue;
            }

            const dRaw = Number((ctx.payload as any)?.difficulty ?? null);

            let delta =
                dRaw === 2
                    ? (r.map["2"] ?? r.map.default)
                    : dRaw >= 3
                      ? (r.map["3"] ?? r.map.default)
                      : (r.map["1"] ?? r.map.default);

            const { data: existing, error: e0 } = await supabase
                .from("player_renown")
                .select("value")
                .eq("user_id", ctx.user_id)
                .eq("session_id", ctx.session_id)
                .maybeSingle();

            if (e0) {
                applied.push(r);
                (notes.actions as any[]).push({
                    type: "renown_by_difficulty",
                    error: e0.message,
                });
                continue;
            }

            const prev = Number((existing as any)?.value ?? 0);
            const next = prev + Number(delta);

            const { error: e1 } = await supabase.from("player_renown").upsert(
                {
                    user_id: ctx.user_id,
                    session_id: ctx.session_id,
                    value: next,
                },
                { onConflict: "user_id,session_id" }
            );

            if (e1) {
                applied.push(r);
                (notes.actions as any[]).push({
                    type: "renown_by_difficulty",
                    error: e1.message,
                });
                continue;
            }

            applied.push({ type: "renown", value: delta });
            (notes.actions as any[]).push({
                type: "renown_by_difficulty",
                difficulty: dRaw,
                delta,
                prev,
                next,
            });

            continue;
        }
    }

    return { applied, notes };
}

async function createAchievementToast(
    supabase: SupabaseClient,
    achievement: AchievementCatalogRow,
    rewardsApplied: Reward[],
    ctx: EvaluateAchievementsContext
): Promise<void> {
    const t0 = Date.now();

    // utile pour regrouper les traces si tu filtres par ctx
    patchRequestContext({
        user_id: ctx.user_id,
        session_id: ctx.session_id ?? undefined,
        adventure_id: ctx.adventure_id ?? undefined,
        chapter_id: ctx.chapter_id ?? undefined,
        chapter_quest_id: ctx.chapter_quest_id ?? undefined,
        request_id: ctx.request_id ?? undefined,
        trace_id: ctx.trace_id ?? undefined,
    });

    Log.debug("ach.toast.start", {
        metadata: {
            ms: msSince(t0),
            achievement_id: achievement.id,
            code: achievement.code,
            rewards_count: Array.isArray(rewardsApplied) ? rewardsApplied.length : 0,
            user_id: ctx.user_id,
            session_id: ctx.session_id ?? null,
            adventure_id: ctx.adventure_id ?? null,
            chapter_id: ctx.chapter_id ?? null,
            chapter_quest_id: ctx.chapter_quest_id ?? null,
        },
    });

    const title = `${achievement.icon ?? "✨"} ${achievement.name}`;
    const message = achievement.description;

    const payload = {
        achievement: {
            id: achievement.id,
            code: achievement.code,
            name: achievement.name,
            icon: achievement.icon,
        },
        rewards: rewardsApplied,
        context: {
            session_id: ctx.session_id ?? null,
            adventure_id: ctx.adventure_id ?? null,
            chapter_id: ctx.chapter_id ?? null,
            chapter_quest_id: ctx.chapter_quest_id ?? null,
        },
        trace: {
            request_id: ctx.request_id ?? null,
            trace_id: ctx.trace_id ?? null,
        },
    };

    // 1) Toast "achievement"
    const toastId = crypto.randomUUID();
    const ins0 = Date.now();

    Log.debug("ach.toast.achievement.insert.start", {
        metadata: {
            ms: msSince(ins0),
            toast_id: toastId,
            user_id: ctx.user_id,
            achievement_id: achievement.id,
            code: achievement.code,
        },
    });

    const { error: toastErr } = await supabase.from("user_toasts").insert({
        id: toastId,
        user_id: ctx.user_id,
        kind: "achievement",
        title,
        message,
        payload,
        status: "unread",
    });

    if (toastErr) {
        Log.error("ach.toast.achievement.insert.error", toastErr, {
            status_code: 500,
            metadata: {
                ms: msSince(ins0),
                toast_id: toastId,
                code: achievement.code,
                achievement_id: achievement.id,
            },
        });
        throw new Error("Failed to insert achievement toast: " + toastErr.message);
    }

    Log.success("ach.toast.achievement.insert.ok", {
        metadata: {
            ms: msSince(ins0),
            toast_id: toastId,
            code: achievement.code,
        },
    });

    // 2) Badges (si présents dans les rewards)
    const badgeRewards = (rewardsApplied ?? []).filter(
        (r: any) => r?.type === "badge" && typeof r?.code === "string" && r.code.trim()
    );

    Log.debug("ach.toast.badges.scan", {
        metadata: {
            ms: msSince(t0),
            code: achievement.code,
            badge_rewards_count: badgeRewards.length,
            badge_codes: badgeRewards.map((r: any) => String(r.code).trim()).slice(0, 12),
        },
    });

    if (badgeRewards.length === 0) {
        Log.debug("ach.toast.done.no_badges", {
            metadata: { ms: msSince(t0), code: achievement.code },
        });
        return;
    }

    // Option: 1 toast par badge
    for (const r of badgeRewards as any[]) {
        const badgeCode = String(r.code).trim();
        const loop0 = Date.now();

        Log.debug("ach.toast.badge.start", {
            metadata: { ms: msSince(loop0), code: achievement.code, badge_code: badgeCode },
        });

        // a) lookup badge catalog
        const look0 = Date.now();
        Log.debug("ach.toast.badge.catalog_lookup.start", {
            metadata: { ms: msSince(look0), badge_code: badgeCode },
        });

        const { data: badgeRow, error: badgeErr } = await supabase
            .from("achievement_badges_catalog")
            .select("id, code, title, emoji, description")
            .eq("code", badgeCode)
            .maybeSingle();

        if (badgeErr) {
            Log.error("ach.toast.badge.catalog_lookup.error", badgeErr, {
                status_code: 500,
                metadata: { ms: msSince(look0), badge_code: badgeCode, code: achievement.code },
            });
            throw new Error("Failed to lookup badge catalog: " + badgeErr.message);
        }

        if (!badgeRow?.id) {
            Log.warning("ach.toast.badge.catalog_lookup.miss", {
                metadata: {
                    ms: msSince(look0),
                    badge_code: badgeCode,
                    code: achievement.code,
                    note: "badge reward referenced but not found in catalog",
                },
            });
            continue;
        }

        Log.success("ach.toast.badge.catalog_lookup.ok", {
            metadata: {
                ms: msSince(look0),
                badge_id: badgeRow.id,
                badge_code: badgeRow.code,
            },
        });

        // b) insert possession (idempotent)
        const up0 = Date.now();
        Log.debug("ach.toast.badge.player_badges.upsert.start", {
            metadata: {
                ms: msSince(up0),
                user_id: ctx.user_id,
                badge_id: badgeRow.id,
                badge_code: badgeRow.code,
                source: `achievement:${achievement.code}`,
            },
        });

        const { error: pbErr } = await supabase.from("player_badges").upsert(
            {
                user_id: ctx.user_id,
                badge_id: badgeRow.id,
                source: `achievement:${achievement.code}`,
                metadata: {
                    achievement_id: achievement.id,
                    achievement_code: achievement.code,
                    reward: r,
                    context: {
                        session_id: ctx.session_id ?? null,
                        adventure_id: ctx.adventure_id ?? null,
                        chapter_id: ctx.chapter_id ?? null,
                        chapter_quest_id: ctx.chapter_quest_id ?? null,
                    },
                    trace: {
                        request_id: ctx.request_id ?? null,
                        trace_id: ctx.trace_id ?? null,
                    },
                },
            },
            {
                onConflict: "user_id,badge_id",
                ignoreDuplicates: true,
            }
        );

        if (pbErr) {
            Log.error("ach.toast.badge.player_badges.upsert.error", pbErr, {
                status_code: 500,
                metadata: {
                    ms: msSince(up0),
                    user_id: ctx.user_id,
                    badge_id: badgeRow.id,
                    badge_code: badgeRow.code,
                    code: achievement.code,
                },
            });
            throw new Error("Failed to upsert player_badges: " + pbErr.message);
        }

        Log.success("ach.toast.badge.player_badges.upsert.ok", {
            metadata: {
                ms: msSince(up0),
                badge_id: badgeRow.id,
                badge_code: badgeRow.code,
            },
        });

        // c) toast "badge"
        const badgeToastId = crypto.randomUUID();
        const badgeTitle = `${badgeRow.emoji ?? "🏅"} ${badgeRow.title ?? "Badge débloqué"}`;
        const badgeMessage = badgeRow.description ?? "Nouveau badge obtenu.";

        const badgePayload = {
            badge: {
                id: badgeRow.id,
                code: badgeRow.code,
                title: badgeRow.title,
                emoji: badgeRow.emoji,
                description: badgeRow.description,
            },
            source: {
                achievement_id: achievement.id,
                achievement_code: achievement.code,
            },
            context: {
                session_id: ctx.session_id ?? null,
                adventure_id: ctx.adventure_id ?? null,
                chapter_id: ctx.chapter_id ?? null,
                chapter_quest_id: ctx.chapter_quest_id ?? null,
            },
            trace: {
                request_id: ctx.request_id ?? null,
                trace_id: ctx.trace_id ?? null,
            },
        };

        const bt0 = Date.now();
        Log.debug("ach.toast.badge.toast_insert.start", {
            metadata: {
                ms: msSince(bt0),
                toast_id: badgeToastId,
                badge_code: badgeRow.code,
                badge_id: badgeRow.id,
                user_id: ctx.user_id,
            },
        });

        const { error: badgeToastErr } = await supabase.from("user_toasts").insert({
            id: badgeToastId,
            user_id: ctx.user_id,
            kind: "badge",
            title: badgeTitle,
            message: badgeMessage,
            payload: badgePayload,
            status: "unread",
        });

        if (badgeToastErr) {
            Log.error("ach.toast.badge.toast_insert.error", badgeToastErr, {
                status_code: 500,
                metadata: {
                    ms: msSince(bt0),
                    toast_id: badgeToastId,
                    badge_code: badgeRow.code,
                    badge_id: badgeRow.id,
                    code: achievement.code,
                },
            });
            throw new Error("Failed to insert badge toast: " + badgeToastErr.message);
        }

        Log.success("ach.toast.badge.toast_insert.ok", {
            metadata: {
                ms: msSince(bt0),
                toast_id: badgeToastId,
                badge_code: badgeRow.code,
            },
        });

        Log.debug("ach.toast.badge.done", {
            metadata: { ms: msSince(loop0), badge_code: badgeCode, code: achievement.code },
        });
    }

    Log.success("ach.toast.done", {
        metadata: { ms: msSince(t0), code: achievement.code },
    });
}

/* ============================================================================
🚀 MAIN
============================================================================ */

/**
 * ✅ Moteur principal
 * - Retourne uniquement les achievements nouvellement unlockés
 * - IMPORTANT: utiliser supabaseAdmin (service role) car:
 *   - lecture catalog admin-only
 *   - insert unlocks + insert toasts admin-only
 */
export async function evaluateAchievements(
    supabaseAdmin: SupabaseClient,
    event: string,
    ctx: EvaluateAchievementsContext
): Promise<{ unlocked: UnlockRow[] }> {
    const t0 = Date.now();
    const timer = Log.timer("evaluateAchievements", {
        source: "src/lib/achievements/evaluateAchievements.ts",
        metadata: {
            event: String(event || ""),
            has_session_id: !!ctx?.session_id,
            has_chapter_id: !!ctx?.chapter_id,
            has_chapter_quest_id: !!ctx?.chapter_quest_id,
        },
    });

    if (!ctx?.user_id) {
        Log.warning("ach.eval.bad_input.missing_user_id", { status_code: 400 });
        timer.endError("ach.eval.bad_input", undefined, { status_code: 400 });
        throw new Error("evaluateAchievements: missing ctx.user_id");
    }

    patchRequestContext({
        user_id: ctx.user_id,
        session_id: ctx.session_id ?? undefined,
        adventure_id: ctx.adventure_id ?? undefined,
        chapter_id: ctx.chapter_id ?? undefined,
        chapter_quest_id: ctx.chapter_quest_id ?? undefined,
        request_id: ctx.request_id ?? undefined,
        trace_id: ctx.trace_id ?? undefined,
    });

    Log.info("ach.eval.start", {
        metadata: {
            event: String(event),
            user_id: ctx.user_id,
            session_id: ctx.session_id ?? null,
            chapter_id: ctx.chapter_id ?? null,
            chapter_quest_id: ctx.chapter_quest_id ?? null,
            trace_id: ctx.trace_id ?? null,
            request_id: ctx.request_id ?? null,
        },
    });

    // 1) fetch catalog candidats
    const c0 = Date.now();
    Log.debug("ach.eval.catalog.fetch.start", {
        metadata: { event: String(event), is_active: true },
    });

    const req0 = supabaseAdmin.from("achievement_catalog").select("*").eq("is_active", true);

    if (event !== "manual_refresh") {
        req0.eq("trigger_event", event);
    }

    const { data: catalog, error: e0 } = await req0;

    if (e0) {
        Log.error("ach.eval.catalog.fetch.error", e0, {
            metadata: { ms: msSince(c0), event: String(event) },
        });
        timer.endError("ach.eval.catalog.fetch.error", e0, { status_code: 500 });
        throw new Error(e0.message);
    }

    Log.success("ach.eval.catalog.fetch.ok", {
        metadata: {
            ms: msSince(c0),
            event: String(event),
            count: Array.isArray(catalog) ? catalog.length : 0,
            codes: Array.isArray(catalog) ? catalog.map((x: any) => x.code).slice(0, 12) : [],
        },
    });

    if (!catalog || catalog.length === 0) {
        Log.warning("ach.eval.catalog.empty", {
            metadata: {
                event: String(event),
                note: "No achievements match this trigger_event, or RLS blocked the read.",
            },
        });
    }

    const unlocked: UnlockRow[] = [];

    // 2) loop achievements
    for (const a of (catalog ?? []) as AchievementCatalogRow[]) {
        const a0 = Date.now();

        Log.debug("ach.eval.achievement.start", {
            metadata: {
                ms_from_start: msSince(t0),
                achievement_id: a.id,
                code: a.code,
                scope: a.scope,
                trigger_event: a.trigger_event,
                is_repeatable: a.is_repeatable,
                cooldown_hours: a.cooldown_hours,
                cond_snippet: safeSnippet(JSON.stringify(a.conditions ?? null), 200) || null,
                rewards_snippet: safeSnippet(JSON.stringify(a.rewards ?? null), 200) || null,
            },
        });

        const conditions = safeJson<ConditionsJson>(a.conditions, { operator: "AND", rules: [] });
        const rewards = safeJson<Reward[]>(a.rewards, []);

        // 2) eval conditions
        const e1t = Date.now();
        Log.debug("ach.eval.conditions.start", {
            metadata: { code: a.code, operator: (conditions as any)?.operator ?? null },
        });

        let verdict: { ok: boolean; reason: Record<string, unknown> };
        try {
            verdict = await evalConditions(supabaseAdmin, conditions, ctx);
        } catch (e: any) {
            Log.error("ach.eval.conditions.crash", e, {
                metadata: { ms: msSince(e1t), code: a.code },
            });
            continue; // on ne casse pas le moteur pour 1 achievement
        }

        Log.debug("ach.eval.conditions.done", {
            metadata: {
                ms: msSince(e1t),
                code: a.code,
                ok: verdict.ok,
                reason_snippet: safeSnippet(JSON.stringify(verdict.reason ?? null), 260) || null,
            },
        });

        if (!verdict.ok) {
            Log.info("ach.eval.achievement.skip.conditions_false", {
                metadata: { code: a.code, ms: msSince(a0) },
            });
            continue;
        }

        // 3) compute scope_key
        const scopeKey = computeScopeKey(a.scope, ctx);
        Log.debug("ach.eval.scope_key", {
            metadata: { code: a.code, scope: a.scope, scope_key: scopeKey },
        });

        // 4) insert unlock (idempotent via unique index)
        const unlockId = crypto.randomUUID();
        const ins0 = Date.now();

        Log.debug("ach.eval.unlock.insert.start", {
            metadata: {
                code: a.code,
                unlock_id: unlockId,
                user_id: ctx.user_id,
                achievement_id: a.id,
                scope_key: scopeKey,
            },
        });

        const { data: inserted, error: eIns } = await supabaseAdmin
            .from("achievement_unlocks")
            .insert({
                id: unlockId,
                achievement_id: a.id,
                user_id: ctx.user_id,

                session_id: ctx.session_id ?? null,
                adventure_id: ctx.adventure_id ?? null,
                chapter_id: ctx.chapter_id ?? null,
                chapter_quest_id: ctx.chapter_quest_id ?? null,

                scope_key: scopeKey,
                unlocked_at: nowIso(),

                reason: verdict.reason,
                reward_payload: rewards,
                toast_status: "pending",
            })
            .select("id,achievement_id,user_id,scope_key")
            .maybeSingle();

        if (eIns) {
            const code = (eIns as any)?.code;

            if (String(code) === "23505") {
                Log.info("ach.eval.unlock.insert.conflict_already_unlocked", {
                    metadata: { ms: msSince(ins0), code: a.code, scope_key: scopeKey },
                });
                continue;
            }

            Log.warning("ach.eval.unlock.insert.error", {
                metadata: { ms: msSince(ins0), code: a.code, error: eIns.message, pg_code: code },
            });
            continue; // on laisse tourner les autres achievements
        }

        if (!inserted) {
            Log.warning("ach.eval.unlock.insert.no_row", {
                metadata: { ms: msSince(ins0), code: a.code },
            });
            continue;
        }

        Log.success("ach.eval.unlock.insert.ok", {
            metadata: { ms: msSince(ins0), code: a.code, unlock_id: inserted.id },
        });

        // 5) apply rewards
        const r0 = Date.now();
        Log.debug("ach.eval.rewards.apply.start", {
            metadata: { code: a.code, rewards_count: rewards.length },
        });

        const { applied, notes } = await applyRewards(supabaseAdmin, rewards, a, ctx);

        Log.success("ach.eval.rewards.apply.ok", {
            metadata: {
                ms: msSince(r0),
                code: a.code,
                applied_count: applied.length,
                notes_snippet: safeSnippet(JSON.stringify(notes ?? null), 260) || null,
            },
        });

        // 5b) update unlock payload => applied + notes
        const u0 = Date.now();
        const { error: uErr } = await supabaseAdmin
            .from("achievement_unlocks")
            .update({
                reward_payload: applied,
                reason: { ...(verdict.reason ?? {}), rewards_notes: notes },
            })
            .eq("id", inserted.id);

        if (uErr) {
            Log.warning("ach.eval.unlock.update_payload.error", {
                metadata: { ms: msSince(u0), code: a.code, error: uErr.message },
            });
        } else {
            Log.debug("ach.eval.unlock.update_payload.ok", {
                metadata: { ms: msSince(u0), code: a.code },
            });
        }

        // 6) toast persistant + mark unlock toast as shown
        const tToast = Date.now();
        try {
            await createAchievementToast(supabaseAdmin, a, applied, ctx);
            Log.success("ach.eval.toast.insert.ok", {
                metadata: { ms: msSince(tToast), code: a.code },
            });
        } catch (e: any) {
            Log.error("ach.eval.toast.insert.error", e, {
                metadata: { ms: msSince(tToast), code: a.code },
            });
        }

        const s0 = Date.now();
        const { error: sErr } = await supabaseAdmin
            .from("achievement_unlocks")
            .update({ toast_status: "shown", toast_shown_at: nowIso() })
            .eq("id", inserted.id);

        if (sErr) {
            Log.warning("ach.eval.unlock.mark_shown.error", {
                metadata: { ms: msSince(s0), code: a.code, error: sErr.message },
            });
        } else {
            Log.debug("ach.eval.unlock.mark_shown.ok", {
                metadata: { ms: msSince(s0), code: a.code, unlock_id: inserted.id },
            });
        }

        unlocked.push(inserted as UnlockRow);

        Log.success("ach.eval.achievement.done", {
            metadata: { ms: msSince(a0), code: a.code, unlock_id: inserted.id },
        });
    }

    Log.success("ach.eval.ok", {
        metadata: {
            total_ms: msSince(t0),
            event: String(event),
            unlocked_count: unlocked.length,
            unlocked_ids: unlocked.map((x) => x.id).slice(0, 12),
        },
    });

    timer.endSuccess("ach.eval.success", {
        metadata: { total_ms: msSince(t0), unlocked_count: unlocked.length },
    });

    return { unlocked };
}
