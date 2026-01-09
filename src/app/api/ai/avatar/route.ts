// src/app/api/ai/avatar/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enqueueAiJobServer } from "@/lib/aiJobs/enqueueAiJob";

// ✅ Single source of truth for options (JSON + helpers)
import {
    normalizeAvatarOptions,
    type PlayerAvatarOptions,
} from "@/lib/avatar/avatarOptionsHelpers";

// Logs & request context
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
POST /api/ai/avatar
============================================================================ */

export async function POST(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/ai/avatar";
    const method = "POST";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("POST /api/ai/avatar", {
                source: "app/api/ai/avatar/route.ts",
            });

            try {
                Log.info("ai.avatar.start");

                /* ------------------------------------------------------------
                 1) Body parsing
                ------------------------------------------------------------ */
                let body: any;
                try {
                    body = await req.json();
                } catch {
                    Log.warning("ai.avatar.invalid_json", { status_code: 400 });
                    t.endError("ai.avatar.invalid_json", undefined, { status_code: 400 });
                    return jsonError("Invalid JSON body", 400);
                }

                const user_id = safeTrim(body?.user_id);
                const photosRaw = Array.isArray(body?.photo_ids) ? body.photo_ids : [];

                // sanitize photo_ids (trim + keep only non-empty strings)
                const photo_ids = photosRaw
                    .map((p: any) => safeTrim(p))
                    .filter((p: string) => p.length > 0)
                    .slice(0, 5);

                if (!user_id || photo_ids.length === 0) {
                    Log.warning("ai.avatar.missing_params", {
                        status_code: 400,
                        metadata: {
                            user_id: !!user_id,
                            photos_count: photo_ids.length,
                        },
                    });
                    t.endError("ai.avatar.bad_request", undefined, { status_code: 400 });
                    return jsonError("Missing user_id or photos", 400);
                }

                patchRequestContext({ user_id });

                /* ------------------------------------------------------------
                 2) Normalize options (✅ via JSON helpers)
                ------------------------------------------------------------ */
                const normalized: PlayerAvatarOptions = normalizeAvatarOptions(body?.options ?? {});

                /* ------------------------------------------------------------
                 3) Enqueue AI job (QStash)
                ------------------------------------------------------------ */
                const { jobId } = await enqueueAiJobServer({
                    user_id,
                    job_type: "player_avatar",
                    payload: {
                        user_id,
                        photos: photo_ids.map((photo_id: string) => ({ photo_id })),

                        // IMPORTANT:
                        // We send exactly what the rest of the pipeline expects.
                        // normalized keys are: format, vibe, background, accessory, faithfulness,
                        // + dramatic_light, battle_scars, glow_eyes, notes
                        options: normalized,
                    },
                    priority: 40, // avatar = important mais pas critique gameplay
                    max_attempts: 2,
                });

                Log.success("ai.avatar.enqueued", {
                    status_code: 202,
                    metadata: {
                        job_id: jobId,
                        user_id,
                        photos: photo_ids.length,
                        vibe: normalized.vibe,
                        format: normalized.format,
                    },
                });

                t.endSuccess("ai.avatar.success", { status_code: 202 });

                return NextResponse.json(
                    {
                        jobId,
                        status: "queued",
                    },
                    { status: 202 }
                );
            } catch (e: any) {
                Log.error("ai.avatar.fatal", e, { status_code: 500 });
                t.endError("ai.avatar.fatal", e, { status_code: 500 });
                return jsonError(e?.message ?? "Server error", 500);
            }
        }
    );
}
