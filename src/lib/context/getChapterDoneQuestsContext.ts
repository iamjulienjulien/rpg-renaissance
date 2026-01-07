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

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function toIsoOrNull(x: unknown): string | null {
    if (!x) return null;
    const d = new Date(x as any);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/** best-effort completion timestamp */
function pickCompletedAt(row: any): string | null {
    return toIsoOrNull(row.updated_at) ?? toIsoOrNull(row.created_at);
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type ChapterDoneQuestsContextMode = "authenticated" | "server";

export type ChapterDoneQuestContextItem = {
    chapter_quest_id: string;
    quest_title: string;
    room_code: string | null;
    difficulty: number | null;
    estimate_min: number | null;
    completed_at: string | null;
    order_hint: number;
};

export type ChapterDoneQuestsContextResult = ChapterDoneQuestContextItem[] | null;

type AuthenticatedArgs = {
    mode: "authenticated";
    chapter_id?: string | null;
};

type ServerArgs = {
    mode: "server";
    chapter_id: string;
};

export type GetChapterDoneQuestsContextArgs = AuthenticatedArgs | ServerArgs;

/* ============================================================================
🧠 MAIN
============================================================================ */

export async function getChapterDoneQuestsContext(
    args: GetChapterDoneQuestsContextArgs
): Promise<ChapterDoneQuestsContextResult> {
    const startedAt = Date.now();
    const t = Log.timer("getChapterDoneQuestsContext", {
        source: "lib/ai/context/getChapterDoneQuestsContext.ts",
    });

    try {
        Log.debug("chapter_done_quests.start", {
            metadata: {
                mode: args.mode,
                chapter_id: "chapter_id" in args ? (args.chapter_id ?? null) : null,
            },
        });

        /* ------------------------------------------------------------
         resolve mode
        ------------------------------------------------------------ */

        if (args.mode === "server") {
            const chapterId = safeTrim(args.chapter_id);
            if (!chapterId) {
                Log.warning("chapter_done_quests.server.missing_chapter_id", {
                    status_code: 400,
                });
                t.endError("chapter_done_quests.server.bad_request", undefined, {
                    status_code: 400,
                });
                throw new Error("getChapterDoneQuestsContext(server): chapter_id is required");
            }

            patchRequestContext({ chapter_id: chapterId });

            const supabase = supabaseAdmin();

            const q0 = Date.now();
            const { data, error } = await supabase
                .from("chapter_quests")
                .select(
                    `
                    id,
                    status,
                    created_at,
                    updated_at,
                    adventure_quests (
                        title,
                        room_code,
                        difficulty,
                        estimate_min
                    )
                `
                )
                .eq("chapter_id", chapterId)
                .eq("status", "done");

            if (error) {
                Log.error("chapter_done_quests.server.select.error", error, {
                    status_code: 500,
                    metadata: { ms: msSince(q0), chapter_id: chapterId },
                });
                t.endError("chapter_done_quests.server.select_failed", error, {
                    status_code: 500,
                });
                throw new Error(error.message);
            }

            const rows = (data ?? [])
                .slice()
                .sort((a: any, b: any) => {
                    const ta = new Date(pickCompletedAt(a) ?? 0).getTime();
                    const tb = new Date(pickCompletedAt(b) ?? 0).getTime();
                    return ta - tb;
                })
                .map((r: any, idx: number) => ({
                    chapter_quest_id: r.id,
                    quest_title: safeTrim(r.adventure_quests?.title) || "Quête",
                    room_code: r.adventure_quests?.room_code ?? null,
                    difficulty: r.adventure_quests?.difficulty ?? null,
                    estimate_min: r.adventure_quests?.estimate_min ?? null,
                    completed_at: pickCompletedAt(r),
                    order_hint: idx,
                }));

            Log.success("chapter_done_quests.server.ok", {
                status_code: 200,
                metadata: {
                    ms: msSince(q0),
                    chapter_id: chapterId,
                    count: rows.length,
                },
            });

            t.endSuccess("chapter_done_quests.server.success", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });

            return rows;
        }

        /* ------------------------------------------------------------
         authenticated mode
        ------------------------------------------------------------ */

        const supabase = await supabaseServer();
        const session = await getActiveSessionOrThrow();

        patchRequestContext({ session_id: session.id });

        const chapterId = safeTrim(args.chapter_id);

        if (!chapterId) {
            Log.warning("chapter_done_quests.auth.missing_chapter_id", {
                status_code: 400,
                metadata: { session_id: session.id },
            });
            t.endError("chapter_done_quests.auth.bad_request", undefined, {
                status_code: 400,
            });
            throw new Error("getChapterDoneQuestsContext(authenticated): chapter_id required");
        }

        patchRequestContext({ chapter_id: chapterId });

        const q0 = Date.now();
        const { data, error } = await supabase
            .from("chapter_quests")
            .select(
                `
                id,
                status,
                created_at,
                updated_at,
                adventure_quests (
                    title,
                    room_code,
                    difficulty,
                    estimate_min
                )
            `
            )
            .eq("chapter_id", chapterId)
            .eq("session_id", session.id)
            .eq("status", "done");

        if (error) {
            Log.error("chapter_done_quests.auth.select.error", error, {
                status_code: 500,
                metadata: { ms: msSince(q0), chapter_id: chapterId, session_id: session.id },
            });
            t.endError("chapter_done_quests.auth.select_failed", error, {
                status_code: 500,
            });
            throw new Error(error.message);
        }

        const rows = (data ?? [])
            .slice()
            .sort((a: any, b: any) => {
                const ta = new Date(pickCompletedAt(a) ?? 0).getTime();
                const tb = new Date(pickCompletedAt(b) ?? 0).getTime();
                return ta - tb;
            })
            .map((r: any, idx: number) => ({
                chapter_quest_id: r.id,
                quest_title: safeTrim(r.adventure_quests?.title) || "Quête",
                room_code: r.adventure_quests?.room_code ?? null,
                difficulty: r.adventure_quests?.difficulty ?? null,
                estimate_min: r.adventure_quests?.estimate_min ?? null,
                completed_at: pickCompletedAt(r),
                order_hint: idx,
            }));

        Log.success("chapter_done_quests.auth.ok", {
            status_code: 200,
            metadata: {
                ms: msSince(q0),
                chapter_id: chapterId,
                session_id: session.id,
                count: rows.length,
            },
        });

        t.endSuccess("chapter_done_quests.auth.success", {
            status_code: 200,
            metadata: { duration_ms: msSince(startedAt) },
        });

        return rows;
    } catch (e) {
        Log.error("chapter_done_quests.fatal", e, {
            status_code: 500,
            metadata: { duration_ms: msSince(startedAt) },
        });
        t.endError("chapter_done_quests.fatal", e, { status_code: 500 });
        throw e;
    }
}
