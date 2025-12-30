import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";
import { generateStoryForChapter } from "@/lib/story/generateChapterStory";

// ✅ System logs + request context
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

/* ============================================================================
GET /api/chapter-story?chapterId=uuid
============================================================================ */
export async function GET(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/chapter-story";
    const method = "GET";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("GET /api/chapter-story", {
                source: "app/api/chapter-story/route.ts",
            });

            try {
                Log.info("chapter_story.GET.start", {
                    metadata: {
                        url: req.nextUrl?.toString?.() ?? null,
                        search: Object.fromEntries(req.nextUrl.searchParams.entries()),
                    },
                });

                const supabase = await supabaseServer();
                const session = await getActiveSessionOrThrow();
                patchRequestContext({ session_id: session.id });

                Log.debug("chapter_story.GET.session.ok", {
                    metadata: { session_id: session.id },
                });

                const chapterId = (req.nextUrl.searchParams.get("chapterId") ?? "").trim();
                if (!chapterId) {
                    Log.warning("chapter_story.GET.missing.chapterId", {
                        status_code: 400,
                    });
                    t.endError("GET /api/chapter-story.bad_request", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Missing chapterId", 400);
                }

                patchRequestContext({ chapter_id: chapterId });

                const q0 = Date.now();
                const { data, error } = await supabase
                    .from("chapter_stories")
                    .select(
                        "chapter_id, session_id, story_json, story_md, model, updated_at, created_at"
                    )
                    .eq("chapter_id", chapterId)
                    .eq("session_id", session.id)
                    .maybeSingle();

                if (error) {
                    Log.error("chapter_story.GET.select.error", error, {
                        status_code: 500,
                        metadata: { ms: msSince(q0), chapter_id: chapterId },
                    });
                    t.endError("GET /api/chapter-story.select_failed", error, {
                        status_code: 500,
                    });
                    return jsonError(error.message, 500);
                }

                Log.success("chapter_story.GET.ok", {
                    status_code: 200,
                    metadata: {
                        ms: msSince(q0),
                        found: !!data,
                        has_story_md: !!data?.story_md,
                        model: data?.model ?? null,
                    },
                });

                t.endSuccess("GET /api/chapter-story.success", { status_code: 200 });

                return NextResponse.json({ story: data ?? null });
            } catch (e) {
                Log.error("chapter_story.GET.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                t.endError("GET /api/chapter-story.fatal", e, { status_code: 500 });
                return jsonError("Server error", 500);
            }
        }
    );
}

/* ============================================================================
POST /api/chapter-story
============================================================================ */
export async function POST(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/chapter-story";
    const method = "POST";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("POST /api/chapter-story", {
                source: "app/api/chapter-story/route.ts",
            });

            try {
                Log.info("chapter_story.POST.start", {
                    metadata: {
                        url: req.nextUrl?.toString?.() ?? null,
                        content_type: req.headers.get("content-type"),
                    },
                });

                const supabase = await supabaseServer();
                const session = await getActiveSessionOrThrow();
                patchRequestContext({ session_id: session.id });

                Log.debug("chapter_story.POST.session.ok", {
                    metadata: { session_id: session.id },
                });

                const url = new URL(req.url);
                const force = url.searchParams.get("force") === "true";

                let body: any;
                try {
                    body = await req.json();
                } catch {
                    Log.warning("chapter_story.POST.invalid_json", {
                        status_code: 400,
                    });
                    t.endError("POST /api/chapter-story.invalid_json", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Invalid JSON body", 400);
                }

                const chapterId = typeof body?.chapterId === "string" ? body.chapterId.trim() : "";
                if (!chapterId) {
                    Log.warning("chapter_story.POST.missing.chapterId", {
                        status_code: 400,
                    });
                    t.endError("POST /api/chapter-story.bad_request", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Missing chapterId", 400);
                }

                patchRequestContext({ chapter_id: chapterId });

                // Vérifier appartenance du chapitre à la session
                const q0 = Date.now();
                const { data: ch, error: chErr } = await supabase
                    .from("chapters")
                    .select("id, session_id")
                    .eq("id", chapterId)
                    .maybeSingle();

                if (chErr) {
                    Log.error("chapter_story.POST.chapter.select.error", chErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q0), chapter_id: chapterId },
                    });
                    t.endError("POST /api/chapter-story.chapter_select_failed", chErr, {
                        status_code: 500,
                    });
                    return jsonError(chErr.message, 500);
                }

                if (!ch) {
                    Log.warning("chapter_story.POST.chapter.not_found", {
                        status_code: 404,
                        metadata: { chapter_id: chapterId },
                    });
                    t.endError("POST /api/chapter-story.chapter_not_found", undefined, {
                        status_code: 404,
                    });
                    return jsonError("Chapter not found", 404);
                }

                if (ch.session_id !== session.id) {
                    Log.warning("chapter_story.POST.forbidden", {
                        status_code: 403,
                        metadata: {
                            chapter_id: chapterId,
                            session_id: session.id,
                            chapter_session_id: ch.session_id,
                        },
                    });
                    t.endError("POST /api/chapter-story.forbidden", undefined, {
                        status_code: 403,
                    });
                    return jsonError("Forbidden", 403);
                }

                Log.debug("chapter_story.POST.chapter.ok", {
                    metadata: {
                        ms: msSince(q0),
                        chapter_id: chapterId,
                        force,
                    },
                });

                // Génération / récupération
                const g0 = Date.now();
                const result = await generateStoryForChapter(chapterId, force);

                Log.success("chapter_story.POST.generate.ok", {
                    status_code: 200,
                    metadata: {
                        ms: msSince(g0),
                        cached: result.cached,
                        has_story_md: !!result.story?.story_md,
                        model: result.story?.model ?? null,
                    },
                });

                t.endSuccess("POST /api/chapter-story.success", { status_code: 200 });

                return NextResponse.json({
                    story: result.story,
                    cached: result.cached,
                });
            } catch (e: any) {
                Log.error("chapter_story.POST.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                t.endError("POST /api/chapter-story.fatal", e, { status_code: 500 });
                return jsonError(e?.message ?? "Generation failed", 500);
            }
        }
    );
}
