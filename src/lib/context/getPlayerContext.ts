// src/lib/ai/context/getPlayerContext.ts
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ✅ logs
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

export type PlayerContextMode = "authenticated" | "server";

export type PlayerContextResult = {
    player_display_name: string | null;
    player_context_self: string | null;
    player_context_family: string | null;
    player_context_home: string | null;
    player_context_routine: string | null;
    player_context_challenges: string | null;
} | null;

type AuthenticatedArgs = {
    mode: "authenticated";
    /** optionnel: forcer un user_id (utile admin UI). Sinon => auth.user.id */
    user_id?: string | null;
};

type ServerArgs = {
    mode: "server";
    /** requis en mode server */
    user_id: string;
};

export type GetPlayerContextArgs = AuthenticatedArgs | ServerArgs;

/* ============================================================================
🧠 MAIN
============================================================================ */

export async function getPlayerContext(args: GetPlayerContextArgs): Promise<PlayerContextResult> {
    const startedAt = Date.now();
    const t = Log.timer("getPlayerContext", {
        source: "lib/ai/context/getPlayerContext.ts",
    });

    try {
        Log.debug("player_context.start", {
            metadata: {
                mode: args.mode,
                user_id: "user_id" in args ? args.user_id : null,
            },
        });

        // ------------------------------------------------------------
        // SERVER MODE (admin): user_id requis
        // ------------------------------------------------------------
        if (args.mode === "server") {
            const userId = (args.user_id ?? "").trim();
            if (!userId) {
                Log.warning("player_context.server.missing_user_id", {
                    status_code: 400,
                });
                t.endError("getPlayerContext.server.bad_request", undefined, {
                    status_code: 400,
                });
                throw new Error("getPlayerContext(server): user_id is required");
            }

            patchRequestContext({ user_id: userId });

            const supabase = supabaseAdmin();

            // 1) user_contexts
            const q0 = Date.now();
            const { data: ctx, error: ctxErr } = await supabase
                .from("user_contexts")
                .select(
                    "context_self,context_family,context_home,context_routine,context_challenges"
                )
                .eq("user_id", userId)
                .maybeSingle();

            if (ctxErr) {
                Log.error("player_context.server.user_contexts.select.error", ctxErr, {
                    status_code: 500,
                    metadata: { ms: msSince(q0), user_id: userId },
                });
                t.endError("getPlayerContext.server.user_contexts_failed", ctxErr, {
                    status_code: 500,
                });
                throw new Error(ctxErr.message);
            }

            // 2) player_profiles.display_name
            const q1 = Date.now();
            const { data: pp, error: ppErr } = await supabase
                .from("player_profiles")
                .select("display_name")
                .eq("user_id", userId)
                .maybeSingle();

            if (ppErr) {
                Log.error("player_context.server.player_profiles.select.error", ppErr, {
                    status_code: 500,
                    metadata: { ms: msSince(q1), user_id: userId },
                });
                t.endError("getPlayerContext.server.player_profiles_failed", ppErr, {
                    status_code: 500,
                });
                throw new Error(ppErr.message);
            }

            if (!ctx && !pp) {
                Log.warning("player_context.server.not_found", {
                    status_code: 404,
                    metadata: { user_id: userId, ms: msSince(q0) },
                });
                t.endSuccess("getPlayerContext.server.not_found", { status_code: 200 });
                return null;
            }

            Log.success("player_context.server.ok", {
                status_code: 200,
                metadata: {
                    user_id: userId,
                    ms_user_contexts: msSince(q0),
                    ms_player_profiles: msSince(q1),
                    has_contexts: !!ctx,
                    has_display_name: !!pp?.display_name,
                },
            });

            t.endSuccess("getPlayerContext.server.success", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });

            return {
                player_display_name: (pp?.display_name ?? null) as string | null,
                player_context_self: (ctx?.context_self ?? null) as string | null,
                player_context_family: (ctx?.context_family ?? null) as string | null,
                player_context_home: (ctx?.context_home ?? null) as string | null,
                player_context_routine: (ctx?.context_routine ?? null) as string | null,
                player_context_challenges: (ctx?.context_challenges ?? null) as string | null,
            };
        }

        // ------------------------------------------------------------
        // AUTHENTICATED MODE: user_id via auth (ou forcé)
        // ------------------------------------------------------------
        const supabase = await supabaseServer();

        let userId = (args.user_id ?? "").trim();

        if (!userId) {
            const { data: auth, error: authErr } = await supabase.auth.getUser();

            if (authErr) {
                Log.warning("player_context.auth.auth_error", {
                    status_code: 401,
                    metadata: { detail: authErr.message },
                });
                t.endError("getPlayerContext.auth.not_authenticated", authErr, {
                    status_code: 401,
                });
                return null;
            }

            userId = auth?.user?.id ?? "";
        }

        if (!userId) {
            Log.warning("player_context.auth.no_user", { status_code: 401 });
            t.endError("getPlayerContext.auth.no_user", undefined, { status_code: 401 });
            return null;
        }

        patchRequestContext({ user_id: userId });

        // 1) user_contexts
        const q0 = Date.now();
        const { data: ctx, error: ctxErr } = await supabase
            .from("user_contexts")
            .select("context_self,context_family,context_home,context_routine,context_challenges")
            .eq("user_id", userId)
            .maybeSingle();

        if (ctxErr) {
            Log.error("player_context.auth.user_contexts.select.error", ctxErr, {
                status_code: 500,
                metadata: { ms: msSince(q0), user_id: userId },
            });
            t.endError("getPlayerContext.auth.user_contexts_failed", ctxErr, {
                status_code: 500,
            });
            throw new Error(ctxErr.message);
        }

        // 2) player_profiles.display_name
        const q1 = Date.now();
        const { data: pp, error: ppErr } = await supabase
            .from("player_profiles")
            .select("display_name")
            .eq("user_id", userId)
            .maybeSingle();

        if (ppErr) {
            Log.error("player_context.auth.player_profiles.select.error", ppErr, {
                status_code: 500,
                metadata: { ms: msSince(q1), user_id: userId },
            });
            t.endError("getPlayerContext.auth.player_profiles_failed", ppErr, {
                status_code: 500,
            });
            throw new Error(ppErr.message);
        }

        if (!ctx && !pp) {
            Log.warning("player_context.auth.not_found", {
                status_code: 404,
                metadata: { user_id: userId, ms: msSince(q0) },
            });
            t.endSuccess("getPlayerContext.auth.not_found", { status_code: 200 });
            return null;
        }

        Log.success("player_context.auth.ok", {
            status_code: 200,
            metadata: {
                user_id: userId,
                ms_user_contexts: msSince(q0),
                ms_player_profiles: msSince(q1),
                has_contexts: !!ctx,
                has_display_name: !!pp?.display_name,
            },
        });

        t.endSuccess("getPlayerContext.auth.success", {
            status_code: 200,
            metadata: { duration_ms: msSince(startedAt) },
        });

        return {
            player_display_name: (pp?.display_name ?? null) as string | null,
            player_context_self: (ctx?.context_self ?? null) as string | null,
            player_context_family: (ctx?.context_family ?? null) as string | null,
            player_context_home: (ctx?.context_home ?? null) as string | null,
            player_context_routine: (ctx?.context_routine ?? null) as string | null,
            player_context_challenges: (ctx?.context_challenges ?? null) as string | null,
        };
    } catch (e) {
        Log.error("player_context.fatal", e, {
            status_code: 500,
            metadata: { duration_ms: msSince(startedAt) },
        });
        t.endError("getPlayerContext.fatal", e, { status_code: 500 });
        throw e;
    }
}
