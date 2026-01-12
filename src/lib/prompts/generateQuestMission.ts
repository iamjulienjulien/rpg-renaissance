// src/lib/prompts/generateQuestMission.ts
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

export type QuestMissionResult = {
    chapter_quest_id: string;
    session_id: string;
    mission_json: any;
    mission_md: string;
    model: string;
    cached: boolean;
};

type QuestMissionCacheRow = {
    chapter_quest_id: string;
    session_id: string;
    mission_json: any;
    mission_md: string;
    model: string;
    updated_at: string;
};

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
Ta tâche maintenant est d’écrire un **ORDRE DE MISSION**.

Un ordre de mission est un plan d’action clair, jouable dans le monde réel.
Il doit aider le joueur à:
- comprendre la quête
- savoir quoi faire maintenant
- avancer étape par étape
- reconnaître la réussite
`.trim();

/**
 * Contraintes fortes sur la sortie.
 * ⚠️ La sortie doit respecter un JSON schema.
 */
const PROMPT_CONSTRAINTS = `
════════════════════════════════════
📐 CONTRAINTES DE SORTIE
════════════════════════════════════

Tu dois produire un JSON conforme au schéma attendu.
Le contenu doit être:
- concret, actionnable, orienté progression
- écrit par le Maître du Jeu (pas de ton neutre)
- sans mention d’IA, de prompt, ni de système

Règles:
- intro: courte, percutante
- objectives_paragraph: explique l’objectif en termes simples
- steps: une liste d’étapes concrètes, ordonnées
- success_paragraph: comment savoir que la quête est accomplie

INTERDICTIONS STRICTES:
- Pas de meta
- Pas de conseils vagues
- Pas de phrases floues
- Pas d’excuses, pas d’hésitations
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

function verbosityToStepBounds(v?: string | null) {
    const vv = safeTrim(v ?? "").toLowerCase();
    if (vv === "concise") return { min: 3, max: 6 };
    if (vv === "verbose") return { min: 6, max: 10 };
    // standard
    return { min: 4, max: 8 };
}

/**
 * Formatte la mission en markdown à partir du JSON validé.
 */
function renderMissionMd(json: any): string {
    const title = typeof json?.title === "string" ? json.title.trim() : "";
    const intro = typeof json?.intro === "string" ? json.intro.trim() : "";
    const obj =
        typeof json?.objectives_paragraph === "string" ? json.objectives_paragraph.trim() : "";
    const steps = Array.isArray(json?.steps)
        ? json.steps.filter((x: any) => typeof x === "string")
        : [];
    const success =
        typeof json?.success_paragraph === "string" ? json.success_paragraph.trim() : "";

    const lines: string[] = [];

    if (title) lines.push(`# ${title}`, ``);
    if (intro) lines.push(intro, ``);

    lines.push(`**🎯 Objectifs**`, ``);
    lines.push(obj || "—", ``);

    lines.push(`**🪜 Étapes**`, ``);
    if (steps.length) lines.push(...steps.map((s: string) => `- ${s.trim()}`), ``);
    else lines.push(`- —`, ``);

    lines.push(`**✅ Réussite**`, ``);
    lines.push(success || "—");

    return lines.join("\n").trim();
}

/* ============================================================================
🗺️ MAIN
============================================================================ */

