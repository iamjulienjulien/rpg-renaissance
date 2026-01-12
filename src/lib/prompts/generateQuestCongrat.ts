import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";

// Context loaders
import { getAdventureContext } from "@/lib/context/getAdventureContext";
// import { getPlayerContext } from "@/lib/context/getPlayerContext";
import { getCharacterContext } from "@/lib/context/getCharacterContext";
import { getChapterContext } from "@/lib/context/getChapterContext";
import { getQuestContext } from "@/lib/context/getQuestContext";
import { buildContextPrompt } from "@/lib/context/buildContextPrompt";

// ✅ Logs
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";
import { getPlayerWithDetailsContext } from "../context/getPlayerWithDetailsContext";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type QuestCongratJson = {
    title: string;
    message: string;
};

export type QuestCongratResult = {
    chapter_quest_id: string;
    session_id: string;
    thread_id: string | null;
    message_id: string | null;
    congrat_json: QuestCongratJson;
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
- Donner du sens aux actions accomplies
- Marquer les victoires sans emphase artificielle
- Transformer une réussite en ancrage durable
`.trim();

const PROMPT_INTRO = `
════════════════════════════════════
📐 TÂCHE DEMANDÉE / TEXTE À GÉNÉRER
════════════════════════════════════
Ta tâche maintenant est d’écrire des **FÉLICITATIONS** pour une quête TERMINÉE.
Les détails de la quête sont fournis dans le bloc **🎯 CONTEXTE DE QUÊTE**.

Des félicitations doivent:
- reconnaître l’effort et la traversée, pas seulement le résultat
- rester sobres, humaines, ancrées
- renforcer le sentiment de progression
- proposer UNE micro-projection (une seule phrase, pas une liste)
- garder un ton RPG moderne, incarné
`.trim();

const PROMPT_CONSTRAINTS = `
════════════════════════════════════
📐 CONTRAINTES DE SORTIE
════════════════════════════════════

Tu dois produire un JSON conforme au schéma attendu.

Règles:
- "title": court, impactant (2 à 6 mots), style sceau / étape validée
- "message": 3 à 7 lignes max
- Termine par UNE micro-projection claire (une seule phrase)
- Emojis sobres (0 à 2)

INTERDICTIONS STRICTES:
- Pas de meta, pas de mention d’IA
- Pas de conseils vagues
- Pas de checklist
- Pas de conditionnel mou
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
    const supabase = await supabaseAdmin();

    const { data: existing } = await supabase
        .from("quest_threads")
        .select("id")
        .eq("session_id", input.session_id)
        .eq("chapter_quest_id", input.chapter_quest_id)
        .maybeSingle();

    if (existing?.id) return existing.id;

    const id = crypto.randomUUID();

    const { error } = await supabase.from("quest_threads").insert({
        id,
        session_id: input.session_id,
        chapter_quest_id: input.chapter_quest_id,
    });

    if (error) return null;
    return id;
}

async function createQuestMessageRow(input: {
    session_id: string;
    thread_id: string;
    chapter_quest_id: string;
    title: string;
    content: string;
}) {
    const supabase = await supabaseAdmin();
    const id = crypto.randomUUID();

    const { error } = await supabase.from("quest_messages").insert({
        id,
        session_id: input.session_id,
        thread_id: input.thread_id,
        chapter_quest_id: input.chapter_quest_id,
        role: "mj",
        kind: "congrat",
        title: input.title,
        content: input.content,
    });

    if (error) return null;
    return id;
}

/* ============================================================================
🎉 MAIN
============================================================================ */

