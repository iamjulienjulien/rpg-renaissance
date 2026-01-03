// src/app/api/ai/worker/run/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { qstashPublishJSON } from "@/lib/qstash/publish";

import { generateBriefingForAdventureId } from "@/lib/briefing/generateBriefing";

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

function nowIso() {
    return new Date().toISOString();
}

function backoffSeconds(attempt: number) {
    // attempt=1 -> 15s, 2 -> 60s, 3 -> 180s...
    const table = [15, 60, 180, 600, 1800];
    return table[Math.max(0, Math.min(table.length - 1, attempt - 1))];
}

async function claimJob(supabase: Awaited<ReturnType<typeof supabaseAdmin>>, jobId: string) {
    const workerId = `worker:${process.env.NEXT_PUBLIC_APP_URL ?? "local"}`;

    // Claim only if queued (and not cancelled)
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

    if (error) throw new Error(error.message);
    return (data ?? null) as AiJobRow | null;
}

async function markDone(
    supabase: Awaited<ReturnType<typeof supabaseAdmin>>,
    jobId: string,
    result: any
) {
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

    if (error) throw new Error(error.message);
}

async function markErrorAndMaybeRetry(
    supabase: Awaited<ReturnType<typeof supabaseAdmin>>,
    job: AiJobRow,
    err: unknown
) {
    const message = err instanceof Error ? err.message : String(err);
    const nextAttempts = (job.attempts ?? 0) + 1;
    const maxAttempts = job.max_attempts ?? 3;

    if (nextAttempts < maxAttempts) {
        // Requeue (status queued) + attempts++
        const { error } = await supabase
            .from("ai_jobs")
            .update({
                status: "queued",
                attempts: nextAttempts,
                error_message: message,
                locked_at: null,
                locked_by: null,
                // on garde started_at (première tentative) ou on peut le remettre à null, selon préférence
                updated_at: nowIso(),
            })
            .eq("id", job.id);

        if (error) throw new Error(error.message);

        // Republier QStash pour retry
        const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/worker/run`;
        await qstashPublishJSON({
            url: workerUrl,
            deduplicationId: `${job.id}:retry:${nextAttempts}`, // dedup unique par tentative
            body: { jobId: job.id, workerSecret: process.env.WORKER_SECRET },
        });

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

    // Erreur finale
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

    if (error) throw new Error(error.message);

    return NextResponse.json(
        { ok: false, status: "error", attempts: nextAttempts, retried: false },
        { status: 200 }
    );
}

/** Branche ici tes handlers */
async function executeJob(job: AiJobRow) {
    const supabase = await supabaseAdmin();
    switch (job.job_type) {
        case "quest_photo_message": {
            // TODO: impl
            // return { ...jsonResult }
            return { ok: true, job_type: job.job_type };
        }
        case "adventure_briefing": {
            const adventureId = (job.payload as any)?.adventure_id ?? job.adventure_id ?? null;

            if (!adventureId) {
                throw new Error("Missing payload.adventure_id");
            }

            const result = await generateBriefingForAdventureId(adventureId);

            const { error: saveErr } = await supabase
                .from("adventures")
                .update({
                    briefing_text: result.briefing, // jsonb
                    created_at: undefined, // ne touche pas
                } as any)
                .eq("id", adventureId);

            if (saveErr) {
                throw new Error("Failed to save adventures.briefing_text: " + saveErr.message);
            }

            return {
                adventure_id: adventureId,
                briefing: result.briefing,
                meta: result.meta,
            };
        }

        default:
            throw new Error(`Unknown job_type: ${job.job_type}`);
    }
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const jobId = body?.jobId as string | undefined;
    const secret = body?.workerSecret as string | undefined;

    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    if (!process.env.WORKER_SECRET || secret !== process.env.WORKER_SECRET) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await supabaseAdmin();

    // Claim
    const job = await claimJob(supabase, jobId);

    // Si pas claimable: déjà pris / déjà traité / cancelled / etc.
    if (!job) {
        return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
    }

    // Exécuter
    try {
        const result = await executeJob(job);
        await markDone(supabase, job.id, result);
        return NextResponse.json({ ok: true, jobId: job.id, status: "done" }, { status: 200 });
    } catch (err) {
        return await markErrorAndMaybeRetry(supabase, job, err);
    }
}
