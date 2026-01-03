// src/lib/ai/context/getChapterContext.ts
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

// ✅ logs
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

export type ChapterContextMode = "authenticated" | "server";

export type ChapterContextResult = {
    chapter_title: string | null;
    chapter_context: string | null;
} | null;

type AuthenticatedArgs = {
    mode: "authenticated";
    /** optionnel: chapitre ciblé */
    chapter_id?: string | null;
};

type ServerArgs = {
    mode: "server";
    /** requis en mode server */
    chapter_id: string;
};

export type GetChapterContextArgs = AuthenticatedArgs | ServerArgs;

/* ============================================================================
🧠 MAIN
============================================================================ */

export async function getChapterContext(
    args: GetChapterContextArgs
): Promise<ChapterContextResult> {
    const startedAt = Date.now();
    const t = Log.timer("getChapterContext", { source: "lib/ai/context/getChapterContext.ts" });

    try {
        Log.debug("chapter_context.start", {
            metadata: {
                mode: args.mode,
                chapter_id: "chapter_id" in args ? (args.chapter_id ?? null) : null,
            },
        });

        // ------------------------------------------------------------
        // resolve chapter id (mode dependent)
        // ------------------------------------------------------------
        if (args.mode === "server") {
            const chapterId = (args.chapter_id ?? "").trim();
            if (!chapterId) {
                Log.warning("chapter_context.server.missing_chapter_id", { status_code: 400 });
                t.endError("getChapterContext.server.bad_request", undefined, { status_code: 400 });
                throw new Error("getChapterContext(server): chapter_id is required");
            }

            patchRequestContext({ chapter_id: chapterId });

            const supabase = supabaseAdmin();

            const q0 = Date.now();
            const { data, error } = await supabase
                .from("chapters")
                .select("id,title,context_text")
                .eq("id", chapterId)
                .maybeSingle();

            if (error) {
                Log.error("chapter_context.server.select.error", error, {
                    status_code: 500,
                    metadata: { ms: msSince(q0), chapter_id: chapterId },
                });
                t.endError("getChapterContext.server.select_failed", error, { status_code: 500 });
                throw new Error(error.message);
            }

            if (!data) {
                Log.warning("chapter_context.server.not_found", {
                    status_code: 404,
                    metadata: { ms: msSince(q0), chapter_id: chapterId },
                });
                t.endSuccess("getChapterContext.server.not_found", {
                    status_code: 200,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                return null;
            }

            Log.success("chapter_context.server.ok", {
                status_code: 200,
                metadata: {
                    ms: msSince(q0),
                    chapter_id: data.id,
                    has_context: !!data.context_text,
                },
            });

            t.endSuccess("getChapterContext.server.success", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });

            return {
                chapter_title: (data.title ?? null) as string | null,
                chapter_context: (data.context_text ?? null) as string | null,
            };
        }

        // ------------------------------------------------------------
        // authenticated mode:
        // - if chapter_id provided: fetch it within active session
        // - else: pick the oldest active chapter for the active session
        // ------------------------------------------------------------
        const supabase = await supabaseServer();

        const session = await getActiveSessionOrThrow();
        patchRequestContext({ session_id: session.id });

        const forcedId = (args.chapter_id ?? "").trim();

        if (forcedId) {
            patchRequestContext({ chapter_id: forcedId });

            const q0 = Date.now();
            const { data, error } = await supabase
                .from("chapters")
                .select("id,title,context_text,session_id,status,created_at")
                .eq("id", forcedId)
                .eq("session_id", session.id)
                .maybeSingle();

            if (error) {
                Log.error("chapter_context.auth.select_by_id.error", error, {
                    status_code: 500,
                    metadata: { ms: msSince(q0), chapter_id: forcedId, session_id: session.id },
                });
                t.endError("getChapterContext.auth.select_by_id_failed", error, {
                    status_code: 500,
                });
                throw new Error(error.message);
            }

            if (!data) {
                Log.warning("chapter_context.auth.select_by_id.not_found", {
                    status_code: 404,
                    metadata: { ms: msSince(q0), chapter_id: forcedId, session_id: session.id },
                });
                t.endSuccess("getChapterContext.auth.not_found", {
                    status_code: 200,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                return null;
            }

            Log.success("chapter_context.auth.ok", {
                status_code: 200,
                metadata: {
                    ms: msSince(q0),
                    chapter_id: data.id,
                    has_context: !!data.context_text,
                },
            });

            t.endSuccess("getChapterContext.auth.success", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });

            return {
                chapter_title: (data.title ?? null) as string | null,
                chapter_context: (data.context_text ?? null) as string | null,
            };
        }

        // no chapter_id => pick oldest "active" chapter of session
        const q1 = Date.now();
        const { data: ch, error: chErr } = await supabase
            .from("chapters")
            .select("id,title,context_text,created_at")
            .eq("session_id", session.id)
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (chErr) {
            Log.error("chapter_context.auth.select_first_active.error", chErr, {
                status_code: 500,
                metadata: { ms: msSince(q1), session_id: session.id },
            });
            t.endError("getChapterContext.auth.select_first_active_failed", chErr, {
                status_code: 500,
            });
            throw new Error(chErr.message);
        }

        if (!ch) {
            Log.warning("chapter_context.auth.no_active_chapter", {
                status_code: 200,
                metadata: { ms: msSince(q1), session_id: session.id },
            });
            t.endSuccess("getChapterContext.auth.no_active_chapter", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });
            return null;
        }

        patchRequestContext({ chapter_id: ch.id });

        Log.success("chapter_context.auth.first_active.ok", {
            status_code: 200,
            metadata: {
                ms: msSince(q1),
                chapter_id: ch.id,
                has_context: !!ch.context_text,
            },
        });

        t.endSuccess("getChapterContext.auth.success", {
            status_code: 200,
            metadata: { duration_ms: msSince(startedAt) },
        });

        return {
            chapter_title: (ch.title ?? null) as string | null,
            chapter_context: (ch.context_text ?? null) as string | null,
        };
    } catch (e) {
        Log.error("chapter_context.fatal", e, {
            status_code: 500,
            metadata: { duration_ms: msSince(startedAt) },
        });
        t.endError("getChapterContext.fatal", e, { status_code: 500 });
        throw e;
    }
}