export async function generateQuestCongrat(args: {
    chapter_quest_id: string;
    user_id: string;
}): Promise<QuestCongratResult> {
    const request_id = crypto.randomUUID();
    const startedAtMs = Date.now();

    return await withRequestContext(
        {
            request_id,
            route: "lib/prompts/generateQuestCongrat",
            method: "RUN",
            started_at_ms: startedAtMs,
        },
        async () => {
            const chapter_quest_id = safeTrim(args.chapter_quest_id);
            const user_id = safeTrim(args.user_id);

            if (!chapter_quest_id || !user_id) {
                throw new Error("Missing chapter_quest_id or user_id");
            }

            patchRequestContext({ user_id, chapter_quest_id });

            const supabase = await supabaseAdmin();

            /* ------------------------------------------------------------
             1) Charger chapter_quest
            ------------------------------------------------------------ */
            const { data: cq } = await supabase
                .from("chapter_quests")
                .select("id, session_id, chapter_id, adventure_quest_id")
                .eq("id", chapter_quest_id)
                .maybeSingle();

            if (!cq?.session_id) {
                throw new Error("Invalid chapter_quest");
            }

            const session_id = cq.session_id;
            const chapter_id = cq.chapter_id ?? null;
            const adventure_quest_id = cq.adventure_quest_id ?? null;

            patchRequestContext({ session_id, chapter_id: chapter_id ?? undefined });

            /* ------------------------------------------------------------
             2) Resolve adventure_id (best effort)
            ------------------------------------------------------------ */
            let adventure_id: string | null = null;

            if (adventure_quest_id) {
                const { data: aq } = await supabase
                    .from("adventure_quests")
                    .select("adventure_id")
                    .eq("id", adventure_quest_id)
                    .maybeSingle();

                adventure_id = aq?.adventure_id ?? null;
            }

            if (adventure_id) patchRequestContext({ adventure_id });

            /* ------------------------------------------------------------
             3) Load contexts
            ------------------------------------------------------------ */
            const [playerCtx, characterCtx, questCtx, chapterCtx, adventureCtx] = await Promise.all(
                [
                    getPlayerWithDetailsContext({ mode: "server", user_id }),
                    getCharacterContext({ mode: "server", user_id }),
                    getQuestContext({ mode: "server", chapter_quest_id }),
                    chapter_id
                        ? getChapterContext({ mode: "server", chapter_id })
                        : Promise.resolve(null),
                    adventure_id
                        ? getAdventureContext({ mode: "server", adventure_id })
                        : Promise.resolve(null),
                ]
            );

            /* ------------------------------------------------------------
             4) Prompt
            ------------------------------------------------------------ */
            const ctxPrompt = buildContextPrompt({
                playerWithDetails: playerCtx,
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
                `Indice de longueur: ${lineHint.min} à ${lineHint.max} lignes.`,
            ].join("\n");

            const userText =
                `Génère des félicitations JSON conformes au schéma.\n` +
                `Sois incarné, sobre, mémorable.\n`;

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
                        name: "quest_congrat_message_v1",
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
             5) OpenAI
            ------------------------------------------------------------ */
            const startedAt = new Date();
            const response = await openai.responses.create(requestPayload as any);
            const outputText =
                typeof response?.output_text === "string" ? response.output_text : null;

            const congratJson = outputText ? (JSON.parse(outputText) as QuestCongratJson) : null;

            if (!congratJson?.title || !congratJson?.message) {
                throw new Error("Invalid congrat JSON output");
            }

            /* ------------------------------------------------------------
             6) Persist thread + message
            ------------------------------------------------------------ */
            const thread_id = await ensureQuestThreadId({
                session_id,
                chapter_quest_id,
            });

            const message_id = thread_id
                ? await createQuestMessageRow({
                      session_id,
                      thread_id,
                      chapter_quest_id,
                      title: congratJson.title,
                      content: congratJson.message,
                  })
                : null;

            /* ------------------------------------------------------------
             7) Logs + Journal
            ------------------------------------------------------------ */
            await createAiGenerationLog({
                session_id,
                user_id,
                adventure_id,
                chapter_id,
                chapter_quest_id,
                adventure_quest_id,

                generation_type: "congrat",
                source: "generateQuestCongrat",
                provider: "openai",
                model,
                status: "success",

                started_at: startedAt,
                finished_at: new Date(),
                duration_ms: msSince(startedAtMs),

                request_json: requestPayload,
                system_text: systemText,
                user_input_text: userText,
                context_json: {
                    player: playerCtx,
                    character: characterCtx,
                    quest: questCtx,
                    chapter: chapterCtx,
                    adventure: adventureCtx,
                    persisted: { thread_id, message_id },
                },

                response_json: response,
                output_text: outputText,
                parsed_json: congratJson,
            } as any);

            await createJournalEntry({
                session_id,
                kind: "note",
                title: `🏆 ${safeTrim(congratJson.title)}`,
                content: safeTrim(congratJson.message),
                chapter_id,
                adventure_quest_id,
            } as any);

            return {
                chapter_quest_id,
                session_id,
                thread_id,
                message_id,
                congrat_json: congratJson,
                model,
            };
        }
    );
}
