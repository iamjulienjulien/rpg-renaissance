import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { qstashPublishJSON } from "@/lib/qstash/publish";
import { generateBriefingForAdventureId } from "@/lib/briefing/generateBriefing";
import { generateWelcomeMessage } from "@/lib/prompts/generateWelcomeMessage";
import { generateQuestMission } from "@/lib/prompts/generateQuestMission";
import { generateQuestEncouragement } from "@/lib/prompts/generateQuestEncouragement";
import { generateQuestPhotoMessage } from "@/lib/prompts/generateQuestPhotoMessage";

// ✅ System logs + request context
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";

type JobStatus = "queued" | "running" | "done" | "error" | "cancelled";

type AiJobRow = {
    id: string;
    user_id: string;

    session_id: string | null;
    chapter_id: string | null;
    adventure_id: string | null;
    chapter_quest_id: string | null;

    job_type: string;
    payload: any;

    status: JobStatus;
    priority: number;
    attempts: number;
    max_attempts: number;

    locked_at: string | null;
    locked_by: string | null;
    started_at: string | null;
    finished_at: string | null;

    result: any | null;
    error_message: string | null;

    created_at: string;
    updated_at: string;
};

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function nowIso() {
    return new Date().toISOString();
}

function backoffSeconds(attempt: number) {
    const table = [15, 60, 180, 600, 1800];
    return table[Math.max(0, Math.min(table.length - 1, attempt - 1))];
}

async function claimJob(supabase: Awaited<ReturnType<typeof supabaseAdmin>>, jobId: string) {
    const workerId = `worker:${process.env.NEXT_PUBLIC_APP_URL ?? "local"}`;

    const q0 = Date.now();
    const { data, error } = await supabase
        .from("ai_jobs")
        .update({
            status: "running",
            locked_at: nowIso(),
            locked_by: workerId,
            started_at: nowIso(),
            updated_at: nowIso(),
        })
        .eq("id", jobId)
        .eq("status", "queued")
        .select("*")
        .maybeSingle();

    if (error) {
        Log.error("ai_worker.claim.error", error, {
            status_code: 500,
            metadata: { ms: msSince(q0), job_id: jobId, worker_id: workerId },
        });
        throw new Error(error.message);
    }

    Log.debug("ai_worker.claim.result", {
        metadata: { ms: msSince(q0), job_id: jobId, claimed: !!data, worker_id: workerId },
    });

    return (data ?? null) as AiJobRow | null;
}

async function markDone(
    supabase: Awaited<ReturnType<typeof supabaseAdmin>>,
    jobId: string,
    result: any
) {
    const q0 = Date.now();
    const { error } = await supabase
        .from("ai_jobs")
        .update({
            status: "done",
            finished_at: nowIso(),
            locked_at: null,
            locked_by: null,
            result,
            error_message: null,
            updated_at: nowIso(),
        })
        .eq("id", jobId);

    if (error) {
        Log.error("ai_worker.mark_done.error", error, {
            status_code: 500,
            metadata: { ms: msSince(q0), job_id: jobId },
        });
        throw new Error(error.message);
    }

    Log.success("ai_worker.mark_done.ok", {
        status_code: 200,
        metadata: { ms: msSince(q0), job_id: jobId },
    });
}

