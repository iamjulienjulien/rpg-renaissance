// src/app/api/ai/quest-congrat/route.ts
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
POST /api/ai/quest-congrat
============================================================================ */
export async function POST(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/ai/quest-congrat";
    const method = "POST";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("POST /api/ai/quest-congrat", {
                source: "app/api/ai/quest-congrat/route.ts",
            });

            try {
                Log.info("ai.quest_congrat.start");

                /* ------------------------------------------------------------
                 1) Body parsing
                ------------------------------------------------------------ */
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    Log.warning("ai.quest_congrat.invalid_json", { status_code: 400 });
                    t.endError("ai.quest_congrat.invalid_json", undefined, { status_code: 400 });
                    return jsonError("Invalid JSON body", 400);
                }

                const chapter_quest_id = safeTrim(body?.chapter_quest_id);
                const user_id = safeTrim(body?.user_id);

                if (!chapter_quest_id || !user_id) {
                    Log.warning("ai.quest_congrat.missing_params", {
                        status_code: 400,
                        metadata: {
                            chapter_quest_id: !!chapter_quest_id,
                            user_id: !!user_id,
                        },
                    });
                    t.endError("ai.quest_congrat.bad_request", undefined, { status_code: 400 });
                    return jsonError("Missing chapter_quest_id or user_id", 400);
                }

                patchRequestContext({ user_id, chapter_quest_id });

                /* ------------------------------------------------------------
                 2) Enqueue AI job
                ------------------------------------------------------------ */
                const { jobId } = await enqueueAiJobServer({
                    user_id,
                    job_type: "quest_congrat",
                    payload: {
                        chapter_quest_id,
                        user_id,
                    },
                    priority: 60,
                    max_attempts: 3,
                });

                Log.success("ai.quest_congrat.enqueued", {
                    status_code: 202,
                    metadata: {
                        job_id: jobId,
                        chapter_quest_id,
                        user_id,
                    },
                });

                t.endSuccess("ai.quest_congrat.success", { status_code: 202 });

                return NextResponse.json(
                    {
                        jobId,
                        status: "queued",
                    },
                    { status: 202 }
                );
            } catch (e: any) {
                Log.error("ai.quest_congrat.fatal", e, { status_code: 500 });
                t.endError("ai.quest_congrat.fatal", e, { status_code: 500 });
                return jsonError(e?.message ?? "Server error", 500);
            }
        }
    );
}
