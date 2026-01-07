// src/app/api/ai/avatar/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enqueueAiJobServer } from "@/lib/aiJobs/enqueueAiJob";

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

function safeBool(x: unknown): boolean {
    return x === true;
}

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
    return typeof value === "string" && (allowed as readonly string[]).includes(value);
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
                const photos = Array.isArray(body?.photos) ? body.photos : [];

                if (!user_id || photos.length === 0) {
                    Log.warning("ai.avatar.missing_params", {
                        status_code: 400,
                        metadata: {
                            user_id: !!user_id,
                            photos_count: photos.length,
                        },
                    });
                    t.endError("ai.avatar.bad_request", undefined, { status_code: 400 });
                    return jsonError("Missing user_id or photos", 400);
                }

                patchRequestContext({ user_id });

                /* ------------------------------------------------------------
                 2) Normalize options
                ------------------------------------------------------------ */
                const opt = body?.options ?? {};

                const format = isOneOf(opt.format, ["square", "portrait"] as const)
                    ? opt.format
                    : "square";

                const vibe = isOneOf(opt.vibe, ["knight", "ranger", "mage", "dark"] as const)
                    ? opt.vibe
                    : "knight";

                const background = isOneOf(opt.background, [
                    "studio",
                    "forest",
                    "castle",
                    "battlefield",
                ] as const)
                    ? opt.background
                    : "studio";

                const accessory = isOneOf(opt.accessory, [
                    "none",
                    "hood",
                    "helm",
                    "crown",
                    "pauldron",
                ] as const)
                    ? opt.accessory
                    : "none";

                const faithfulness = isOneOf(opt.faithfulness, [
                    "faithful",
                    "balanced",
                    "stylized",
                ] as const)
                    ? opt.faithfulness
                    : "balanced";

                const notes = safeTrim(opt?.notes) || null;

                /* ------------------------------------------------------------
                 3) Enqueue AI job (QStash)
                ------------------------------------------------------------ */
                const { jobId } = await enqueueAiJobServer({
                    user_id,
                    job_type: "player_avatar",
                    payload: {
                        user_id,
                        photos: photos.map((p: any) => ({
                            photo_id: safeTrim(p?.photo_id),
                        })),

                        options: {
                            format,
                            vibe,
                            background,
                            accessory,
                            faithfulness,

                            dramatic_light: safeBool(opt?.dramatic_light),
                            battle_scars: safeBool(opt?.battle_scars),
                            glow_eyes: safeBool(opt?.glow_eyes),

                            notes,
                        },
                    },
                    priority: 40, // avatar = important mais pas critique gameplay
                    max_attempts: 2,
                });

                Log.success("ai.avatar.enqueued", {
                    status_code: 202,
                    metadata: {
                        job_id: jobId,
                        user_id,
                        photos: photos.length,
                        vibe,
                        format,
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
