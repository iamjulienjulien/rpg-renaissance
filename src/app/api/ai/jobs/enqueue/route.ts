// src/app/api/ai/jobs/enqueue/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enqueueAiJobAuthenticated } from "@/lib/aiJobs/enqueueAiJob";

import { Log } from "@/lib/systemLog/Log";
import { withRequestContext } from "@/lib/systemLog/requestContext";

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

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
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    t.endError("ai_jobs.enqueue.invalid_json", undefined, { status_code: 400 });
                    return jsonError("Invalid JSON body", 400);
                }

                // Guards “métier” ici si tu veux, ou dans un helper
                if ((body?.job_type ?? "") === "adventure_briefing") {
                    const advId = body?.payload?.adventure_id ?? body?.adventure_id;
                    if (!advId) return jsonError("Missing payload.adventure_id", 400);
                    body.payload = { adventure_id: advId }; // user_id sera injecté via auth
                }

                const { jobId } = await enqueueAiJobAuthenticated({
                    job_type: body.job_type ?? "adventure_briefing",
                    payload: body.payload ?? {},
                    session_id: body.session_id ?? null,
                    chapter_id: body.chapter_id ?? null,
                    adventure_id: body.adventure_id ?? null,
                    chapter_quest_id: body.chapter_quest_id ?? null,
                    priority: body.priority ?? 50,
                    max_attempts: body.max_attempts ?? 3,
                });

                t.endSuccess("ai_jobs.enqueue.success", { status_code: 202 });
                return NextResponse.json({ jobId }, { status: 202 });
            } catch (e: any) {
                Log.error("ai_jobs.enqueue.fatal", e, { status_code: 500 });
                t.endError("ai_jobs.enqueue.fatal", e, { status_code: 500 });
                return jsonError(e?.message ?? "Server error", 500);
            }
        }
    );
}
