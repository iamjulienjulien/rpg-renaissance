// src/app/api/me/achievements/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";
import { evaluateAchievements } from "@/lib/achievements/evaluateAchievements";
import { evaluateRenownLevel } from "@/lib/achievements/evaluateRenownLevel";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

/* ============================================================================
POST /api/me/achievements
============================================================================ */

export async function POST(req: NextRequest) {
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
    let session_id: string | null = null;

    try {
        const session = await getActiveSessionOrThrow();
        session_id = session.id;
    } catch {
        // fallback: dernière session connue
        const { data } = await supabase
            .from("game_sessions")
            .select("id")
            .eq("user_id", user_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        session_id = data?.id ?? null;
    }

    if (!session_id) return jsonError("No session found", 404);

    /* ------------------------------------------------------------
     Context commun
    ------------------------------------------------------------ */
    const request_id = req.headers.get("x-request-id") ?? null;
    const admin = supabaseAdmin();

    const results = {
        achievements: {
            ok: true,
            unlocked_count: 0,
        },
        renown: {
            ok: true,
            updated: false,
            prev_level: null as number | null,
            next_level: null as number | null,
        },
    };

    /* ------------------------------------------------------------
     1) Achievements
    ------------------------------------------------------------ */
    try {
        const { unlocked } = await evaluateAchievements(admin, "manual_refresh", {
            user_id,
            session_id,
            request_id,
        });

        results.achievements.unlocked_count = unlocked.length;
    } catch (e) {
        // ⚠️ jamais bloquant
        console.error("evaluateAchievements failed", e);
        results.achievements.ok = false;
    }

    /* ------------------------------------------------------------
     2) Renown level
    ------------------------------------------------------------ */
    try {
        const r = await evaluateRenownLevel(admin, {
            user_id,
            request_id,
        });

        results.renown.updated = r.updated;
        results.renown.prev_level = r.prev?.level ?? null;
        results.renown.next_level = r.next?.level ?? null;
    } catch (e) {
        // ⚠️ jamais bloquant
        console.error("evaluateRenownLevel failed", e);
        results.renown.ok = false;
    }

    /* ------------------------------------------------------------
     Response
    ------------------------------------------------------------ */
    return NextResponse.json({
        ok: true,
        session_id,
        user_id,
        results,
        meta: {
            triggered_at: new Date().toISOString(),
            request_id,
        },
    });
}
