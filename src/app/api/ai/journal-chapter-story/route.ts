// src/app/api/ai/journal-chapter-story/route.ts
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
POST /api/ai/journal-chapter-story
============================================================================ */
export async function POST(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/ai/journal-chapter-story";
    const method = "POST";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("POST /api/ai/journal-chapter-story", {
                source: "app/api/ai/journal-chapter-story/route.ts",
            });

            try {
                Log.info("ai.journal_chapter_story.start");

                /* ------------------------------------------------------------
                 1) Body parsing
                ------------------------------------------------------------ */
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    Log.warning("ai.journal_chapter_story.invalid_json", {
                        status_code: 400,
                    });
                    t.endError("ai.journal_chapter_story.invalid_json", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Invalid JSON body", 400);
                }

                const chapter_id = safeTrim(body?.chapter_id);
                const user_id = safeTrim(body?.user_id);
                const force = !!body?.force;

                if (!chapter_id || !user_id) {
                    Log.warning("ai.journal_chapter_story.missing_params", {
                        status_code: 400,
                        metadata: {
                            chapter_id: !!chapter_id,
                            user_id: !!user_id,
                        },
                    });
                    t.endError("ai.journal_chapter_story.bad_request", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Missing chapter_id or user_id", 400);
                }

                patchRequestContext({
                    user_id,
                    chapter_id,
                });

                /* ------------------------------------------------------------
                 2) Enqueue AI job
                ------------------------------------------------------------ */
                const { jobId } = await enqueueAiJobServer({
                    user_id,
                    job_type: "journal_chapter_story",
                    payload: {
                        chapter_id,
                        user_id,
                        force,
                    },
                    priority: 55, // entre mission et encouragement
                    max_attempts: 3,
                });

                Log.success("ai.journal_chapter_story.enqueued", {
                    status_code: 202,
                    metadata: {
                        job_id: jobId,
                        chapter_id,
                        user_id,
                        force,
                    },
                });

                t.endSuccess("ai.journal_chapter_story.success", {
                    status_code: 202,
                });

                return NextResponse.json(
                    {
                        jobId,
                        status: "queued",
                    },
                    { status: 202 }
                );
            } catch (e: any) {
                Log.error("ai.journal_chapter_story.fatal", e, {
                    status_code: 500,
                });
                t.endError("ai.journal_chapter_story.fatal", e, {
                    status_code: 500,
                });
                return jsonError(e?.message ?? "Server error", 500);
            }
        }
    );
}
