// src/lib/aiJobs/enqueueAiJob.ts
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { qstashPublishJSON } from "@/lib/qstash/publish";
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

export type AiJobType =
    | "adventure_briefing"
    | "welcome_message"
    | "chapter_story"
    | "mission_order"
    | string;

export type EnqueueAiJobInput = {
    job_type: AiJobType;
    payload?: Record<string, any>;

    session_id?: string | null;
    chapter_id?: string | null;
    adventure_id?: string | null;
    chapter_quest_id?: string | null;

    priority?: number;
    max_attempts?: number;
};

function buildWorkerUrl() {
    const base = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}`.trim();
    if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL");
    return base + "/api/ai/worker/run";
}

async function publishToQstash(jobId: string) {
    const workerUrl = buildWorkerUrl();

    const p0 = Date.now();
    await qstashPublishJSON({
        url: workerUrl,
        deduplicationId: jobId,
        body: { jobId, workerSecret: process.env.WORKER_SECRET },
    });

    Log.success("ai_jobs.qstash.ok", {
        status_code: 202,
        metadata: { ms: msSince(p0), worker_url: workerUrl, job_id: jobId },
    });
}

/**
 * ✅ À utiliser dans tes routes “utilisateur” (auth required)
 */
export async function enqueueAiJobAuthenticated(
    input: EnqueueAiJobInput
): Promise<{ jobId: string }> {
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user?.id) {
        Log.warning("ai_jobs.enqueue.auth.missing", { status_code: 401 });
        throw new Error("Not authenticated");
    }

    const userId = auth.user.id;
    patchRequestContext({ user_id: userId });

    const job = {
        user_id: userId,
        session_id: input.session_id ?? null,
        chapter_id: input.chapter_id ?? null,
        adventure_id: input.adventure_id ?? null,
        chapter_quest_id: input.chapter_quest_id ?? null,

        job_type: input.job_type ?? "adventure_briefing",
        priority: input.priority ?? 50,
        max_attempts: input.max_attempts ?? 3,
        payload: input.payload ?? {},
    };

    patchRequestContext({
        session_id: job.session_id ?? undefined,
        adventure_id: job.adventure_id ?? undefined,
        chapter_id: job.chapter_id ?? undefined,
        chapter_quest_id: job.chapter_quest_id ?? undefined,
    });

    const q0 = Date.now();
    const { data, error } = await supabase.from("ai_jobs").insert(job).select("id").single();
    if (error) {
        Log.error("ai_jobs.enqueue.insert.error", error, {
            status_code: 500,
            metadata: { ms: msSince(q0), job_type: job.job_type },
        });
        throw new Error(error.message);
    }

    const jobId = data.id as string;

    Log.success("ai_jobs.enqueue.insert.ok", {
        status_code: 201,
        metadata: { ms: msSince(q0), job_id: jobId, job_type: job.job_type },
    });

    await publishToQstash(jobId);

    return { jobId };
}

/**
 * ✅ À utiliser côté “serveur” (admin routes, worker, cron)
 * Ici tu fournis explicitement user_id (pas d’auth).
 */
export async function enqueueAiJobServer(args: { user_id: string } & EnqueueAiJobInput) {
    const supabase = await supabaseAdmin();

    const userId = (args.user_id ?? "").trim();
    if (!userId) throw new Error("Missing user_id");

    patchRequestContext({ user_id: userId });

    const job = {
        user_id: userId,
        session_id: args.session_id ?? null,
        chapter_id: args.chapter_id ?? null,
        adventure_id: args.adventure_id ?? null,
        chapter_quest_id: args.chapter_quest_id ?? null,

        job_type: args.job_type ?? "adventure_briefing",
        priority: args.priority ?? 50,
        max_attempts: args.max_attempts ?? 3,
        payload: args.payload ?? {},
    };

    const q0 = Date.now();
    const { data, error } = await supabase.from("ai_jobs").insert(job).select("id").single();
    if (error) {
        Log.error("ai_jobs.enqueue.server.insert.error", error, {
            status_code: 500,
            metadata: { ms: msSince(q0), job_type: job.job_type },
        });
        throw new Error(error.message);
    }

    const jobId = data.id as string;

    Log.success("ai_jobs.enqueue.server.insert.ok", {
        status_code: 201,
        metadata: { ms: msSince(q0), job_id: jobId, job_type: job.job_type },
    });

    await publishToQstash(jobId);

    return { jobId };
}
