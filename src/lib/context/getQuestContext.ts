// src/lib/ai/context/getQuestContext.ts
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

// ✅ logs
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";
import { questStatusLabel } from "@/helpers/questStatus";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type QuestContextMode = "authenticated" | "server";

export type QuestContextResult = {
    chapter_quest_id: string;
    quest_status: string | null;

    adventure_quest_id: string;
    quest_title: string | null;
    quest_description: string | null;
    quest_room: string | null;

    // ✅ NEW
    mission_md: string | null;
} | null;

type AuthenticatedArgs = {
    mode: "authenticated";
    chapter_quest_id: string;
};

type ServerArgs = {
    mode: "server";
    chapter_quest_id: string;
};

export type GetQuestContextArgs = AuthenticatedArgs | ServerArgs;

/* ============================================================================
🧠 MAIN
============================================================================ */

export async function getQuestContext(args: GetQuestContextArgs): Promise<QuestContextResult> {
    const startedAt = Date.now();
    const t = Log.timer("getQuestContext", { source: "lib/ai/context/getQuestContext.ts" });

    try {
        const chapterQuestId = safeTrim(args.chapter_quest_id);

        Log.debug("quest_context.start", {
            metadata: {
                mode: args.mode,
                chapter_quest_id: chapterQuestId || null,
            },
        });

        if (!chapterQuestId) {
            Log.warning("quest_context.missing.chapter_quest_id", { status_code: 400 });
            t.endError("getQuestContext.bad_request", undefined, { status_code: 400 });
            throw new Error("getQuestContext: chapter_quest_id is required");
        }

        patchRequestContext({ chapter_quest_id: chapterQuestId });

        /* ============================================================
         MODE: server (admin)
        ============================================================ */
        if (args.mode === "server") {
            const supabase = supabaseAdmin();

            const q0 = Date.now();
            const { data: cq, error: cqErr } = await supabase
                .from("chapter_quests")
                .select("id,status,adventure_quest_id,chapter_id,session_id")
                .eq("id", chapterQuestId)
                .maybeSingle();

            if (cqErr) {
                Log.error("quest_context.server.chapter_quests.select.error", cqErr, {
                    status_code: 500,
                    metadata: { ms: msSince(q0), chapter_quest_id: chapterQuestId },
                });
                t.endError("getQuestContext.server.chapter_quests_select_failed", cqErr, {
                    status_code: 500,
                });
                throw new Error(cqErr.message);
            }

            if (!cq) {
                Log.warning("quest_context.server.chapter_quests.not_found", {
                    status_code: 404,
                    metadata: { ms: msSince(q0), chapter_quest_id: chapterQuestId },
                });
                t.endSuccess("getQuestContext.server.not_found", {
                    status_code: 200,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                return null;
            }

            const session_id = (cq as any)?.session_id ?? null;

            // patch context (best-effort)
            patchRequestContext({
                session_id: session_id ?? undefined,
                chapter_id: (cq as any)?.chapter_id ?? undefined,
            });

            const adventureQuestId = safeTrim((cq as any)?.adventure_quest_id);
            if (!adventureQuestId) {
                Log.warning("quest_context.server.missing.adventure_quest_id", {
                    status_code: 500,
                    metadata: { chapter_quest_id: chapterQuestId },
                });
                t.endError("getQuestContext.server.missing_adventure_quest_id", undefined, {
                    status_code: 500,
                });
                throw new Error(
                    "getQuestContext(server): missing adventure_quest_id on chapter_quests"
                );
            }

            patchRequestContext({ adventure_quest_id: adventureQuestId });

            const q1 = Date.now();
            const { data: aq, error: aqErr } = await supabase
                .from("adventure_quests")
                .select("id,title,description,adventure_id,room_code")
                .eq("id", adventureQuestId)
                .maybeSingle();

            if (aqErr) {
                Log.error("quest_context.server.adventure_quests.select.error", aqErr, {
                    status_code: 500,
                    metadata: { ms: msSince(q1), adventure_quest_id: adventureQuestId },
                });
                t.endError("getQuestContext.server.adventure_quests_select_failed", aqErr, {
                    status_code: 500,
                });
                throw new Error(aqErr.message);
            }

            if (!aq) {
                Log.warning("quest_context.server.adventure_quests.not_found", {
                    status_code: 404,
                    metadata: { ms: msSince(q1), adventure_quest_id: adventureQuestId },
                });
                t.endSuccess("getQuestContext.server.partial_not_found", {
                    status_code: 200,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                return null;
            }

            const adventure_id = (aq as any)?.adventure_id ?? null;

            /* ------------------------------------------------------------
             ✅ NEW: mission_md depuis cache quest_mission_orders (best-effort)
             - scope session_id si dispo
            ------------------------------------------------------------ */
            let mission_md: string | null = null;

            if (session_id) {
                try {
                    const m0 = Date.now();
                    const { data: cachedMission, error: mErr } = await supabase
                        .from("quest_mission_orders")
                        .select("mission_md, session_id")
                        .eq("chapter_quest_id", chapterQuestId)
                        .eq("session_id", session_id)
                        .maybeSingle();

                    if (mErr) {
                        Log.debug("quest_context.server.mission_hint.not_available", {
                            metadata: { ms: msSince(m0), reason: mErr.message },
                        });
                    } else {
                        const md = safeTrim((cachedMission as any)?.mission_md);
                        mission_md = md.length ? md : null;
                    }
                } catch {
                    // ignore
                }
            }

            let roomTitle = null;
            if (session_id && adventure_id) {
                try {
                    const r0 = Date.now();
                    const { data: roomsData, error: roomsError } = await supabase
                        .from("adventure_rooms")
                        .select("code, title")
                        .eq("adventure_id", adventure_id)
                        .eq("session_id", session_id) // ✅ multi-partie
                        .order("sort", { ascending: true })
                        .order("title", { ascending: true });

                    if (roomsError) {
                        Log.debug("quest_context.server.rooms.not_available", {
                            metadata: { ms: msSince(r0), reason: roomsError.message },
                        });
                    } else {
                        roomTitle =
                            roomsData.filter((r) => r.code === aq.room_code)[0]?.title ?? null;
                    }
                } catch {
                    // ignore
                }
            }

            Log.success("quest_context.server.ok", {
                status_code: 200,
                metadata: {
                    ms_chapter_quest: msSince(q0),
                    ms_adventure_quest: msSince(q1),
                    chapter_quest_id: chapterQuestId,
                    adventure_quest_id: adventureQuestId,
                    has_title: !!aq.title,
                    has_description: !!aq.description,
                    has_mission_md: !!mission_md,
                },
            });

            t.endSuccess("getQuestContext.server.success", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });

            return {
                chapter_quest_id: chapterQuestId,
                quest_status: (cq as any)?.status ? questStatusLabel(cq.status) : null,
                quest_room: roomTitle,

                adventure_quest_id: adventureQuestId,
                quest_title: (aq as any)?.title ?? null,
                quest_description: (aq as any)?.description ?? null,

                mission_md,
            };
        }

        /* ============================================================
         MODE: authenticated (server client + active session guard)
        ============================================================ */
        const supabase = await supabaseServer();

        const session = await getActiveSessionOrThrow();
        patchRequestContext({ session_id: session.id });

        const session_id = session.id;

        // 1) load chapter_quest (scoped to session)
        const q0 = Date.now();
        const { data: cq, error: cqErr } = await supabase
            .from("chapter_quests")
            .select("id,status,adventure_quest_id,chapter_id,session_id")
            .eq("id", chapterQuestId)
            .eq("session_id", session.id)
            .maybeSingle();

        if (cqErr) {
            Log.error("quest_context.auth.chapter_quests.select.error", cqErr, {
                status_code: 500,
                metadata: {
                    ms: msSince(q0),
                    chapter_quest_id: chapterQuestId,
                    session_id: session.id,
                },
            });
            t.endError("getQuestContext.auth.chapter_quests_select_failed", cqErr, {
                status_code: 500,
            });
            throw new Error(cqErr.message);
        }

        if (!cq) {
            Log.warning("quest_context.auth.chapter_quests.not_found", {
                status_code: 404,
                metadata: {
                    ms: msSince(q0),
                    chapter_quest_id: chapterQuestId,
                    session_id: session.id,
                },
            });
            t.endSuccess("getQuestContext.auth.not_found", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });
            return null;
        }

        patchRequestContext({
            chapter_id: (cq as any)?.chapter_id ?? undefined,
        });

        const adventureQuestId = safeTrim((cq as any)?.adventure_quest_id);
        if (!adventureQuestId) {
            Log.warning("quest_context.auth.missing.adventure_quest_id", {
                status_code: 500,
                metadata: { chapter_quest_id: chapterQuestId, session_id: session.id },
            });
            t.endError("getQuestContext.auth.missing_adventure_quest_id", undefined, {
                status_code: 500,
            });
            throw new Error(
                "getQuestContext(authenticated): missing adventure_quest_id on chapter_quests"
            );
        }

        patchRequestContext({ adventure_quest_id: adventureQuestId });

        // 2) load adventure_quest (scoped to session)
        const q1 = Date.now();
        const { data: aq, error: aqErr } = await supabase
            .from("adventure_quests")
            .select("id,title,description,session_id,room_code,adventure_id")
            .eq("id", adventureQuestId)
            .eq("session_id", session.id)
            .maybeSingle();

        if (aqErr) {
            Log.error("quest_context.auth.adventure_quests.select.error", aqErr, {
                status_code: 500,
                metadata: {
                    ms: msSince(q1),
                    adventure_quest_id: adventureQuestId,
                    session_id: session.id,
                },
            });
            t.endError("getQuestContext.auth.adventure_quests_select_failed", aqErr, {
                status_code: 500,
            });
            throw new Error(aqErr.message);
        }

        if (!aq) {
            Log.warning("quest_context.auth.adventure_quests.not_found", {
                status_code: 404,
                metadata: {
                    ms: msSince(q1),
                    adventure_quest_id: adventureQuestId,
                    session_id: session.id,
                },
            });
            t.endSuccess("getQuestContext.auth.partial_not_found", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });
            return null;
        }

        const adventure_id = (aq as any)?.adventure_id ?? null;

        /* ------------------------------------------------------------
         ✅ NEW: mission_md depuis cache quest_mission_orders (best-effort)
        ------------------------------------------------------------ */
        let mission_md: string | null = null;

        try {
            const m0 = Date.now();
            const { data: cachedMission, error: mErr } = await supabase
                .from("quest_mission_orders")
                .select("mission_md, session_id")
                .eq("chapter_quest_id", chapterQuestId)
                .eq("session_id", session.id)
                .maybeSingle();

            if (mErr) {
                Log.debug("quest_context.auth.mission_hint.not_available", {
                    metadata: { ms: msSince(m0), reason: mErr.message },
                });
            } else {
                const md = safeTrim((cachedMission as any)?.mission_md);
                mission_md = md.length ? md : null;
            }
        } catch {
            // ignore
        }

        let roomTitle = null;
        if (session_id && adventure_id) {
            try {
                const r0 = Date.now();
                const { data: roomsData, error: roomsError } = await supabase
                    .from("adventure_rooms")
                    .select("code, title")
                    .eq("adventure_id", adventure_id)
                    .eq("session_id", session_id) // ✅ multi-partie
                    .order("sort", { ascending: true })
                    .order("title", { ascending: true });

                if (roomsError) {
                    Log.debug("quest_context.server.rooms.not_available", {
                        metadata: { ms: msSince(r0), reason: roomsError.message },
                    });
                } else {
                    roomTitle = roomsData.filter((r) => r.code === aq.room_code)[0]?.title ?? null;
                }
            } catch {
                // ignore
            }
        }

        Log.success("quest_context.auth.ok", {
            status_code: 200,
            metadata: {
                ms_chapter_quest: msSince(q0),
                ms_adventure_quest: msSince(q1),
                chapter_quest_id: chapterQuestId,
                adventure_quest_id: adventureQuestId,
                session_id: session.id,
                has_title: !!aq.title,
                has_description: !!aq.description,
                has_mission_md: !!mission_md,
            },
        });

        t.endSuccess("getQuestContext.auth.success", {
            status_code: 200,
            metadata: { duration_ms: msSince(startedAt) },
        });

        return {
            chapter_quest_id: chapterQuestId,
            quest_status: (cq as any)?.status ? questStatusLabel(cq.status) : null,
            quest_room: roomTitle,

            adventure_quest_id: adventureQuestId,
            quest_title: (aq as any)?.title ?? null,
            quest_description: (aq as any)?.description ?? null,

            mission_md,
        };
    } catch (e) {
        Log.error("quest_context.fatal", e, {
            status_code: 500,
            metadata: { duration_ms: msSince(startedAt) },
        });
        t.endError("getQuestContext.fatal", e, { status_code: 500 });
        throw e;
    }
}
