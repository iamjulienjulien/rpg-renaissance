// src/lib/prompts/generateQuestPhotoMessage.ts
import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

export type QuestPhotoCategory = "initial" | "final" | "other";

export type QuestPhotoMessageJson = {
    title: string;
    description: string;
    message: string;
};

export type GenerateQuestPhotoMessageResult = {
    chapter_quest_id: string;
    session_id: string;
    thread_id: string | null;
    message_id: string | null;

    photo_id: string;
    photo_category: QuestPhotoCategory;

    photo_message_json: QuestPhotoMessageJson;
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
════════════════════════════════════
📸 TÂCHE DEMANDÉE / MESSAGE PHOTO
════════════════════════════════════
Le joueur vient d’envoyer une **photo** liée à une quête (preuve d’avancement).

Tu dois produire un JSON qui contient:
1) "title": très court (2 à 5 mots)
2) "description": description prudente et factuelle de la photo (2 à 5 phrases)
3) "message": encouragement RPG moderne (3 à 10 lignes max) + UNE micro-consigne finale

Important:
- La description doit être prudente: pas d’invention, pas de détails non visibles.
- Le message doit relier la photo à la quête et au contexte (aventure/chapitre).
`.trim();

const PROMPT_CONSTRAINTS = `
════════════════════════════════════
📐 CONTRAINTES DE SORTIE
════════════════════════════════════
Tu dois produire un JSON conforme au schéma attendu.

Règles:
- "title": 2 à 5 mots
- "description": 2 à 5 phrases, prudente, factuelle (ex: "on dirait", "il semble")
- "message": 3 à 10 lignes max, impactant
- Termine par UNE micro-consigne claire (un seul pas), pas une liste
- Emojis sobres (0 à 2)

INTERDICTIONS STRICTES:
- Pas de meta, pas de mention d’IA, pas de prompt
- Pas d’hésitations, pas de conditionnel mou
- Pas de jugements blessants
- Pas d’invention sur la photo
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

function photoCategoryLabel(c: QuestPhotoCategory) {
    if (c === "initial") return "photo initiale";
    if (c === "final") return "photo finale";
    return "photo";
}

function clampLinesHint(verbosity?: string | null) {
    const v = safeTrim(verbosity ?? "").toLowerCase();
    // Photo-message = un peu plus riche qu’un encouragement, mais compact
    if (v === "concise") return { min: 3, max: 6 };
    if (v === "verbose") return { min: 6, max: 12 };
    return { min: 4, max: 10 };
}

/* ============================================================================
🔎 THREAD HELPERS (BDD)
============================================================================ */

