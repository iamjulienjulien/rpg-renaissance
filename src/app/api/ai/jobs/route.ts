// src/app/api/ai/jobs/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// ✅ logs
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function safeTrim(x: unknown) {
    return typeof x === "string" ? x.trim() : "";
}

/* ============================================================================
GET /api/ai/jobs
- Auth required
- Retourne les jobs de l'utilisateur connecté
- Query params:
  - status=queued|running|done|error|cancelled (optionnel)
  - job_type=welcome_message|quest_mission|... (optionnel)
  - limit=number (optionnel, défaut 50, max 200)
============================================================================ */
export async function GET(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/ai/jobs";
    const method = "GET";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("GET /api/ai/jobs", {
                source: "app/api/ai/jobs/route.ts",
            });

            try {
                Log.info("ai_jobs.list.start", {
                    metadata: { url: req.nextUrl?.toString?.() ?? null },
                });

                const supabase = await supabaseServer();

                /* ------------------------------------------------------------
                 1) Auth
                ------------------------------------------------------------ */
                const { data: auth, error: authErr } = await supabase.auth.getUser();
                if (authErr || !auth?.user?.id) {
                    Log.warning("ai_jobs.list.unauthenticated", { status_code: 401 });
                    t.endError("ai_jobs.list.unauthenticated", authErr, { status_code: 401 });
                    return jsonError("Not authenticated", 401);
                }

                const user_id = auth.user.id;
                patchRequestContext({ user_id });

                /* ------------------------------------------------------------
                 2) Query params
                ------------------------------------------------------------ */
                const status = safeTrim(req.nextUrl.searchParams.get("status"));
                const job_type = safeTrim(req.nextUrl.searchParams.get("job_type"));

                const limitRaw = safeTrim(req.nextUrl.searchParams.get("limit"));
                const limitParsed = Number(limitRaw || 50);
                const limit = Number.isFinite(limitParsed)
                    ? Math.max(1, Math.min(200, limitParsed))
                    : 50;

                Log.debug("ai_jobs.list.params", {
                    metadata: {
                        status: status || null,
                        job_type: job_type || null,
                        limit,
                    },
                });

                /* ------------------------------------------------------------
                 3) Query
                ------------------------------------------------------------ */
                let q = supabase
                    .from("ai_jobs")
                    .select(
                        `
                        id,
                        user_id,
                        session_id,
                        chapter_id,
                        adventure_id,
                        chapter_quest_id,
                        job_type,
                        payload,
                        status,
                        priority,
                        attempts,
                        max_attempts,
                        locked_at,
                        locked_by,
                        started_at,
                        finished_at,
                        result,
                        error_message,
                        created_at,
                        updated_at
                    `
                    )
                    .eq("user_id", user_id)
                    .order("created_at", { ascending: false })
                    .limit(limit);

                if (status) q = q.eq("status", status);
                if (job_type) q = q.eq("job_type", job_type);

                const q0 = Date.now();
                const { data, error } = await q;

                if (error) {
                    Log.error("ai_jobs.list.select.error", error, {
                        status_code: 500,
                        metadata: { ms: Math.max(0, Date.now() - q0) },
                    });
                    t.endError("ai_jobs.list.select_failed", error, { status_code: 500 });
                    return jsonError(error.message, 500);
                }

                Log.success("ai_jobs.list.ok", {
                    status_code: 200,
                    metadata: {
                        count: (data ?? []).length,
                        status: status || "any",
                        job_type: job_type || "any",
                    },
                });

                t.endSuccess("ai_jobs.list.success", { status_code: 200 });

                return NextResponse.json(
                    {
                        items: data ?? [],
                    },
                    { status: 200 }
                );
            } catch (e: any) {
                Log.error("ai_jobs.list.fatal", e, { status_code: 500 });
                t.endError("ai_jobs.list.fatal", e, { status_code: 500 });
                return jsonError(e?.message ?? "Server error", 500);
            }
        }
    );
}
