// src/lib/prompts/generateQuestEncouragement.ts
import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";

// Context loaders
import { getAdventureContext } from "@/lib/context/getAdventureContext";
import { getPlayerContext } from "@/lib/context/getPlayerContext";
import { getCharacterContext } from "@/lib/context/getCharacterContext";
import { getChapterContext } from "@/lib/context/getChapterContext";
import { getQuestContext } from "@/lib/context/getQuestContext";
import { buildContextPrompt } from "@/lib/context/buildContextPrompt";

// ✅ Logs
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type QuestEncouragementJson = {
    title: string;
    message: string;
};

export type QuestEncouragementResult = {
    chapter_quest_id: string;
    session_id: string;
    thread_id: string | null;
    message_id: string | null;
    encouragement_json: QuestEncouragementJson;
    model: string;
};

/* ============================================================================
🧠 CONSTANTS (prompt parts)
============================================================================ */

const GAME_INTRO = `
Tu es le Maître du Jeu de **Renaissance**.

Renaissance est un jeu de rôle appliqué à la vie réelle.
Le joueur progresse en accomplissant des actions concrètes, organisées en quêtes,
chapitres et aventures, guidé par un Maître du Jeu incarné.

Ton rôle:
- Donner du sens aux actions du joueur
- Transformer son quotidien en aventure
- Créer un lien émotionnel avec le jeu
`.trim();

const PROMPT_INTRO = `
Ta tâche maintenant est d’écrire un **ENCOURAGEMENT** pour une quête en cours.

Un encouragement doit:
- rebooster sans juger
- recentrer l’attention
- donner UN mini prochain pas (une micro-consigne unique, pas une liste)
- rester concret et humain, avec une touche RPG moderne
`.trim();

const PROMPT_CONSTRAINTS = `
════════════════════════════════════
📐 CONTRAINTES DE SORTIE
════════════════════════════════════

Tu dois produire un JSON conforme au schéma attendu.

Règles:
- "title": très court (2 à 5 mots)
- "message": court, impactant, 3 à 7 lignes max
- Termine par UNE micro-consigne claire (un seul pas), pas une liste
- Emojis sobres (0 à 2)

INTERDICTIONS STRICTES:
- Pas de meta, pas de mention d’IA, pas de prompt
- Pas d’hésitations, pas de conditionnel mou
- Pas de conseils vagues
`.trim();

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function clampLinesHint(verbosity?: string | null) {
    const v = safeTrim(verbosity ?? "").toLowerCase();
    if (v === "concise") return { min: 2, max: 4 };
    if (v === "verbose") return { min: 4, max: 8 };
    return { min: 3, max: 7 };
}

/* ============================================================================
🔎 THREAD HELPERS (BDD)
============================================================================ */

async function ensureQuestThreadId(input: {
    session_id: string;
    chapter_quest_id: string;
}): Promise<string | null> {
    const supabase = await supabaseServer();

    const q0 = Date.now();
    const { data: existing, error: exErr } = await supabase
        .from("quest_threads")
        .select("id")
        .eq("session_id", input.session_id)
        .eq("chapter_quest_id", input.chapter_quest_id)
        .maybeSingle();

    if (exErr) {
        Log.warning("quest_encouragement.thread.select_failed", {
            status_code: 200,
            metadata: { ms: msSince(q0), error: exErr.message },
        });
    }

    if (existing?.id) return existing.id;

    const id = crypto.randomUUID();

    const i0 = Date.now();
    const { error: insErr } = await supabase.from("quest_threads").insert({
        id,
        session_id: input.session_id,
        chapter_quest_id: input.chapter_quest_id,
    });

    if (insErr) {
        Log.warning("quest_encouragement.thread.insert_failed", {
            status_code: 200,
            metadata: { ms: msSince(i0), error: insErr.message },
        });
        return null;
    }

    return id;
}

async function createQuestMessageRow(input: {
    session_id: string;
    thread_id: string;
    chapter_quest_id: string;
    title: string;
    content: string;
}) {
    const supabase = await supabaseServer();

    const id = crypto.randomUUID();

    const q0 = Date.now();
    const { error } = await supabase.from("quest_messages").insert({
        id,
        session_id: input.session_id,
        thread_id: input.thread_id,
        chapter_quest_id: input.chapter_quest_id,
        role: "mj",
        kind: "encouragement",
        title: input.title,
        content: input.content,
    });

    if (error) {
        Log.warning("quest_encouragement.message.insert_failed", {
            status_code: 200,
            metadata: { ms: msSince(q0), error: error.message },
        });
        return null;
    }

    return id;
}

