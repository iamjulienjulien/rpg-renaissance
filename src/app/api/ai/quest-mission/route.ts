// src/app/api/ai/quest-mission/route.ts
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
POST /api/ai/quest-mission
============================================================================ */
export async function POST(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/ai/quest-mission";
    const method = "POST";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("POST /api/ai/quest-mission", {
                source: "app/api/ai/quest-mission/route.ts",
            });

            try {
                Log.info("ai.quest_mission.start");

                /* ------------------------------------------------------------
                 1) Body parsing
                ------------------------------------------------------------ */
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    Log.warning("ai.quest_mission.invalid_json", { status_code: 400 });
                    t.endError("ai.quest_mission.invalid_json", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Invalid JSON body", 400);
                }

                const chapter_quest_id = safeTrim(body?.chapter_quest_id);
                const user_id = safeTrim(body?.user_id);
                const force = !!body?.force;

                if (!chapter_quest_id || !user_id) {
                    Log.warning("ai.quest_mission.missing_params", {
                        status_code: 400,
                        metadata: {
                            chapter_quest_id: !!chapter_quest_id,
                            user_id: !!user_id,
                        },
                    });
                    t.endError("ai.quest_mission.bad_request", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Missing chapter_quest_id or user_id", 400);
                }

                patchRequestContext({
                    user_id,
                    chapter_quest_id,
                });

                /* ------------------------------------------------------------
                 2) Enqueue AI job
                ------------------------------------------------------------ */
                const { jobId } = await enqueueAiJobServer({
                    user_id,
                    job_type: "quest_mission",
                    payload: {
                        chapter_quest_id,
                        user_id,
                        force,
                    },
                    priority: 50,
                    max_attempts: 3,
                });

                Log.success("ai.quest_mission.enqueued", {
                    status_code: 202,
                    metadata: {
                        job_id: jobId,
                        chapter_quest_id,
                        user_id,
                        force,
                    },
                });

                t.endSuccess("ai.quest_mission.success", { status_code: 202 });

                return NextResponse.json(
                    {
                        jobId,
                        status: "queued",
                    },
                    { status: 202 }
                );
            } catch (e: any) {
                Log.error("ai.quest_mission.fatal", e, { status_code: 500 });
                t.endError("ai.quest_mission.fatal", e, { status_code: 500 });
                return jsonError(e?.message ?? "Server error", 500);
            }
        }
    );
}
