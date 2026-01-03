// src/lib/prompts/generateWelcomeMessage.ts
import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase/admin"; // ⚠️ c'est une fonction -> il faut l'appeler
import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";

// Context loaders
import {
    getAdventureContext,
    type AdventureContextResult,
} from "@/lib/context/getAdventureContext";
import { getPlayerContext, type PlayerContextResult } from "@/lib/context/getPlayerContext";
import {
    getCharacterContext,
    type CharacterContextResult,
} from "@/lib/context/getCharacterContext";
import { getChapterContext, type ChapterContextResult } from "@/lib/context/getChapterContext";
import { buildContextPrompt } from "@/lib/context/buildContextPrompt";

// ✅ Logs (même style que tes routes)
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧠 CONSTANTS (prompt parts)
============================================================================ */

/**
 * Présente le concept global du jeu.
 * Doit poser le cadre narratif ET fonctionnel.
 */
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

/**
 * Ce que l’on attend précisément ici.
 */
const PROMPT_INTRO = `
Ta tâche maintenant est d’écrire un **message de bienvenue**.

Ce message est lu une seule fois, lors de l’onboarding.
Il doit:
- Accueillir le joueur
- Présenter le Maître du Jeu
- Présenter l’aventure en cours
- Donner envie de jouer et de continuer
`.trim();

/**
 * Contraintes fortes sur la sortie.
 */