async function ensureQuestThreadId(input: {
    session_id: string;
    chapter_quest_id: string;
}): Promise<string | null> {
    const supabase = await supabaseAdmin();

    const q0 = Date.now();
    const { data: existing, error: exErr } = await supabase
        .from("quest_threads")
        .select("id")
        .eq("session_id", input.session_id)
        .eq("chapter_quest_id", input.chapter_quest_id)
        .maybeSingle();

    if (exErr) {
        Log.warning("quest_photo.thread.select_failed", {
            status_code: 200,
            metadata: { ms: msSince(q0), error: exErr.message, ...input },
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
        Log.warning("quest_photo.thread.insert_failed", {
            status_code: 200,
            metadata: { ms: msSince(i0), error: insErr.message, thread_id: id, ...input },
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

    photo_id: string;
    photo_category: QuestPhotoCategory;
    photo_caption?: string | null;

    meta?: Record<string, unknown> | null;
}) {
    const supabase = await supabaseAdmin();
    const id = crypto.randomUUID();

    const q0 = Date.now();
    const { error } = await supabase.from("quest_messages").insert({
        id,
        session_id: input.session_id,
        thread_id: input.thread_id,
        chapter_quest_id: input.chapter_quest_id,

        role: "mj",
        kind: "photo_recognition",

        title: input.title,
        content: input.content,

        photo_id: input.photo_id,
        meta: {
            photo_id: input.photo_id,
            photo_category: input.photo_category,
            photo_caption: safeTrim(input.photo_caption ?? "") || null,
            ...(input.meta ?? {}),
        },
    });

    if (error) {
        Log.warning("quest_photo.message.insert_failed", {
            status_code: 200,
            metadata: { ms: msSince(q0), error: error.message },
        });
        return null;
    }

    return id;
}

async function updatePhotoAiDescription(photo_id: string, ai_description: string) {
    const supabase = await supabaseAdmin();
    const q0 = Date.now();

    const { error } = await supabase
        .from("photos")
        .update({ ai_description: safeTrim(ai_description) || null })
        .eq("id", photo_id);

    if (error) {
        Log.warning("quest_photo.photo.update_ai_description_failed", {
            status_code: 200,
            metadata: { ms: msSince(q0), photo_id, error: error.message },
        });
        return false;
    }

    return true;
}

/* ============================================================================
🗺️ MAIN
============================================================================ */

export async function generateQuestPhotoMessage(args: {
    chapter_quest_id: string;
    user_id: string;

    photo_id: string;
    photo_category: QuestPhotoCategory;
    photo_signed_url: string;
    photo_caption?: string | null;
}): Promise<GenerateQuestPhotoMessageResult> {
    const request_id = crypto.randomUUID();
    const startedAtMs = Date.now();
    const route = "lib/prompts/generateQuestPhotoMessage";
    const method = "RUN";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAtMs },
        async () => {
            const t = Log.timer("generateQuestPhotoMessage", {
                source: "src/lib/prompts/generateQuestPhotoMessage.ts",
            });

            const chapter_quest_id = safeTrim(args?.chapter_quest_id);
            const user_id = safeTrim(args?.user_id);

            const photo_id = safeTrim(args?.photo_id);
            const photo_signed_url = safeTrim(args?.photo_signed_url);
            const photo_category = args?.photo_category;
            const photo_caption = safeTrim(args?.photo_caption ?? "") || null;

            try {
                Log.info("quest_photo.start", {
                    metadata: { chapter_quest_id, user_id, photo_id, photo_category },
                });

                if (!chapter_quest_id) {
                    Log.warning("quest_photo.missing.chapter_quest_id", { status_code: 400 });
                    t.endError("quest_photo.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing chapter_quest_id");
                }

                if (!user_id) {
                    Log.warning("quest_photo.missing.user_id", { status_code: 400 });
                    t.endError("quest_photo.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing user_id");
                }

                if (!photo_id) {
                    Log.warning("quest_photo.missing.photo_id", { status_code: 400 });
                    t.endError("quest_photo.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing photo_id");
                }

                if (!photo_signed_url) {
                    Log.warning("quest_photo.missing.photo_signed_url", { status_code: 400 });
                    t.endError("quest_photo.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing photo_signed_url");
                }

                if (!photo_category) {
                    Log.warning("quest_photo.missing.photo_category", { status_code: 400 });
                    t.endError("quest_photo.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing photo_category");
                }

                patchRequestContext({ user_id, chapter_quest_id });

                const supabase = await supabaseAdmin();

                /* ------------------------------------------------------------
                 1) Charger chapter_quest: session_id + chapter_id + adventure_quest_id
                ------------------------------------------------------------ */
                const q0 = Date.now();
                const { data: cq, error: cqErr } = await supabase
                    .from("chapter_quests")
                    .select("id, session_id, chapter_id, status, adventure_quest_id")
                    .eq("id", chapter_quest_id)
                    .maybeSingle();

                if (cqErr) {
                    Log.error("quest_photo.chapter_quests.select.error", cqErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q0), chapter_quest_id },
                    });
                    t.endError("quest_photo.chapter_quests_select_failed", cqErr, {
                        status_code: 500,
                    });
                    throw new Error(cqErr.message);
                }

                if (!cq?.id) {
                    Log.warning("quest_photo.chapter_quest.not_found", {
                        status_code: 404,
                        metadata: { chapter_quest_id },
                    });
                    t.endError("quest_photo.not_found", undefined, { status_code: 404 });
                    throw new Error("Chapter quest not found");
                }

                const session_id = (cq.session_id ?? null) as string | null;
                const chapter_id = (cq.chapter_id ?? null) as string | null;
                const adventure_quest_id = (cq.adventure_quest_id ?? null) as string | null;

                if (!session_id) {
                    Log.warning("quest_photo.chapter_quest.missing_session_id", {
                        status_code: 500,
                        metadata: { chapter_quest_id },
                    });
                    t.endError("quest_photo.missing_session_id", undefined, { status_code: 500 });
                    throw new Error("Missing session_id on chapter_quests");
                }

                patchRequestContext({
                    session_id,
                    chapter_id: chapter_id ?? undefined,
                    adventure_quest_id: adventure_quest_id ?? undefined,
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
                        Log.warning("quest_photo.adventure_quests.select_failed", {
                            status_code: 200,
                            metadata: { ms: msSince(a0), adventure_quest_id, error: aqErr.message },
                        });
                    } else {
                        adventure_id = (aq as any)?.adventure_id ?? null;
                    }
                }

                if (adventure_id) patchRequestContext({ adventure_id });

                Log.debug("quest_photo.chapter_quest.ok", {
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

                Log.debug("quest_photo.contexts.loaded", {
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
                    `Info photo: ${photoCategoryLabel(photo_category)}.`,
                    photo_caption ? `Légende fournie: "${photo_caption}".` : "",
                    `Indice de longueur: ${lineHint.min} à ${lineHint.max} lignes (message).`,
                ]
                    .filter(Boolean)
                    .join("\n");

                const userText =
                    `Génère un JSON conforme au schéma.\n` +
                    `- "description": prudente et factuelle, 2 à 5 phrases.\n` +
                    `- "message": encouragement lié à la quête + 1 micro-consigne finale.\n`;

                const model = "gpt-4.1";
                const requestPayload = {
                    model,
                    input: [
                        { role: "system", content: [{ type: "input_text", text: systemText }] },
                        {
                            role: "user",
                            content: [
                                { type: "input_text", text: userText },
                                { type: "input_image", image_url: photo_signed_url },
                            ],
                        },
                    ],
                    text: {
                        format: {
                            type: "json_schema",
                            name: "quest_photo_message_v1",
                            schema: {
                                type: "object",
                                additionalProperties: false,
                                properties: {
                                    title: { type: "string" },
                                    description: { type: "string" },
                                    message: { type: "string" },
                                },
                                required: ["title", "description", "message"],
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
                let photoMessageJson: QuestPhotoMessageJson | null = null;

                try {
                    response = await openai.responses.create(requestPayload as any);
                    outputText =
                        typeof response?.output_text === "string" ? response.output_text : null;
                    photoMessageJson = outputText
                        ? (JSON.parse(outputText) as QuestPhotoMessageJson)
                        : null;

                    if (
                        !photoMessageJson?.title ||
                        !photoMessageJson?.description ||
                        !photoMessageJson?.message
                    ) {
                        throw new Error("Invalid quest photo JSON output");
                    }
                } catch (err: any) {
                    const finishedAt = new Date();
                    const durationMs = Date.now() - g0;

                    Log.error("quest_photo.openai.error", err, {
                        status_code: 500,
                        metadata: { duration_ms: durationMs, model, chapter_quest_id, photo_id },
                    });

                    // Log best-effort
                    try {
                        await createAiGenerationLog({
                            session_id,
                            user_id,
                            adventure_id: adventure_id ?? null,
                            chapter_id: chapter_id ?? null,
                            chapter_quest_id,
                            adventure_quest_id: adventure_quest_id ?? null,

                            generation_type: "quest_photo_message",
                            source: "generateQuestPhotoMessage",
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
                                photo: { photo_id, photo_category, photo_caption },
                            },

                            response_json: null,
                            output_text: null,
                            parsed_json: null,
                            parse_error: err?.message ? String(err.message) : "parse_error",
                            rendered_md: null,
                            error_message: err?.message ? String(err.message) : "Unknown error",
                        } as any);
                    } catch {}

                    // Journal best-effort
                    try {
                        await createJournalEntry({
                            session_id,
                            kind: "quest_photo_message",
                            title: "⚠️ Photo (erreur IA)",
                            content:
                                `Échec génération message photo.\n` +
                                `Quête: ${safeTrim((questCtx as any)?.quest_title) || "—"}\n` +
                                `Erreur: ${err?.message ? String(err.message) : "Unknown error"}`,
                            chapter_id: chapter_id ?? null,
                            adventure_quest_id: adventure_quest_id ?? null,
                            meta: { photo_id, photo_category },
                        } as any);
                    } catch {}

                    t.endError("quest_photo.openai_failed", err, { status_code: 500 });
                    throw err;
                }

                const finishedAt = new Date();
                const durationMs = Date.now() - g0;

                Log.success("quest_photo.openai.ok", {
                    status_code: 200,
                    metadata: {
                        ms: durationMs,
                        model,
                        chapter_quest_id,
                        photo_id,
                        has_title: !!photoMessageJson?.title,
                        has_desc: !!photoMessageJson?.description,
                        has_message: !!photoMessageJson?.message,
                    },
                });

                /* ------------------------------------------------------------
                 5) Sauver en BDD: thread + message
                ------------------------------------------------------------ */
                const thread_id = await ensureQuestThreadId({ session_id, chapter_quest_id });

                let message_id: string | null = null;

                if (thread_id) {
                    message_id = await createQuestMessageRow({
                        session_id,
                        thread_id,
                        chapter_quest_id,
                        title: photoMessageJson.title,
                        content: safeTrim(photoMessageJson.message) || "—",
                        photo_id,
                        photo_category,
                        photo_caption,
                        meta: {
                            quest_title: safeTrim((questCtx as any)?.quest_title) || null,
                            ai_description_len: safeTrim(photoMessageJson.description).length,
                        },
                    });
                } else {
                    Log.warning("quest_photo.thread.missing", {
                        status_code: 200,
                        metadata: { session_id, chapter_quest_id },
                    });
                }

                /* ------------------------------------------------------------
                 5bis) Update photos.ai_description (best-effort)
                ------------------------------------------------------------ */
                const aiDesc = safeTrim(photoMessageJson.description);
                if (aiDesc) await updatePhotoAiDescription(photo_id, aiDesc);

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

                        generation_type: "quest_photo_message",
                        source: "generateQuestPhotoMessage",
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
                            photo: { photo_id, photo_category, photo_caption },
                            persisted: { thread_id, message_id },
                        },

                        response_json: response,
                        output_text: outputText,
                        parsed_json: photoMessageJson,
                        parse_error: null,
                        rendered_md: null,
                        usage_json: (response as any)?.usage ?? null,
                        metadata: { saved_to_thread: !!thread_id, saved_message: !!message_id },
                    } as any);
                } catch {}

                try {
                    await createJournalEntry({
                        session_id,
                        kind: "quest_photo_message",
                        title: `📸 ${safeTrim(photoMessageJson.title) || "Preuve reçue"}`,
                        content:
                            `${safeTrim(photoMessageJson.description)}\n\n` +
                            `${safeTrim(photoMessageJson.message)}`.trim(),
                        chapter_id: chapter_id ?? null,
                        adventure_quest_id: adventure_quest_id ?? null,
                        meta: { photo_id, photo_category, thread_id, message_id },
                    } as any);
                } catch {}

                t.endSuccess("quest_photo.success", { status_code: 200 });

                return {
                    chapter_quest_id,
                    session_id,
                    thread_id,
                    message_id,
                    photo_id,
                    photo_category,
                    photo_message_json: photoMessageJson,
                    model,
                };
            } catch (e: any) {
                Log.error("quest_photo.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAtMs) },
                });
                t.endError("quest_photo.fatal", e, { status_code: 500 });
                throw e;
            }
        }
    );
}
