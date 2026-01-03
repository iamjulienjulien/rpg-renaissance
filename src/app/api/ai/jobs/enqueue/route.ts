// src/app/api/ai/jobs/enqueue/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { qstashPublishJSON } from "@/lib/qstash/publish";

// ✅ System logs + request context
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

/* ============================================================================
POST /api/ai/jobs/enqueue
============================================================================ */
export async function POST(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/ai/jobs/enqueue";
    const method = "POST";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("POST /api/ai/jobs/enqueue", {
                source: "app/api/ai/jobs/enqueue/route.ts",
            });

            try {
                Log.info("ai_jobs.enqueue.start", {
                    metadata: {
                        url: req.nextUrl?.toString?.() ?? null,
                        content_type: req.headers.get("content-type"),
                    },
                });

                const supabase = await supabaseServer();

                /* ------------------------------------------------------------
                 1) Auth
                ------------------------------------------------------------ */
                const { data: auth, error: authErr } = await supabase.auth.getUser();
                if (authErr || !auth?.user?.id) {
                    Log.warning("ai_jobs.enqueue.unauthenticated", {
                        status_code: 401,
                    });
                    t.endError("ai_jobs.enqueue.unauthenticated", authErr, {
                        status_code: 401,
                    });
                    return jsonError("Not authenticated", 401);
                }

                const userId = auth.user.id;
                patchRequestContext({ user_id: userId });

                Log.debug("ai_jobs.enqueue.auth.ok", {
                    metadata: { user_id: userId },
                });

                /* ------------------------------------------------------------
                 2) Body parsing
                ------------------------------------------------------------ */
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    Log.warning("ai_jobs.enqueue.invalid_json", {
                        status_code: 400,
                    });
                    t.endError("ai_jobs.enqueue.invalid_json", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Invalid JSON body", 400);
                }

                /* ------------------------------------------------------------
                 3) Build job
                ------------------------------------------------------------ */
                const job = {
                    user_id: userId,
                    session_id: body.session_id ?? null,
                    chapter_id: body.chapter_id ?? null,
                    adventure_id: body.adventure_id ?? null,
                    chapter_quest_id: body.chapter_quest_id ?? null,

                    job_type: body.job_type ?? "adventure_briefing",
                    priority: body.priority ?? 50,
                    max_attempts: body.max_attempts ?? 3,
                    payload: body.payload ?? {},
                };

                patchRequestContext({
                    session_id: job.session_id ?? undefined,
                    adventure_id: job.adventure_id ?? undefined,
                    chapter_id: job.chapter_id ?? undefined,
                });

                /* ------------------------------------------------------------
                 4) Guards métier
                ------------------------------------------------------------ */
                if (job.job_type === "adventure_briefing") {
                    const advId = (job.payload as any)?.adventure_id ?? job.adventure_id;
                    if (!advId) {
                        Log.warning("ai_jobs.enqueue.missing_adventure_id", {
                            status_code: 400,
                        });
                        t.endError("ai_jobs.enqueue.bad_request", undefined, {
                            status_code: 400,
                        });
                        return jsonError("Missing payload.adventure_id", 400);
                    }
                    job.adventure_id = advId;
                    job.payload = { adventure_id: advId };
                }

                Log.debug("ai_jobs.enqueue.job.built", {
                    metadata: {
                        job_type: job.job_type,
                        priority: job.priority,
                        max_attempts: job.max_attempts,
                    },
                });

                /* ------------------------------------------------------------
                 5) Insert job
                ------------------------------------------------------------ */
                const q0 = Date.now();
                const { data, error } = await supabase
                    .from("ai_jobs")
                    .insert(job)
                    .select("id")
                    .single();

                if (error) {
                    Log.error("ai_jobs.enqueue.insert.error", error, {
                        status_code: 500,
                        metadata: { ms: msSince(q0) },
                    });
                    t.endError("ai_jobs.enqueue.insert_failed", error, {
                        status_code: 500,
                    });
                    return jsonError(error.message, 500);
                }

                const jobId = data.id as string;
                // patchRequestContext({ job_id: jobId });

                Log.success("ai_jobs.enqueue.insert.ok", {
                    status_code: 201,
                    metadata: {
                        ms: msSince(q0),
                        job_id: jobId,
                    },
                });

                /* ------------------------------------------------------------
                 6) QStash publish
                ------------------------------------------------------------ */
                const workerUrl =
                    `${process.env.NEXT_PUBLIC_APP_URL}`.trim() + "/api/ai/worker/run";

                Log.debug("ai_jobs.enqueue.qstash.debug", {
                    metadata: {
                        worker_url: workerUrl,
                    },
                });

                const p0 = Date.now();
                await qstashPublishJSON({
                    url: workerUrl,
                    deduplicationId: jobId,
                    body: {
                        jobId,
                        workerSecret: process.env.WORKER_SECRET,
                    },
                });

                Log.success("ai_jobs.enqueue.qstash.ok", {
                    status_code: 202,
                    metadata: {
                        ms: msSince(p0),
                        worker_url: workerUrl,
                    },
                });

                t.endSuccess("ai_jobs.enqueue.success", { status_code: 202 });

                return NextResponse.json({ jobId }, { status: 202 });
            } catch (e: any) {
                Log.error("ai_jobs.enqueue.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                t.endError("ai_jobs.enqueue.fatal", e, { status_code: 500 });
                return jsonError(e?.message ?? "Server error", 500);
            }
        }
    );
}