const PROMPT_CONSTRAINTS = `
════════════════════════════════════
📐 CONTRAINTES DE SORTIE
════════════════════════════════════

- Écris en **markdown**
- Adresse-toi directement au joueur
- Reste incarné dans la voix du Maître du Jeu
- Ton texte doit être:
  • clair
  • immersif
  • motivant
- Longueur recommandée: 3 à 6 paragraphes
- Tu peux utiliser:
  • titres courts
  • paragraphes aérés
  • une légère touche narrative

INTERDICTIONS STRICTES:
- Ne parle jamais d’IA ou de prompt
- Ne mentionne pas de règles techniques
- Ne liste pas les contextes explicitement
- Ne fais pas de conclusion fermée (le jeu commence)
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

function jsonContextForBuild(args: {
    adventure?: AdventureContextResult;
    player?: PlayerContextResult;
    character?: CharacterContextResult;
    chapter?: ChapterContextResult;
}) {
    // buildContextPrompt attend tes result types, on les passe tels quels.
    return args;
}

/* ============================================================================
🗺️ MAIN
============================================================================ */

export async function generateWelcomeMessage(args: { adventure_id: string; user_id: string }) {
    const request_id = crypto.randomUUID();
    const startedAtMs = Date.now();
    const route = "lib/prompts/generateWelcomeMessage";
    const method = "RUN";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAtMs },
        async () => {
            const t = Log.timer("generateWelcomeMessage", {
                source: "src/lib/prompts/generateWelcomeMessage.ts",
            });

            const adventure_id = safeTrim(args?.adventure_id);
            const user_id = safeTrim(args?.user_id);

            try {
                Log.info("welcome_message.start", {
                    metadata: { adventure_id, user_id },
                });

                if (!adventure_id) {
                    Log.warning("welcome_message.missing.adventure_id", { status_code: 400 });
                    t.endError("welcome_message.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing adventure_id");
                }

                if (!user_id) {
                    Log.warning("welcome_message.missing.user_id", { status_code: 400 });
                    t.endError("welcome_message.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing user_id");
                }

                patchRequestContext({ user_id, adventure_id });

                // ✅ FIX TS: supabaseAdmin est une fonction -> on l'appelle
                const supabase = await supabaseAdmin();

                // 1) Charger l’aventure (et surtout session_id) via adventure_id
                const q0 = Date.now();
                const { data: adv, error: advErr } = await supabase
                    .from("adventures")
                    .select("id, session_id, title, description, context_text, welcome_text")
                    .eq("id", adventure_id)
                    .maybeSingle();

                if (advErr) {
                    Log.error("welcome_message.adventures.select.error", advErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q0), adventure_id },
                    });
                    t.endError("welcome_message.adventures_select_failed", advErr, {
                        status_code: 500,
                    });
                    throw new Error(advErr.message);
                }

                if (!adv?.id) {
                    Log.warning("welcome_message.adventure.not_found", {
                        status_code: 404,
                        metadata: { adventure_id },
                    });
                    t.endError("welcome_message.adventure_not_found", undefined, {
                        status_code: 404,
                    });
                    throw new Error("Adventure not found");
                }

                const session_id = adv.session_id as string | null;
                if (!session_id) {
                    Log.warning("welcome_message.adventure.missing_session_id", {
                        status_code: 500,
                        metadata: { adventure_id },
                    });
                    t.endError("welcome_message.adventure_missing_session_id", undefined, {
                        status_code: 500,
                    });
                    throw new Error("Missing session_id on adventures");
                }

                patchRequestContext({ session_id });

                Log.debug("welcome_message.adventure.ok", {
                    metadata: {
                        ms: msSince(q0),
                        session_id,
                        title: adv.title ?? null,
                        has_context_text: !!adv.context_text,
                    },
                });

                // 2) Charger contexts (mode server)
                const c0 = Date.now();
                const [adventureCtx, playerCtx, characterCtx] = await Promise.all([
                    getAdventureContext({ mode: "server", adventure_id }),
                    getPlayerContext({ mode: "server", user_id }),
                    getCharacterContext({ mode: "server", user_id }),
                ]);

                Log.debug("welcome_message.contexts.loaded", {
                    metadata: {
                        ms: msSince(c0),
                        has_adventure: !!adventureCtx,
                        has_player: !!playerCtx,
                        has_character: !!characterCtx,
                        has_chapter: false,
                    },
                });

                // 3) Construire le prompt
                const ctxPrompt = buildContextPrompt(
                    jsonContextForBuild({
                        adventure: adventureCtx,
                        player: playerCtx,
                        character: characterCtx,
                    })
                );

                const systemText = [GAME_INTRO, PROMPT_INTRO, ctxPrompt, PROMPT_CONSTRAINTS]
                    .filter(Boolean)
                    .join("\n");

                const userText =
                    `Génère le message de bienvenue en Markdown.\n` +
                    `Important: reflète la voix du MJ et utilise le contexte fourni.\n`;

                const model = "gpt-4.1";
                const requestPayload = {
                    model,
                    input: [
                        { role: "system", content: [{ type: "input_text", text: systemText }] },
                        { role: "user", content: [{ type: "input_text", text: userText }] },
                    ],
                };

                // 4) Appel IA
                const g0 = Date.now();
                const startedAt = new Date();

                let response: any = null;
                let welcomeMd: string | null = null;

                try {
                    response = await openai.responses.create(requestPayload as any);
                    welcomeMd =
                        typeof response?.output_text === "string" ? response.output_text : null;
                } catch (err: any) {
                    const finishedAt = new Date();
                    const durationMs = Date.now() - g0;

                    Log.error("welcome_message.openai.error", err, {
                        status_code: 500,
                        metadata: { duration_ms: durationMs, model },
                    });

                    // ✅ createAiGenerationLog: session_id requis + user_id ok
                    try {
                        await createAiGenerationLog({
                            session_id,
                            user_id,
                            adventure_id,
                            generation_type: "welcome_message",
                            source: "generateWelcomeMessage",
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
                                adventure: adventureCtx,
                                player: playerCtx,
                                character: characterCtx,
                            },
                            response_json: null,
                            output_text: null,
                            parsed_json: null,
                            rendered_md: null,
                            error_message: err?.message ? String(err.message) : "Unknown error",
                            metadata: { note: "welcome_generation_failed" },
                        } as any);
                    } catch {}

                    // ✅ Journal: pas de user_id dans CreateJournalEntryInput -> session_id
                    try {
                        await createJournalEntry({
                            session_id,
                            kind: "note",
                            title: "👋 Message de bienvenue (erreur IA)",
                            content:
                                `Échec génération welcome message.\n` +
                                `Aventure: ${safeTrim(adv.title) || "—"}\n` +
                                `Erreur: ${err?.message ? String(err.message) : "Unknown error"}`,
                            adventure_id,
                        } as any);
                    } catch {}

                    t.endError("welcome_message.openai_failed", err, { status_code: 500 });
                    throw err;
                }

                const finishedAt = new Date();
                const durationMs = Date.now() - g0;

                Log.success("welcome_message.openai.ok", {
                    status_code: 200,
                    metadata: { ms: durationMs, model, has_md: !!welcomeMd },
                });

                // 5) Sauver dans adventures.welcome_text
                const s0 = Date.now();
                const { error: upErr } = await supabase
                    .from("adventures")
                    .update({ welcome_text: welcomeMd })
                    .eq("id", adventure_id);

                if (upErr) {
                    Log.error("welcome_message.adventures.update.error", upErr, {
                        status_code: 500,
                        metadata: { ms: msSince(s0), adventure_id },
                    });
                    // on log quand même, puis throw
                    try {
                        await createAiGenerationLog({
                            session_id,
                            user_id,
                            adventure_id,
                            generation_type: "welcome_message",
                            source: "generateWelcomeMessage",
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
                                adventure: adventureCtx,
                                player: playerCtx,
                                character: characterCtx,
                            },
                            response_json: response,
                            output_text: response?.output_text ?? null,
                            parsed_json: null,
                            rendered_md: welcomeMd,
                            error_message: `Failed to update adventures.welcome_text: ${upErr.message}`,
                        } as any);
                    } catch {}
                    t.endError("welcome_message.save_failed", upErr, { status_code: 500 });
                    throw new Error(upErr.message);
                }

                // 6) Logs DB (success)
                try {
                    await createAiGenerationLog({
                        session_id,
                        user_id,
                        adventure_id,
                        generation_type: "welcome_message",
                        source: "generateWelcomeMessage",
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
                            adventure: adventureCtx,
                            player: playerCtx,
                            character: characterCtx,
                        },
                        response_json: response,
                        output_text: response?.output_text ?? null,
                        parsed_json: null,
                        rendered_md: welcomeMd,
                        usage_json: (response as any)?.usage ?? null,
                        metadata: { saved_to_adventures: true },
                    } as any);
                } catch {}

                // 7) Journal entry (success) ✅ session_id (pas user_id)
                try {
                    await createJournalEntry({
                        session_id,
                        kind: "note",
                        title: "👋 Message de bienvenue généré",
                        content:
                            `Le MJ a rédigé le message de bienvenue.\n` +
                            `Aventure: ${safeTrim(adv.title) || "—"}\n` +
                            `Modèle: ${model}`,
                        adventure_id,
                    } as any);
                } catch {}

                t.endSuccess("welcome_message.success", { status_code: 200 });

                return {
                    adventure_id,
                    session_id,
                    welcome_text: welcomeMd,
                };
            } catch (e: any) {
                Log.error("welcome_message.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAtMs) },
                });
                t.endError("welcome_message.fatal", e, { status_code: 500 });
                throw e;
            }
        }
    );
}