/* ============================================================================
🗺️ MAIN
============================================================================ */

export async function generateQuestEncouragement(args: {
    chapter_quest_id: string;
    user_id: string;
}): Promise<QuestEncouragementResult> {
    const request_id = crypto.randomUUID();
    const startedAtMs = Date.now();
    const route = "lib/prompts/generateQuestEncouragement";
    const method = "RUN";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAtMs },
        async () => {
            const t = Log.timer("generateQuestEncouragement", {
                source: "src/lib/prompts/generateQuestEncouragement.ts",
            });

            const chapter_quest_id = safeTrim(args?.chapter_quest_id);
            const user_id = safeTrim(args?.user_id);

            try {
                Log.info("quest_encouragement.start", {
                    metadata: { chapter_quest_id, user_id },
                });

                if (!chapter_quest_id) {
                    Log.warning("quest_encouragement.missing.chapter_quest_id", {
                        status_code: 400,
                    });
                    t.endError("quest_encouragement.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing chapter_quest_id");
                }

                if (!user_id) {
                    Log.warning("quest_encouragement.missing.user_id", { status_code: 400 });
                    t.endError("quest_encouragement.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing user_id");
                }

                patchRequestContext({ user_id, chapter_quest_id });

                // ✅ supabase admin (fonction -> call)
                const supabase = await supabaseAdmin();

                /* ------------------------------------------------------------
                 1) Charger chapter_quest pour récupérer session_id + chapter_id + adventure_quest_id
                ------------------------------------------------------------ */
                const q0 = Date.now();
                const { data: cq, error: cqErr } = await supabase
                    .from("chapter_quests")
                    .select("id, session_id, chapter_id, status, adventure_quest_id")
                    .eq("id", chapter_quest_id)
                    .maybeSingle();

                if (cqErr) {
                    Log.error("quest_encouragement.chapter_quests.select.error", cqErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q0), chapter_quest_id },
                    });
                    t.endError("quest_encouragement.chapter_quests_select_failed", cqErr, {
                        status_code: 500,
                    });
                    throw new Error(cqErr.message);
                }

                if (!cq?.id) {
                    Log.warning("quest_encouragement.chapter_quest.not_found", {
                        status_code: 404,
                        metadata: { chapter_quest_id },
                    });
                    t.endError("quest_encouragement.not_found", undefined, { status_code: 404 });
                    throw new Error("Chapter quest not found");
                }

                const session_id = (cq.session_id ?? null) as string | null;
                const chapter_id = (cq.chapter_id ?? null) as string | null;
                const adventure_quest_id = (cq.adventure_quest_id ?? null) as string | null;

                if (!session_id) {
                    Log.warning("quest_encouragement.chapter_quest.missing_session_id", {
                        status_code: 500,
                        metadata: { chapter_quest_id },
                    });
                    t.endError("quest_encouragement.missing_session_id", undefined, {
                        status_code: 500,
                    });
                    throw new Error("Missing session_id on chapter_quests");
                }

                patchRequestContext({
                    session_id,
                    chapter_id: chapter_id ?? undefined,
                });

                /* ------------------------------------------------------------
                 1bis) Résoudre adventure_id via adventure_quests (best-effort)
                ------------------------------------------------------------ */
                let adventure_id: string | null = null;

                if (adventure_quest_id) {
                    const a0 = Date.now();
                    const { data: aq, error: aqErr } = await supabase
                        .from("adventure_quests")
                        .select("id, adventure_id")
                        .eq("id", adventure_quest_id)
                        .maybeSingle();

                    if (aqErr) {
                        Log.warning("quest_encouragement.adventure_quests.select_failed", {
                            status_code: 200,
                            metadata: { ms: msSince(a0), adventure_quest_id, error: aqErr.message },
                        });
                    } else {
                        adventure_id = (aq as any)?.adventure_id ?? null;
                    }
                }

                if (adventure_id) patchRequestContext({ adventure_id });

                Log.debug("quest_encouragement.chapter_quest.ok", {
                    metadata: {
                        ms: msSince(q0),
                        session_id,
                        chapter_id,
                        adventure_id,
                        status: (cq as any)?.status ?? null,
                        adventure_quest_id,
                    },
                });

                /* ------------------------------------------------------------
                 2) Charger contexts (mode server)
                ------------------------------------------------------------ */
                const c0 = Date.now();
                const [playerCtx, characterCtx, questCtx, chapterCtx, adventureCtx] =
                    await Promise.all([
                        getPlayerContext({ mode: "server", user_id }),
                        getCharacterContext({ mode: "server", user_id }),
                        getQuestContext({ mode: "server", chapter_quest_id }),
                        chapter_id
                            ? getChapterContext({ mode: "server", chapter_id })
                            : Promise.resolve(null),
                        adventure_id
                            ? getAdventureContext({ mode: "server", adventure_id })
                            : Promise.resolve(null),
                    ]);

                Log.debug("quest_encouragement.contexts.loaded", {
                    metadata: {
                        ms: msSince(c0),
                        has_player: !!playerCtx,
                        has_character: !!characterCtx,
                        has_quest: !!questCtx,
                        has_chapter: !!chapterCtx,
                        has_adventure: !!adventureCtx,
                    },
                });

                /* ------------------------------------------------------------
                 2bis) Charger hint mission_md (best-effort)
                ------------------------------------------------------------ */
                let mission_md: string | null = null;

                try {
                    const m0 = Date.now();
                    const { data: cachedMission, error: mErr } = await supabase
                        .from("quest_mission_orders")
                        .select("mission_md, session_id")
                        .eq("chapter_quest_id", chapter_quest_id)
                        .eq("session_id", session_id)
                        .maybeSingle();

                    if (mErr) {
                        Log.debug("quest_encouragement.mission_hint.not_available", {
                            metadata: { ms: msSince(m0), reason: mErr.message },
                        });
                    } else {
                        const md = safeTrim((cachedMission as any)?.mission_md);
                        mission_md = md.length ? md : null;
                    }
                } catch {
                    // ignore
                }

                /* ------------------------------------------------------------
                 3) Construire prompt
                ------------------------------------------------------------ */
                const ctxPrompt = buildContextPrompt({
                    player: playerCtx,
                    character: characterCtx,
                    quest: questCtx,
                    chapter: chapterCtx,
                    adventure: adventureCtx,
                });

                const lineHint = clampLinesHint(characterCtx?.character_verbosity ?? null);

                const systemText = [
                    GAME_INTRO,
                    PROMPT_INTRO,
                    ctxPrompt.text,
                    PROMPT_CONSTRAINTS,
                    "",
                    `Indice de longueur: ${lineHint.min} à ${lineHint.max} lignes (message).`,
                    mission_md
                        ? `Mission existante (hint, ne pas recopier mot pour mot):\n${safeTrim(
                              mission_md
                          ).slice(0, 1200)}`
                        : null,
                ]
                    .filter(Boolean)
                    .join("\n");

                const userText =
                    `Génère un encouragement JSON conforme au schéma.\n` +
                    `Important: respecte la voix du MJ et le contexte fourni.\n`;

                const model = "gpt-4.1";
                const requestPayload = {
                    model,
                    input: [
                        { role: "system", content: [{ type: "input_text", text: systemText }] },
                        { role: "user", content: [{ type: "input_text", text: userText }] },
                    ],
                    text: {
                        format: {
                            type: "json_schema",
                            name: "quest_encouragement_message_v1",
                            schema: {
                                type: "object",
                                additionalProperties: false,
                                properties: {
                                    title: { type: "string" },
                                    message: { type: "string" },
                                },
                                required: ["title", "message"],
                            },
                        },
                    },
                };

                /* ------------------------------------------------------------
                 4) Appel IA + parsing
                ------------------------------------------------------------ */
                const g0 = Date.now();
                const startedAt = new Date();

                let response: any = null;
                let outputText: string | null = null;
                let encouragementJson: QuestEncouragementJson | null = null;

                try {
                    response = await openai.responses.create(requestPayload as any);
                    outputText =
                        typeof response?.output_text === "string" ? response.output_text : null;
                    encouragementJson = outputText
                        ? (JSON.parse(outputText) as QuestEncouragementJson)
                        : null;

                    if (!encouragementJson?.title || !encouragementJson?.message) {
                        throw new Error("Invalid encouragement JSON output");
                    }
                } catch (err: any) {
                    const finishedAt = new Date();
                    const durationMs = Date.now() - g0;

                    Log.error("quest_encouragement.openai.error", err, {
                        status_code: 500,
                        metadata: { duration_ms: durationMs, model, chapter_quest_id },
                    });

                    // log best-effort
                    try {
                        await createAiGenerationLog({
                            session_id,
                            user_id,
                            adventure_id: adventure_id ?? null,
                            chapter_id: chapter_id ?? null,
                            chapter_quest_id,
                            adventure_quest_id: adventure_quest_id ?? null,

                            generation_type: "encouragement",
                            source: "generateQuestEncouragement",
                            provider: "openai",
                            model,
                            status: "error",

                            started_at: startedAt,
                            finished_at: finishedAt,
                            duration_ms: durationMs,

                            request_json: requestPayload,
                            system_text: systemText,
                            user_input_text: userText,
                            context_json: {
                                player: playerCtx,
                                character: characterCtx,
                                quest: questCtx,
                                chapter: chapterCtx,
                                adventure: adventureCtx,
                                mission_md_hint: mission_md
                                    ? safeTrim(mission_md).slice(0, 600)
                                    : null,
                            },

                            response_json: null,
                            output_text: null,
                            parsed_json: null,
                            parse_error: err?.message ? String(err.message) : "parse_error",
                            rendered_md: null,
                            error_message: err?.message ? String(err.message) : "Unknown error",
                        } as any);
                    } catch {}

                    // journal best-effort
                    try {
                        await createJournalEntry({
                            session_id,
                            kind: "note",
                            title: "⚠️ Encouragement (erreur IA)",
                            content:
                                `Échec génération encouragement.\n` +
                                `Quête: ${safeTrim((questCtx as any)?.quest_title) || "—"}\n` +
                                `Erreur: ${err?.message ? String(err.message) : "Unknown error"}`,
                            chapter_id: chapter_id ?? null,
                            quest_id: chapter_quest_id,
                            adventure_id: adventure_id ?? null,
                            adventure_quest_id: adventure_quest_id ?? null,
                        } as any);
                    } catch {}

                    t.endError("quest_encouragement.openai_failed", err, { status_code: 500 });
                    throw err;
                }

                const finishedAt = new Date();
                const durationMs = Date.now() - g0;

                Log.success("quest_encouragement.openai.ok", {
                    status_code: 200,
                    metadata: {
                        ms: durationMs,
                        model,
                        chapter_quest_id,
                        has_title: !!encouragementJson?.title,
                        has_message: !!encouragementJson?.message,
                    },
                });

                /* ------------------------------------------------------------
                 5) Sauver en BDD: thread + message (kind=encouragement)
                ------------------------------------------------------------ */
                const thread_id = await ensureQuestThreadId({
                    session_id,
                    chapter_quest_id,
                });

                let message_id: string | null = null;

                if (thread_id) {
                    message_id = await createQuestMessageRow({
                        session_id,
                        thread_id,
                        chapter_quest_id,
                        title: encouragementJson.title,
                        content: encouragementJson.message,
                    });
                } else {
                    Log.warning("quest_encouragement.thread.missing", {
                        status_code: 200,
                        metadata: { session_id, chapter_quest_id },
                    });
                }

                /* ------------------------------------------------------------
                 6) Logs DB + Journal (success)
                ------------------------------------------------------------ */
                try {
                    await createAiGenerationLog({
                        session_id,
                        user_id,
                        adventure_id: adventure_id ?? null,
                        chapter_id: chapter_id ?? null,
                        chapter_quest_id,
                        adventure_quest_id: adventure_quest_id ?? null,

                        generation_type: "encouragement",
                        source: "generateQuestEncouragement",
                        provider: "openai",
                        model,
                        status: "success",

                        started_at: startedAt,
                        finished_at: finishedAt,
                        duration_ms: durationMs,

                        request_json: requestPayload,
                        system_text: systemText,
                        user_input_text: userText,
                        context_json: {
                            player: playerCtx,
                            character: characterCtx,
                            quest: questCtx,
                            chapter: chapterCtx,
                            adventure: adventureCtx,
                            mission_md_hint: mission_md ? safeTrim(mission_md).slice(0, 600) : null,
                            persisted: { thread_id, message_id },
                        },

                        response_json: response,
                        output_text: outputText,
                        parsed_json: encouragementJson,
                        parse_error: null,
                        rendered_md: null,
                        usage_json: (response as any)?.usage ?? null,
                        metadata: { saved_to_thread: !!thread_id, saved_message: !!message_id },
                    } as any);
                } catch {}

                try {
                    await createJournalEntry({
                        session_id,
                        kind: "note",
                        title: `💪 ${safeTrim(encouragementJson.title) || "Courage"}`,
                        content: safeTrim(encouragementJson.message) || "—",
                        chapter_id: chapter_id ?? null,
                        adventure_quest_id: adventure_quest_id ?? null,
                    } as any);
                } catch {}

                t.endSuccess("quest_encouragement.success", { status_code: 200 });

                return {
                    chapter_quest_id,
                    session_id,
                    thread_id,
                    message_id,
                    encouragement_json: encouragementJson,
                    model,
                };
            } catch (e: any) {
                Log.error("quest_encouragement.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAtMs) },
                });
                t.endError("quest_encouragement.fatal", e, { status_code: 500 });
                throw e;
            }
        }
    );
}
