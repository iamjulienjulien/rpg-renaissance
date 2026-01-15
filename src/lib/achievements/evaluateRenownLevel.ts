// src/lib/renown/evaluateRenownLevel.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type EvaluateRenownLevelContext = {
    user_id: string;

    // optionnel: traçage
    request_id?: string | null;
    trace_id?: string | null;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function nowIso() {
    return new Date().toISOString();
}

function computeRenownLevel(value: number): number {
    return Math.max(0, Math.floor(value / 100));
}

/* ============================================================================
🚀 MAIN
============================================================================ */

/**
 * ✅ Évalue et met à jour le niveau de renommée d’un joueur
 *
 * - Calcule level = floor(value / 100)
 * - Update uniquement si le level change
 * - Retourne l’état avant / après
 */
export async function evaluateRenownLevel(
    supabaseAdmin: SupabaseClient,
    ctx: EvaluateRenownLevelContext
): Promise<{
    updated: boolean;
    prev?: { value: number; level: number };
    next?: { value: number; level: number };
}> {
    const t0 = Date.now();

    if (!ctx?.user_id) {
        Log.warning("renown.eval.bad_input.missing_user_id", { status_code: 400 });
        throw new Error("evaluateRenownLevel: missing ctx.user_id");
    }

    patchRequestContext({
        user_id: ctx.user_id,
        request_id: ctx.request_id ?? undefined,
        trace_id: ctx.trace_id ?? undefined,
    });

    Log.debug("renown.eval.start", {
        metadata: {
            user_id: ctx.user_id,
        },
    });

    /* =========================================================================
       1) Fetch player_renown
    ========================================================================= */

    const { data, error } = await supabaseAdmin
        .from("player_renown")
        .select("value, level")
        .eq("user_id", ctx.user_id)
        .maybeSingle();

    if (error) {
        Log.error("renown.eval.fetch.error", error, {
            metadata: { user_id: ctx.user_id },
        });
        throw new Error(error.message);
    }

    if (!data) {
        Log.info("renown.eval.no_row", {
            metadata: { user_id: ctx.user_id },
        });
        return { updated: false };
    }

    const prevValue = Number(data.value ?? 0);
    const prevLevel = Number(data.level ?? 0);

    const nextLevel = computeRenownLevel(prevValue);

    Log.debug("renown.eval.compute", {
        metadata: {
            user_id: ctx.user_id,
            value: prevValue,
            prev_level: prevLevel,
            next_level: nextLevel,
        },
    });

    /* =========================================================================
       2) No-op si inchangé
    ========================================================================= */

    if (prevLevel === nextLevel) {
        Log.debug("renown.eval.no_change", {
            metadata: {
                user_id: ctx.user_id,
                level: prevLevel,
            },
        });

        return {
            updated: false,
            prev: { value: prevValue, level: prevLevel },
            next: { value: prevValue, level: prevLevel },
        };
    }

    /* =========================================================================
       3) Update level
    ========================================================================= */

    const { error: uErr } = await supabaseAdmin
        .from("player_renown")
        .update({
            level: nextLevel,
            updated_at: nowIso(),
        })
        .eq("user_id", ctx.user_id);

    if (uErr) {
        Log.error("renown.eval.update.error", uErr, {
            metadata: {
                user_id: ctx.user_id,
                prev_level: prevLevel,
                next_level: nextLevel,
            },
        });
        throw new Error(uErr.message);
    }

    Log.success("renown.eval.update.ok", {
        metadata: {
            user_id: ctx.user_id,
            prev_level: prevLevel,
            next_level: nextLevel,
        },
    });

    Log.debug("renown.eval.done", {
        metadata: {
            user_id: ctx.user_id,
            ms: Date.now() - t0,
        },
    });

    return {
        updated: true,
        prev: { value: prevValue, level: prevLevel },
        next: { value: prevValue, level: nextLevel },
    };
}
