// src/app/api/ai/welcome-message/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enqueueAiJobServer } from "@/lib/aiJobs/enqueueAiJob";

// ✅ System logs + request context
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

/* ============================================================================
POST /api/ai/welcome-message
============================================================================ */
export async function POST(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/ai/welcome-message";
    const method = "POST";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("POST /api/ai/welcome-message", {
                source: "app/api/ai/welcome-message/route.ts",
            });

            try {
                Log.info("ai.welcome_message.start");

                /* ------------------------------------------------------------
                 1) Body parsing
                ------------------------------------------------------------ */
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    Log.warning("ai.welcome_message.invalid_json", { status_code: 400 });
                    t.endError("ai.welcome_message.invalid_json", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Invalid JSON body", 400);
                }

                const adventure_id = safeTrim(body?.adventure_id);
                const user_id = safeTrim(body?.user_id);

                if (!adventure_id || !user_id) {
                    Log.warning("ai.welcome_message.missing_params", {
                        status_code: 400,
                        metadata: {
                            adventure_id: !!adventure_id,
                            user_id: !!user_id,
                        },
                    });
                    t.endError("ai.welcome_message.bad_request", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Missing adventure_id or user_id", 400);
                }

                patchRequestContext({
                    adventure_id,
                    user_id,
                });

                /* ------------------------------------------------------------
                 2) Enqueue AI job
                ------------------------------------------------------------ */
                const { jobId } = await enqueueAiJobServer({
                    user_id,
                    adventure_id,
                    job_type: "welcome_message",
                    payload: {
                        adventure_id,
                        user_id,
                    },
                    priority: 40,
                    max_attempts: 3,
                });

                Log.success("ai.welcome_message.enqueued", {
                    status_code: 202,
                    metadata: {
                        job_id: jobId,
                        adventure_id,
                        user_id,
                    },
                });

                t.endSuccess("ai.welcome_message.success", { status_code: 202 });

                return NextResponse.json(
                    {
                        jobId,
                        status: "queued",
                    },
                    { status: 202 }
                );
            } catch (e: any) {
                Log.error("ai.welcome_message.fatal", e, { status_code: 500 });
                t.endError("ai.welcome_message.fatal", e, { status_code: 500 });
                return jsonError(e?.message ?? "Server error", 500);
            }
        }
    );
}
