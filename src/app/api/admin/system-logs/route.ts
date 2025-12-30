// src/app/api/admin/system-logs/route.ts
import { NextResponse } from "next/server";
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

function asInt(v: string | null, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
    const url = new URL(req.url);

    // Detail mode: GET /api/admin/system-logs?id=...
    const id = url.searchParams.get("id");

    // List filters
    const q = (url.searchParams.get("q") ?? "").trim();
    const level = (url.searchParams.get("level") ?? "").trim(); // debug|info|success|warning|error
    const route = (url.searchParams.get("route") ?? "").trim();
    const method = (url.searchParams.get("method") ?? "").trim();
    const statusCodeStr = (url.searchParams.get("statusCode") ?? "").trim();
    const source = (url.searchParams.get("source") ?? "").trim();

    const userId = (url.searchParams.get("userId") ?? "").trim();
    const sessionId = (url.searchParams.get("sessionId") ?? "").trim();
    const requestId = (url.searchParams.get("requestId") ?? "").trim();
    const traceId = (url.searchParams.get("traceId") ?? "").trim();

    const limit = Math.min(200, Math.max(1, asInt(url.searchParams.get("limit"), 25)));
    const offset = Math.max(0, asInt(url.searchParams.get("offset"), 0));

    const supabase = await supabaseServer();

    /* ============================================================================
    🔐 ADMIN GUARD (copié de ton pattern)
    ============================================================================ */

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

    /* ============================================================================
    🧾 HANDLERS
    ============================================================================ */

    try {
        // -------------------------
        // Detail mode
        // -------------------------
        if (id) {
            const { data, error } = await supabase
                .from("system_logs")
                .select("*")
                .eq("id", id)
                .maybeSingle();

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

            return NextResponse.json({ row: data ?? null }, { status: 200 });
        }

        // -------------------------
        // List mode
        // -------------------------
        let query = supabase
            .from("system_logs")
            .select(
                `
                id, created_at, level, message,
                request_id, trace_id, route, method, status_code, duration_ms,
                session_id, user_id, chapter_id, adventure_id, chapter_quest_id, adventure_quest_id,
                source, file, line, function_name,
                error_name, error_message,
                metadata
            `,
                { count: "exact" }
            )
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (q) {
            // recherche multi-colonnes (message/route/source/function/error_message)
            // attention: `or()` utilise une string séparée par des virgules
            const escaped = q.replace(/,/g, " ");
            query = query.or(
                [
                    `message.ilike.%${escaped}%`,
                    `route.ilike.%${escaped}%`,
                    `source.ilike.%${escaped}%`,
                    `function_name.ilike.%${escaped}%`,
                    `error_message.ilike.%${escaped}%`,
                ].join(",")
            );
        }

        if (level && level !== "all") query = query.eq("level", level);
        if (route) query = query.ilike("route", `%${route}%`);
        if (method) query = query.eq("method", method.toUpperCase());
        if (source) query = query.ilike("source", `%${source}%`);

        if (statusCodeStr) {
            const sc = Number(statusCodeStr);
            if (Number.isFinite(sc)) query = query.eq("status_code", sc);
        }

        if (userId) query = query.eq("user_id", userId);
        if (sessionId) query = query.eq("session_id", sessionId);
        if (requestId) query = query.eq("request_id", requestId);
        if (traceId) query = query.eq("trace_id", traceId);

        const { data, error, count } = await query;

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json(
            {
                rows: Array.isArray(data) ? data : [],
                count: typeof count === "number" ? count : null,
            },
            { status: 200 }
        );
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    }
}