async function markErrorAndMaybeRetry(
    supabase: Awaited<ReturnType<typeof supabaseAdmin>>,
    job: AiJobRow,
    err: unknown
) {
    const message = err instanceof Error ? err.message : String(err);
    const nextAttempts = (job.attempts ?? 0) + 1;
    const maxAttempts = job.max_attempts ?? 3;

    Log.warning("ai_worker.execute.error", {
        status_code: 500,
        metadata: {
            job_id: job.id,
            job_type: job.job_type,
            attempts_before: job.attempts ?? 0,
            attempts_after: nextAttempts,
            max_attempts: maxAttempts,
            error_message: message,
        },
    });

    if (nextAttempts < maxAttempts) {
        const q0 = Date.now();
        const { error } = await supabase
            .from("ai_jobs")
            .update({
                status: "queued",
                attempts: nextAttempts,
                error_message: message,
                locked_at: null,
                locked_by: null,
                updated_at: nowIso(),
            })
            .eq("id", job.id);

        if (error) {
            Log.error("ai_worker.retry.requeue.error", error, {
                status_code: 500,
                metadata: { ms: msSince(q0), job_id: job.id, next_attempts: nextAttempts },
            });
            throw new Error(error.message);
        }

        const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/worker/run`;

        try {
            await qstashPublishJSON({
                url: workerUrl,
                deduplicationId: `${job.id}:retry:${nextAttempts}`,
                body: { jobId: job.id, workerSecret: process.env.WORKER_SECRET },
            });

            Log.success("ai_worker.retry.qstash_republish.ok", {
                status_code: 202,
                metadata: {
                    job_id: job.id,
                    next_attempts: nextAttempts,
                    retry_in_seconds: backoffSeconds(nextAttempts),
                },
            });
        } catch (e: any) {
            Log.error("ai_worker.retry.qstash_republish.error", e, {
                status_code: 500,
                metadata: { job_id: job.id, next_attempts: nextAttempts },
            });
            // On ne throw pas ici forcément, mais c’est souvent mieux de remonter l’erreur
            // car sinon le job reste queued sans retry effectif.
            throw e;
        }

        return NextResponse.json(
            {
                ok: false,
                status: "queued",
                attempts: nextAttempts,
                retried: true,
                retry_in_seconds: backoffSeconds(nextAttempts),
            },
            { status: 202 }
        );
    }

    const q1 = Date.now();
    const { error } = await supabase
        .from("ai_jobs")
        .update({
            status: "error",
            attempts: nextAttempts,
            error_message: message,
            finished_at: nowIso(),
            locked_at: null,
            locked_by: null,
            updated_at: nowIso(),
        })
        .eq("id", job.id);

    if (error) {
        Log.error("ai_worker.final_error.save_failed", error, {
            status_code: 500,
            metadata: { ms: msSince(q1), job_id: job.id, attempts: nextAttempts },
        });
        throw new Error(error.message);
    }

    Log.warning("ai_worker.final_error.saved", {
        status_code: 200,
        metadata: { ms: msSince(q1), job_id: job.id, attempts: nextAttempts },
    });

    return NextResponse.json(
        { ok: false, status: "error", attempts: nextAttempts, retried: false },
        { status: 200 }
    );
}

async function executeJob(job: AiJobRow) {
    const supabase = await supabaseAdmin();

    Log.debug("ai_worker.execute.start", {
        metadata: {
            job_id: job.id,
            job_type: job.job_type,
            session_id: job.session_id,
            chapter_id: job.chapter_id,
            adventure_id: job.adventure_id,
            chapter_quest_id: job.chapter_quest_id,
            attempts: job.attempts,
            max_attempts: job.max_attempts,
            payload: job.payload,
        },
    });

    switch (job.job_type) {
        case "quest_photo_message": {
            return { ok: true, job_type: job.job_type };
        }

        case "adventure_briefing": {
            const adventureId = (job.payload as any)?.adventure_id ?? job.adventure_id ?? null;
            const userId = (job.payload as any)?.user_id ?? job.user_id ?? null;

            if (!adventureId) {
                Log.warning("ai_worker.execute.briefing.missing_adventure_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.adventure_id");
            }

            if (!userId) {
                Log.warning("ai_worker.execute.briefing.missing_user_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.user_id");
            }

            patchRequestContext({ adventure_id: adventureId });

            const g0 = Date.now();
            const result = await generateBriefingForAdventureId(adventureId, userId);

            Log.success("ai_worker.execute.briefing.generated", {
                status_code: 200,
                metadata: {
                    ms: msSince(g0),
                    job_id: job.id,
                    adventure_id: adventureId,
                    has_briefing: !!result?.briefing,
                    model: result?.meta?.model ?? null,
                },
            });

            const s0 = Date.now();
            const { error: saveErr } = await supabase
                .from("adventures")
                .update({
                    briefing_text: result.briefing,
                } as any)
                .eq("id", adventureId);

            if (saveErr) {
                Log.error("ai_worker.execute.briefing.save_failed", saveErr, {
                    status_code: 500,
                    metadata: { ms: msSince(s0), job_id: job.id, adventure_id: adventureId },
                });
                throw new Error("Failed to save adventures.briefing_text: " + saveErr.message);
            }

            Log.success("ai_worker.execute.briefing.saved", {
                status_code: 200,
                metadata: { ms: msSince(s0), job_id: job.id, adventure_id: adventureId },
            });

            return {
                adventure_id: adventureId,
                briefing: result.briefing,
                meta: result.meta,
            };
        }

        case "welcome_message": {
            const adventureId = (job.payload as any)?.adventure_id ?? job.adventure_id ?? null;
            const userId = (job.payload as any)?.user_id ?? job.user_id ?? null;

            if (!adventureId) {
                Log.warning("ai_worker.execute.welcome_message.missing_adventure_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.adventure_id");
            }

            if (!userId) {
                Log.warning("ai_worker.execute.welcome_message.missing_user_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.user_id");
            }

            patchRequestContext({ adventure_id: adventureId, user_id: userId });

            const g0 = Date.now();

            // ✅ La persistance en BDD est déjà gérée dans generateWelcomeMessage.ts
            // (welcome_text + createAiGenerationLog + createJournalEntry)
            const result = await generateWelcomeMessage({
                adventure_id: adventureId,
                user_id: userId,
            });

            Log.success("ai_worker.execute.welcome_message.generated", {
                status_code: 200,
                metadata: {
                    ms: msSince(g0),
                    job_id: job.id,
                    adventure_id: adventureId,
                    user_id: userId,
                    has_md: !!result?.welcome_text,
                },
            });

            return {
                adventure_id: adventureId,
                user_id: userId,
                welcome_md: result?.welcome_text ?? null,
            };
        }

        case "quest_mission": {
            const chapterQuestId =
                (job.payload as any)?.chapter_quest_id ?? job.chapter_quest_id ?? null;
            const userId = (job.payload as any)?.user_id ?? job.user_id ?? null;
            const force = !!((job.payload as any)?.force ?? false);

            if (!chapterQuestId) {
                Log.warning("ai_worker.execute.quest_mission.missing_chapter_quest_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.chapter_quest_id");
            }

            if (!userId) {
                Log.warning("ai_worker.execute.quest_mission.missing_user_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.user_id");
            }

            patchRequestContext({ user_id: userId, chapter_quest_id: chapterQuestId });

            const g0 = Date.now();

            // ✅ La persistance en BDD est gérée dans generateQuestMission.ts
            // (cache mission + createAiGenerationLog + createJournalEntry)
            const result = await generateQuestMission({
                chapter_quest_id: chapterQuestId,
                user_id: userId,
                force,
            });

            Log.success("ai_worker.execute.quest_mission.generated", {
                status_code: 200,
                metadata: {
                    ms: msSince(g0),
                    job_id: job.id,
                    chapter_quest_id: chapterQuestId,
                    user_id: userId,
                    cached: !!result?.cached,
                    // model: result?.meta?.model ?? null,
                    has_md: !!result?.mission_md,
                },
            });

            return {
                chapter_quest_id: chapterQuestId,
                user_id: userId,
                cached: !!result?.cached,
                mission_md: result?.mission_md ?? null,
                mission_json: result?.mission_json ?? null,
                // meta: result?.meta ?? null,
            };
        }

        case "quest_encouragement": {
            const chapterQuestId =
                (job.payload as any)?.chapter_quest_id ?? job.chapter_quest_id ?? null;
            const userId = (job.payload as any)?.user_id ?? job.user_id ?? null;

            if (!chapterQuestId) {
                Log.warning("ai_worker.execute.quest_encouragement.missing_chapter_quest_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.chapter_quest_id");
            }

            if (!userId) {
                Log.warning("ai_worker.execute.quest_encouragement.missing_user_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.user_id");
            }

            patchRequestContext({ user_id: userId, chapter_quest_id: chapterQuestId });

            const g0 = Date.now();

            // ✅ La persistance en BDD est gérée dans generateQuestEncouragement.ts
            // (thread + quest_messages + createAiGenerationLog + createJournalEntry)
            const result = await generateQuestEncouragement({
                chapter_quest_id: chapterQuestId,
                user_id: userId,
            });

            Log.success("ai_worker.execute.quest_encouragement.generated", {
                status_code: 200,
                metadata: {
                    ms: msSince(g0),
                    job_id: job.id,
                    chapter_quest_id: chapterQuestId,
                    user_id: userId,
                    has_title: !!(result as any)?.title,
                    has_message: !!(result as any)?.message,
                },
            });

            return {
                chapter_quest_id: chapterQuestId,
                user_id: userId,
                title: (result as any)?.title ?? null,
                message: (result as any)?.message ?? null,
            };
        }

        case "quest_photo_message": {
            const chapterQuestId =
                (job.payload as any)?.chapter_quest_id ?? job.chapter_quest_id ?? null;
            const userId = (job.payload as any)?.user_id ?? job.user_id ?? null;

            const photoId = (job.payload as any)?.photo_id ?? null;
            const photoCategory = (job.payload as any)?.photo_category ?? "other";
            const photoCaption = (job.payload as any)?.photo_caption ?? null;
            const photoSignedUrl = (job.payload as any)?.photo_signed_url ?? null;

            if (!chapterQuestId) {
                Log.warning("ai_worker.execute.quest_photo_message.missing_chapter_quest_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.chapter_quest_id");
            }

            if (!userId) {
                Log.warning("ai_worker.execute.quest_photo_message.missing_user_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.user_id");
            }

            if (!photoId) {
                Log.warning("ai_worker.execute.quest_photo_message.missing_photo_id", {
                    status_code: 400,
                    metadata: { job_id: job.id, has_payload: !!job.payload },
                });
                throw new Error("Missing payload.photo_id");
            }

            if (!photoSignedUrl) {
                Log.warning("ai_worker.execute.quest_photo_message.missing_photo_signed_url", {
                    status_code: 400,
                    metadata: {
                        job_id: job.id,
                        photo_id: photoId,
                        has_payload: !!job.payload,
                    },
                });
                throw new Error("Missing payload.photo_signed_url");
            }

            patchRequestContext({
                user_id: userId,
                chapter_quest_id: chapterQuestId,
                photo_id: photoId,
            } as any);

            const g0 = Date.now();

            // ✅ La persistance est gérée dans generateQuestPhotoMessage.ts
            // (thread + quest_messages + createAiGenerationLog + createJournalEntry + update photos.ai_description)
            const result = await generateQuestPhotoMessage({
                chapter_quest_id: chapterQuestId,
                user_id: userId,
                photo_id: photoId,
                photo_category: photoCategory,
                photo_caption: photoCaption,
                photo_signed_url: photoSignedUrl,
                // optionnel (si tu le passes dans le payload, utile pour la cohérence)
                // force: !!(job.payload as any)?.force,
            });

            Log.success("ai_worker.execute.quest_photo_message.generated", {
                status_code: 200,
                metadata: {
                    ms: msSince(g0),
                    job_id: job.id,
                    chapter_quest_id: chapterQuestId,
                    user_id: userId,
                    photo_id: photoId,
                    photo_category: photoCategory,
                    has_title: !!(result as any)?.photo_message_json?.title,
                    has_description: !!(result as any)?.photo_message_json?.description,
                    has_message: !!(result as any)?.photo_message_json?.message,
                },
            });

            return {
                chapter_quest_id: chapterQuestId,
                user_id: userId,
                photo_id: photoId,
                photo_category: photoCategory,
                title: (result as any)?.photo_message_json?.title ?? null,
                description: (result as any)?.photo_message_json?.description ?? null,
                message: (result as any)?.photo_message_json?.message ?? null,
            };
        }

        default: {
            Log.warning("ai_worker.execute.unknown_job_type", {
                status_code: 400,
                metadata: { job_id: job.id, job_type: job.job_type },
            });
            throw new Error(`Unknown job_type: ${job.job_type}`);
        }
    }
}

export async function POST(req: Request) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/ai/worker/run";
    const method = "POST";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("POST /api/ai/worker/run", {
                source: "app/api/ai/worker/run/route.ts",
            });

            try {
                Log.info("ai_worker.POST.start", {
                    metadata: {
                        content_type: req.headers.get("content-type"),
                        // utile si tu veux vérifier que QStash arrive bien
                        upstash_signature_present: !!req.headers.get("upstash-signature"),
                        user_agent: req.headers.get("user-agent"),
                    },
                });

                let body: any = null;
                try {
                    body = await req.json();
                } catch {
                    Log.warning("ai_worker.POST.invalid_json", { status_code: 400 });
                    t.endError("POST /api/ai/worker/run.invalid_json", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Invalid JSON body", 400);
                }

                const jobId = typeof body?.jobId === "string" ? body.jobId.trim() : "";
                const secret = typeof body?.workerSecret === "string" ? body.workerSecret : "";

                // patchRequestContext({ job_id: jobId || null });

                Log.debug("ai_worker.POST.body", {
                    metadata: {
                        has_job_id: !!jobId,
                        has_worker_secret: !!secret,
                        env_has_worker_secret: !!process.env.WORKER_SECRET,
                        // jamais logger les secrets, uniquement la comparaison booléenne
                        secret_matches:
                            !!process.env.WORKER_SECRET && !!secret
                                ? secret === process.env.WORKER_SECRET
                                : false,
                    },
                });

                if (!jobId) {
                    Log.warning("ai_worker.POST.missing_jobId", { status_code: 400 });
                    t.endError("POST /api/ai/worker/run.missing_jobId", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Missing jobId", 400);
                }

                if (!process.env.WORKER_SECRET || secret !== process.env.WORKER_SECRET) {
                    Log.warning("ai_worker.POST.forbidden", {
                        status_code: 403,
                        metadata: {
                            job_id: jobId,
                            env_has_worker_secret: !!process.env.WORKER_SECRET,
                            has_worker_secret: !!secret,
                        },
                    });
                    t.endError("POST /api/ai/worker/run.forbidden", undefined, {
                        status_code: 403,
                    });
                    return jsonError("Forbidden", 403);
                }

                const supabase = await supabaseAdmin();

                const job = await claimJob(supabase, jobId);

                if (!job) {
                    Log.success("ai_worker.POST.skipped", {
                        status_code: 200,
                        metadata: { job_id: jobId, reason: "not_claimable" },
                    });
                    t.endSuccess("POST /api/ai/worker/run.skipped", { status_code: 200 });
                    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
                }

                patchRequestContext({
                    user_id: job.user_id,
                    session_id: job.session_id,
                    chapter_id: job.chapter_id,
                    adventure_id: job.adventure_id,
                });

                try {
                    const x0 = Date.now();
                    const result = await executeJob(job);
                    await markDone(supabase, job.id, result);

                    Log.success("ai_worker.POST.done", {
                        status_code: 200,
                        metadata: { ms: msSince(x0), job_id: job.id, job_type: job.job_type },
                    });

                    t.endSuccess("POST /api/ai/worker/run.success", { status_code: 200 });

                    return NextResponse.json(
                        { ok: true, jobId: job.id, status: "done" },
                        { status: 200 }
                    );
                } catch (err) {
                    Log.error("ai_worker.POST.execute_failed", err, {
                        status_code: 500,
                        metadata: { job_id: job.id, job_type: job.job_type },
                    });

                    const resp = await markErrorAndMaybeRetry(supabase, job, err);
                    t.endSuccess("POST /api/ai/worker/run.error_handled", {
                        status_code: (resp as any)?.status ?? 200,
                    });
                    return resp;
                }
            } catch (e: any) {
                Log.error("ai_worker.POST.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                t.endError("POST /api/ai/worker/run.fatal", e, { status_code: 500 });
                return jsonError(e?.message ?? "Server error", 500);
            }
        }
    );
}
