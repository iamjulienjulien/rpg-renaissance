// src/app/api/ai/jobs/enqueue/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { qstashPublishJSON } from "@/lib/qstash/publish";

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user?.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();

    // Exemple: job de photo quest message
    const job = {
        user_id: auth.user.id,
        session_id: body.session_id ?? null,
        chapter_quest_id: body.chapter_quest_id ?? null,
        job_type: body.job_type ?? "quest_photo_message",
        priority: body.priority ?? 50,
        payload: body.payload ?? {},
    };

    const { data, error } = await supabase.from("ai_jobs").insert(job).select("id").single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const jobId = data.id as string;

    // ⚠️ URL publique du worker
    const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/worker/run`;

    // Push immédiat
    await qstashPublishJSON({
        url: workerUrl,
        deduplicationId: jobId,
        body: {
            jobId,
            // petit secret simple (ou vérif signature QStash si tu veux faire “propre”)
            workerSecret: process.env.WORKER_SECRET,
        },
    });

    return NextResponse.json({ jobId }, { status: 202 });
}