export async function generateQuestMission(args: {
    chapter_quest_id: string;
    user_id: string;
    force?: boolean;
}): Promise<QuestMissionResult> {
    const request_id = crypto.randomUUID();
    const startedAtMs = Date.now();
    const route = "lib/prompts/generateQuestMission";
    const method = "RUN";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAtMs },
        async () => {
            const t = Log.timer("generateQuestMission", {
                source: "src/lib/prompts/generateQuestMission.ts",
            });

            const chapter_quest_id = safeTrim(args?.chapter_quest_id);
            const user_id = safeTrim(args?.user_id);
            const force = !!args?.force;

            try {
                Log.info("quest_mission.start", {
                    metadata: { chapter_quest_id, user_id, force },
                });

                if (!chapter_quest_id) {
                    Log.warning("quest_mission.missing.chapter_quest_id", { status_code: 400 });
                    t.endError("quest_mission.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing chapter_quest_id");
                }

                if (!user_id) {
                    Log.warning("quest_mission.missing.user_id", { status_code: 400 });
                    t.endError("quest_mission.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing user_id");
                }

                patchRequestContext({ user_id });

                // ✅ supabase admin (fonction -> call)
                const supabase = await supabaseAdmin();

                /* ------------------------------------------------------------
                 1) Charger chapter_quest + session_id + chapter_id + adventure_id
                ------------------------------------------------------------ */
                const q0 = Date.now();
                const { data: cq, error: cqErr } = await supabase
                    .from("chapter_quests")
                    .select("id, session_id, chapter_id, status, adventure_quest_id")
                    .eq("id", chapter_quest_id)
                    .maybeSingle();

                if (cqErr) {
                    Log.error("quest_mission.chapter_quests.select.error", cqErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q0), chapter_quest_id },
                    });
                    t.endError("quest_mission.chapter_quests_select_failed", cqErr, {
                        status_code: 500,
                    });
                    throw new Error(cqErr.message);
                }

                if (!cq?.id) {
                    Log.warning("quest_mission.chapter_quest.not_found", {
                        status_code: 404,
                        metadata: { chapter_quest_id },
                    });
                    t.endError("quest_mission.not_found", undefined, { status_code: 404 });
                    throw new Error("Chapter quest not found");
                }

                const session_id = (cq.session_id ?? null) as string | null;
                const chapter_id = (cq.chapter_id ?? null) as string | null;
                const adventure_quest_id = (cq.adventure_quest_id ?? null) as string | null;

                if (!session_id) {
                    Log.warning("quest_mission.chapter_quest.missing_session_id", {
                        status_code: 500,
                        metadata: { chapter_quest_id },
                    });
                    t.endError("quest_mission.missing_session_id", undefined, { status_code: 500 });
                    throw new Error("Missing session_id on chapter_quests");
                }

                const { data: aq, error: aqErr } = await supabase
                    .from("adventure_quests")
                    .select("id, adventure_id")
                    .eq("id", adventure_quest_id)
                    .maybeSingle();

                if (aqErr) {
                    Log.error("quest_mission.adventure_quest.select.error", cqErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q0), adventure_quest_id },
                    });
                    t.endError("quest_mission.adventure_quest_select_failed", cqErr, {
                        status_code: 500,
                    });
                    throw new Error(aqErr.message);
                }

                if (!aq?.id) {
                    Log.warning("quest_mission.adventure_quest.not_found", {
                        status_code: 404,
                        metadata: { adventure_quest_id },
                    });
                    t.endError("quest_mission.not_found", undefined, { status_code: 404 });
                    throw new Error("Adventure quest not found");
                }

                const adventure_id = (aq.adventure_id ?? null) as string | null;

                patchRequestContext({
                    session_id,
                    chapter_id: chapter_id ?? undefined,
                    adventure_id: adventure_id ?? undefined,
                });

                Log.debug("quest_mission.chapter_quest.ok", {
                    metadata: {
                        ms: msSince(q0),
                        session_id,
                        chapter_id,
                        adventure_id,
                        status: cq.status ?? null,
                        adventure_quest_id,
                    },
                });

                /* ------------------------------------------------------------
                 2) Cache (quest_mission_orders) si pas force
                ------------------------------------------------------------ */
                if (!force) {
                    const c0 = Date.now();
                    const { data: existing, error: cacheErr } = await supabase
                        .from("quest_mission_orders")
                        .select(
                            "chapter_quest_id, session_id, mission_json, mission_md, model, updated_at"
                        )
                        .eq("chapter_quest_id", chapter_quest_id)
                        .eq("session_id", session_id)
                        .maybeSingle();

                    if (cacheErr) {
                        Log.warning("quest_mission.cache.read_failed", {
                            status_code: 200,
                            metadata: {
                                ms: msSince(c0),
                                chapter_quest_id,
                                session_id,
                                error: cacheErr.message,
                            },
                        });
                    }

                    if (existing) {
                        Log.success("quest_mission.cache.hit", {
                            status_code: 200,
                            metadata: {
                                ms: msSince(c0),
                                chapter_quest_id,
                                session_id,
                                model: (existing as any)?.model ?? null,
                            },
                        });

                        // journal best-effort
                        try {
                            await createJournalEntry({
                                session_id,
                                kind: "quest_mission",
                                title: "🧠 Mission (cache)",
                                content: `Mission récupérée depuis le cache pour la quête.`,
                                chapter_id: chapter_id ?? null,
                                // quest_id: chapter_quest_id,
                                adventure_id: adventure_id ?? null,
                                adventure_quest_id: adventure_quest_id ?? null,
                            } as any);
                        } catch {}

                        // log best-effort
                        try {
                            await createAiGenerationLog({
                                session_id,
                                user_id,
                                adventure_id: adventure_id ?? null,
                                chapter_id: chapter_id ?? null,
                                chapter_quest_id,
                                adventure_quest_id: adventure_quest_id ?? null,
                                generation_type: "mission_order",
                                source: "generateQuestMission",
                                provider: "openai",
                                model: (existing as any)?.model ?? "unknown",
                                status: "success",
                                request_json: { cached: true, force: false },
                                context_json: null,
                                response_json: null,
                                output_text: null,
                                parsed_json: (existing as any)?.mission_json ?? null,
                                rendered_md: (existing as any)?.mission_md ?? null,
                                metadata: {
                                    note: "cache_hit",
                                    updated_at: (existing as any)?.updated_at ?? null,
                                },
                            } as any);
                        } catch {}

                        return {
                            chapter_quest_id,
                            session_id,
                            mission_json: (existing as any)?.mission_json ?? null,
                            mission_md: (existing as any)?.mission_md ?? "",
                            model: (existing as any)?.model ?? "unknown",
                            cached: true,
                        };
                    }
                }

                /* ------------------------------------------------------------
                 3) Charger contexts (mode server) + construire prompt
                ------------------------------------------------------------ */
                const ctx0 = Date.now();

                const [playerCtx, characterCtx, questCtx, chapterCtx, adventureCtx] =
                    await Promise.all([
                        getPlayerWithDetailsContext({ mode: "server", user_id }),
                        getCharacterContext({ mode: "server", user_id }),
                        getQuestContext({ mode: "server", chapter_quest_id }),
                        chapter_id
                            ? getChapterContext({ mode: "server", chapter_id })
                            : Promise.resolve(null),
                        adventure_id
                            ? getAdventureContext({ mode: "server", adventure_id })
                            : Promise.resolve(null),
                    ]);

                Log.debug("quest_mission.contexts.loaded", {
                    metadata: {
                        ms: msSince(ctx0),
                        has_player: !!playerCtx,
                        has_character: !!characterCtx,
                        has_quest: !!questCtx,
                        has_chapter: !!chapterCtx,
                        has_adventure: !!adventureCtx,
                    },
                });

                const ctxPrompt = buildContextPrompt({
                    playerWithDetails: playerCtx,
                    character: characterCtx,
                    quest: questCtx,
                    chapter: chapterCtx,
                    adventure: adventureCtx,
                });

                /* ------------------------------------------------------------
                 4) JSON schema dynamique (steps) selon verbosity MJ
                ------------------------------------------------------------ */
                const stepBounds = verbosityToStepBounds(characterCtx?.character_verbosity ?? null);

                const systemText = [GAME_INTRO, PROMPT_INTRO, ctxPrompt.text, PROMPT_CONSTRAINTS]
                    .filter(Boolean)
                    .join("\n");

                const userText =
                    `Génère un ordre de mission JSON conforme au schéma.\n` +
                    `Important: respecte le ton/voix du MJ et le contexte fourni.\n`;

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
                            name: "mission_order_v3",
                            schema: {
                                type: "object",
                                additionalProperties: false,
                                properties: {
                                    title: { type: "string" },
                                    intro: { type: "string" },
                                    objectives_paragraph: { type: "string" },
                                    steps: {
                                        type: "array",
                                        items: { type: "string" },
                                        minItems: stepBounds.min,
                                        maxItems: stepBounds.max,
                                    },
                                    success_paragraph: { type: "string" },
                                },
                                required: [
                                    "title",
                                    "intro",
                                    "objectives_paragraph",
                                    "steps",
                                    "success_paragraph",
                                ],
                            },
                        },
                    },
                };

                /* ------------------------------------------------------------
                 5) Appel IA + parsing + rendu md
                ------------------------------------------------------------ */
                const g0 = Date.now();
                const startedAt = new Date();

                let response: any = null;
                let missionJson: any = null;
                let missionMd: string | null = null;

                try {
                    response = await openai.responses.create(requestPayload as any);
                    missionJson = JSON.parse(response.output_text);
                    missionMd = renderMissionMd(missionJson);
                } catch (err: any) {
                    const finishedAt = new Date();
                    const durationMs = Date.now() - g0;

                    Log.error("quest_mission.openai.error", err, {
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
                            generation_type: "mission_order",
                            source: "generateQuestMission",
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
                            kind: "quest_mission",
                            title: "🧠 Mission (erreur IA)",
                            content:
                                `Échec génération mission.\n` +
                                `Quête: ${safeTrim(questCtx?.quest_title) || "—"}\n` +
                                `Erreur: ${err?.message ? String(err.message) : "Unknown error"}`,
                            chapter_id: chapter_id ?? null,
                            // quest_id: chapter_quest_id,
                            adventure_id: adventure_id ?? null,
                            adventure_quest_id: adventure_quest_id ?? null,
                        } as any);
                    } catch {}

                    t.endError("quest_mission.openai_failed", err, { status_code: 500 });
                    throw err;
                }

                const finishedAt = new Date();
                const durationMs = Date.now() - g0;

                Log.success("quest_mission.openai.ok", {
                    status_code: 200,
                    metadata: {
                        ms: durationMs,
                        model,
                        chapter_quest_id,
                        has_md: !!missionMd,
                        steps: Array.isArray(missionJson?.steps) ? missionJson.steps.length : null,
                    },
                });

                /* ------------------------------------------------------------
                 6) Sauver dans quest_mission_orders (cache) scoped session
                ------------------------------------------------------------ */
                const s0 = Date.now();
                const { data: saved, error: saveErr } = await supabase
                    .from("quest_mission_orders")
                    .upsert(
                        {
                            chapter_quest_id,
                            session_id,
                            mission_json: missionJson,
                            mission_md: missionMd,
                            model,
                        },
                        // même logique que ton fichier d’origine: onConflict sur chapter_quest_id
                        // (si tu veux le scoper strict session, crée un unique(chapter_quest_id, session_id))
                        { onConflict: "chapter_quest_id" }
                    )
                    .select(
                        "chapter_quest_id, session_id, mission_json, mission_md, model, updated_at"
                    )
                    .single();

                if (saveErr) {
                    Log.error("quest_mission.cache.save_failed", saveErr, {
                        status_code: 500,
                        metadata: { ms: msSince(s0), chapter_quest_id, session_id },
                    });

                    try {
                        await createAiGenerationLog({
                            session_id,
                            user_id,
                            adventure_id: adventure_id ?? null,
                            chapter_id: chapter_id ?? null,
                            chapter_quest_id,
                            adventure_quest_id: adventure_quest_id ?? null,
                            generation_type: "mission_order",
                            source: "generateQuestMission",
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
                            },
                            response_json: response,
                            output_text: response?.output_text ?? null,
                            parsed_json: missionJson,
                            parse_error: null,
                            rendered_md: missionMd,
                            error_message: `Mission cache upsert failed: ${saveErr.message}`,
                        } as any);
                    } catch {}

                    t.endError("quest_mission.save_failed", saveErr, { status_code: 500 });
                    throw new Error(saveErr.message);
                }

                Log.success("quest_mission.cache.saved", {
                    status_code: 200,
                    metadata: {
                        ms: msSince(s0),
                        chapter_quest_id,
                        session_id,
                        model,
                        updated_at: (saved as any)?.updated_at ?? null,
                    },
                });

                /* ------------------------------------------------------------
                 7) Logs DB + Journal (success)
                ------------------------------------------------------------ */
                try {
                    await createAiGenerationLog({
                        session_id,
                        user_id,
                        adventure_id: adventure_id ?? null,
                        chapter_id: chapter_id ?? null,
                        chapter_quest_id,
                        adventure_quest_id: adventure_quest_id ?? null,
                        generation_type: "mission_order",
                        source: "generateQuestMission",
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
                        },
                        response_json: response,
                        output_text: response?.output_text ?? null,
                        parsed_json: missionJson,
                        parse_error: null,
                        rendered_md: missionMd,
                        usage_json: (response as any)?.usage ?? null,
                        metadata: { saved_to_cache: true, force },
                    } as any);
                } catch {}

                try {
                    await createJournalEntry({
                        session_id,
                        kind: "quest_mission",
                        title: "🧠 Mission générée",
                        content:
                            `Le MJ a forgé un ordre de mission.\n` +
                            `Quête: ${safeTrim(questCtx?.quest_title) || "—"}\n` +
                            `Modèle: ${model}\n` +
                            `Étapes: ${Array.isArray(missionJson?.steps) ? missionJson.steps.length : "—"}`,
                        chapter_id: chapter_id ?? null,
                        // quest_id: chapter_quest_id,
                        adventure_id: adventure_id ?? null,
                        adventure_quest_id: adventure_quest_id ?? null,
                    } as any);
                } catch {}

                t.endSuccess("quest_mission.success", { status_code: 200 });

                return {
                    chapter_quest_id,
                    session_id,
                    mission_json: (saved as any)?.mission_json ?? missionJson,
                    mission_md: (saved as any)?.mission_md ?? missionMd ?? "",
                    model,
                    cached: false,
                };
            } catch (e: any) {
                Log.error("quest_mission.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAtMs) },
                });
                t.endError("quest_mission.fatal", e, { status_code: 500 });
                throw e;
            }
        }
    );
}
