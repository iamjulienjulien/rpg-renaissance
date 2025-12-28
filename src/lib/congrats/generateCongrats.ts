// src/lib/congrats/generateCongrats.ts
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

// ✅ Logs + Journal
import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";

/* ============================================================================
🧠 TYPES
============================================================================ */

type CharacterStyle = {
    name: string;
    emoji: string | null;
    archetype: string | null;
    vibe: string | null;
    motto: string | null;
    ai_style?: {
        tone?: string;
        style?: string;
        verbosity?: string;
    } | null;
};

type PlayerContext = {
    display_name: string | null;
    character: CharacterStyle | null;
};

export type CongratsContext = {
    chapter_quest_id: string;
    quest_title: string;
    room_code?: string | null;
    difficulty?: number | null;
    mission_md?: string | null;
};

type LoadedContexts = {
    session_id: string | null;
    chapter_id: string | null;
    adventure_id: string | null;
    adventure_context_text: string | null;
    chapter_context_text: string | null;
};

type CongratsJson = {
    title: string;
    message: string;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function normalizeSingle<T>(x: T | T[] | null | undefined): T | null {
    if (!x) return null;
    if (Array.isArray(x)) return x[0] ?? null;
    return x;
}

function difficultyLabel(d?: number | null) {
    if (d == null) return "Standard";
    if (d <= 1) return "Facile";
    if (d === 2) return "Standard";
    return "Difficile";
}

function verbosityRules(v?: string | null) {
    // “félicitations” -> compact par design
    if (v === "short") return { linesMin: 2, linesMax: 4 };
    if (v === "rich") return { linesMin: 4, linesMax: 8 };
    return { linesMin: 3, linesMax: 7 };
}

/* ============================================================================
🔎 DATA LOADERS
============================================================================ */

/**
 * ✅ Login-only
 * Récupère display_name + style du personnage via player_profiles(user_id)
 */
async function loadPlayerContextByUserId(userId: string): Promise<PlayerContext> {
    const supabase = await supabaseServer();

    const { data, error } = await supabase
        .from("player_profiles")
        .select(
            `
            user_id,
            display_name,
            character_id,
            characters:character_id (
                name,
                emoji,
                archetype,
                vibe,
                motto,
                ai_style
            )
        `
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("loadPlayerContextByUserId error:", error.message);
        return { display_name: null, character: null };
    }

    const display_name = safeTrim((data as any)?.display_name) || null;
    const c = normalizeSingle((data as any)?.characters);

    if (!c) {
        return { display_name, character: null };
    }

    return {
        display_name,
        character: {
            name: c.name ?? "Maître du Jeu",
            emoji: c.emoji ?? null,
            archetype: c.archetype ?? null,
            vibe: c.vibe ?? null,
            motto: c.motto ?? null,
            ai_style: c.ai_style ?? null,
        },
    };
}

/**
 * ✅ Contextes (aligné generateMission):
 * - chapter_quests -> chapter_id + session_id
 * - chapters -> context_text + adventure_id
 * - adventures -> context_text
 */
async function loadContextsForChapterQuest(chapterQuestId: string): Promise<LoadedContexts> {
    const supabase = await supabaseServer();

    // 1) chapter_quests
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id, chapter_id, session_id")
        .eq("id", chapterQuestId)
        .maybeSingle();

    if (cqErr) {
        console.warn("loadContextsForChapterQuest chapter_quests warning:", cqErr.message);
        return {
            session_id: null,
            chapter_id: null,
            adventure_id: null,
            adventure_context_text: null,
            chapter_context_text: null,
        };
    }

    if (!cq) {
        return {
            session_id: null,
            chapter_id: null,
            adventure_id: null,
            adventure_context_text: null,
            chapter_context_text: null,
        };
    }

    const session_id = (cq as any)?.session_id ?? null;
    const chapter_id = (cq as any)?.chapter_id ?? null;

    // 2) chapters -> context_text + adventure_id
    let adventure_id: string | null = null;
    let chapter_context_text: string | null = null;

    if (chapter_id) {
        const { data: ch, error: chErr } = await supabase
            .from("chapters")
            .select("context_text, adventure_id")
            .eq("id", chapter_id)
            .maybeSingle();

        if (chErr) {
            console.warn("loadContextsForChapterQuest chapters warning:", chErr.message);
        } else {
            const ctx = safeTrim((ch as any)?.context_text);
            chapter_context_text = ctx.length ? ctx : null;
            adventure_id = (ch as any)?.adventure_id ?? null;
        }
    }

    // 3) adventures -> context_text
    let adventure_context_text: string | null = null;

    if (adventure_id) {
        const { data: adv, error: advErr } = await supabase
            .from("adventures")
            .select("context_text")
            .eq("id", adventure_id)
            .maybeSingle();

        if (advErr) {
            console.warn("loadContextsForChapterQuest adventures warning:", advErr.message);
        } else {
            const advCtx = safeTrim((adv as any)?.context_text);
            adventure_context_text = advCtx.length ? advCtx : null;
        }
    }

    return {
        session_id,
        chapter_id,
        adventure_id,
        adventure_context_text,
        chapter_context_text,
    };
}

/* ============================================================================
🎉 MAIN
============================================================================ */

/**
 * ✅ Félicitations IA (non stockées en BDD)
 * - Générées au startQuest (prefetch)
 * - Affichées plus tard dans la modal Renown
 *
 * ✅ Ajouts:
 * - Log BDD (ai_generations)
 * - Entrée journal (trace visible “jeu”)
 */
export async function generateCongratsForQuest(input: CongratsContext) {
    const supabase = await supabaseServer();

    // ✅ Auth obligatoire (login-only)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(authErr.message);

    const userId = authData?.user?.id ?? "";
    if (!userId) throw new Error("Not authenticated");

    const chapterQuestId = safeTrim(input.chapter_quest_id);
    if (!chapterQuestId) throw new Error("Missing chapter_quest_id");

    // 0) Contextes (global aventure + chapitre)
    const ctx = await loadContextsForChapterQuest(chapterQuestId);

    // 1) Style joueur/personnage
    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "motivant";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    // 2) Préparer OpenAI request
    const model = "gpt-4.1";
    const provider = "openai";

    const systemText = [
        `Tu es le Maître du Jeu de Renaissance.`,
        `Tu écris des FÉLICITATIONS pour une quête terminée.`,
        `Objectif: célébrer sans sucre inutile, ancrer la victoire, donner une micro-projection (1 phrase max).`,
        `Style: RPG moderne, concret, humain. Emojis sobres.`,
        character
            ? `Voix actuelle: ${character.emoji ?? "🧙"} ${character.name}. Tone=${tone}, style=${style}, verbosity=${verbosity}.`
            : `Voix actuelle: neutre.`,
        playerName
            ? `Le joueur s'appelle "${playerName}". Utilise son nom 0 à 1 fois maximum.`
            : `Le joueur n'a pas de nom affiché. N'invente pas de prénom.`,

        // ✅ Contexte global (aventure)
        ctx.adventure_context_text
            ? `CONTEXTE GLOBAL D’AVENTURE (cadre général, priorités, contraintes globales, objectifs long-terme):\n${ctx.adventure_context_text}`
            : `CONTEXTE GLOBAL D’AVENTURE: (aucun fourni).`,

        // ✅ Contexte spécifique (chapitre)
        ctx.chapter_context_text
            ? `CONTEXTE SPÉCIFIQUE DE CE CHAPITRE (focus local, angle du moment; c’est une partie de l’aventure):\n${ctx.chapter_context_text}`
            : `CONTEXTE SPÉCIFIQUE DE CE CHAPITRE: (aucun fourni).`,

        `Règle d’or: si les deux contextes existent, respecte le global en premier, puis adapte finement au chapitre.`,
        character?.motto
            ? `Serment du personnage (à refléter sans le citer mot pour mot): ${character.motto}`
            : null,
        `Contraintes: ${rules.linesMin} à ${rules.linesMax} lignes max.`,
        `Termine par une micro-projection (une seule phrase, pas une liste).`,
        `Interdit: disclaimer, "en tant qu'IA", explications techniques, meta.`,
        `La sortie doit respecter STRICTEMENT le schéma JSON demandé.`,
    ]
        .filter(Boolean)
        .join("\n");

    const contextJson = {
        quest_title: safeTrim(input.quest_title) || "Quête",
        room_code: input.room_code ?? null,
        difficulty: difficultyLabel(input.difficulty),
        mission_hint: safeTrim(input.mission_md ?? "").slice(0, 900) || null,

        // ids best-effort (utile debug)
        session_id: ctx.session_id,
        chapter_id: ctx.chapter_id,
        adventure_id: ctx.adventure_id,

        // ✅ Hiérarchie explicite (utile au modèle)
        adventure_context: ctx.adventure_context_text ?? "",
        chapter_context: ctx.chapter_context_text ?? "",
    };

    const userInputText =
        `Contexte:\n${JSON.stringify(contextJson, null, 2)}\n\n` +
        `Génère:\n` +
        `- title (court, 2 à 6 mots, style “sceau”)\n` +
        `- message (félicitations)\n`;

    const requestJson = {
        model,
        input: [
            { role: "system", content: [{ type: "input_text", text: systemText }] },
            { role: "user", content: [{ type: "input_text", text: userInputText }] },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "quest_congrats_v2",
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

    // 3) Timing + log start
    const startedAt = new Date();

    // Journal: “une génération a été demandée”
    if (ctx.session_id) {
        await Promise.allSettled([
            createJournalEntry({
                session_id: ctx.session_id,
                kind: "note",
                title: "🎉 Le MJ aiguise les lauriers",
                content: `Génération de félicitations pour: ${safeTrim(input.quest_title) || "Quête"}.`,
                chapter_id: ctx.chapter_id,
                quest_id: null,
                adventure_quest_id: null,
            }),
        ]);
    }

    // 4) OpenAI call + parsing
    let response: any = null;
    let outputText: string | null = null;
    let parsed: CongratsJson | null = null;
    let parseError: string | null = null;

    try {
        response = await openai.responses.create(requestJson as any);
        outputText = typeof response?.output_text === "string" ? response.output_text : null;

        try {
            parsed = outputText ? (JSON.parse(outputText) as CongratsJson) : null;
        } catch (e: any) {
            parseError = e?.message ? String(e.message) : "JSON parse error";
            parsed = null;
        }

        if (!parsed?.title || !parsed?.message) {
            throw new Error(parseError ?? "Invalid congrats JSON output");
        }

        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();

        // ✅ Log success
        await Promise.allSettled([
            ctx.session_id
                ? createAiGenerationLog({
                      session_id: ctx.session_id,
                      user_id: userId,

                      generation_type: "congrats",
                      source: "generateCongratsForQuest",

                      chapter_quest_id: chapterQuestId,
                      chapter_id: ctx.chapter_id,
                      adventure_id: ctx.adventure_id,

                      provider,
                      model,

                      status: "success",
                      error_message: null,
                      error_code: null,

                      started_at: startedAt,
                      finished_at: finishedAt,
                      duration_ms: durationMs,

                      request_json: requestJson,
                      system_text: systemText,
                      user_input_text: userInputText,
                      context_json: contextJson,

                      response_json: response,
                      output_text: outputText,
                      parsed_json: parsed,
                      parse_error: parseError,

                      rendered_md: null, // pas de markdown final ici

                      usage_json: response?.usage ?? null,
                      tags: ["congrats"],
                      metadata: {
                          tone,
                          style,
                          verbosity,
                          character_name: character?.name ?? null,
                          character_emoji: character?.emoji ?? null,
                      },
                  })
                : Promise.resolve(null),
        ]);

        // ✅ Journal: “résultat dispo”
        if (ctx.session_id) {
            await Promise.allSettled([
                createJournalEntry({
                    session_id: ctx.session_id,
                    kind: "note",
                    title: `🏆 ${safeTrim(parsed.title) || "Bravo"}`,
                    content: safeTrim(parsed.message) || null,
                    chapter_id: ctx.chapter_id,
                    quest_id: null,
                    adventure_quest_id: null,
                }),
            ]);
        }

        return {
            congrats: parsed,
            meta: {
                model,
                tone,
                style,
                verbosity,
                character_name: character?.name ?? null,
                character_emoji: character?.emoji ?? null,
            },
        };
    } catch (e: any) {
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();
        const errorMessage = e?.message ? String(e.message) : "OpenAI request failed";

        // ✅ Log error (best-effort)
        await Promise.allSettled([
            ctx.session_id
                ? createAiGenerationLog({
                      session_id: ctx.session_id,
                      user_id: userId,

                      generation_type: "congrats",
                      source: "generateCongratsForQuest",

                      chapter_quest_id: chapterQuestId,
                      chapter_id: ctx.chapter_id,
                      adventure_id: ctx.adventure_id,

                      provider,
                      model,

                      status: "error",
                      error_message: errorMessage,
                      error_code: null,

                      started_at: startedAt,
                      finished_at: finishedAt,
                      duration_ms: durationMs,

                      request_json: requestJson,
                      system_text: systemText,
                      user_input_text: userInputText,
                      context_json: contextJson,

                      response_json: response,
                      output_text: outputText,
                      parsed_json: parsed,
                      parse_error: parseError,

                      rendered_md: null,

                      usage_json: response?.usage ?? null,
                      tags: ["congrats", "error"],
                      metadata: {
                          tone,
                          style,
                          verbosity,
                          character_name: character?.name ?? null,
                          character_emoji: character?.emoji ?? null,
                      },
                  })
                : Promise.resolve(null),
        ]);

        // ✅ Journal: trace soft (pas obligatoire)
        if (ctx.session_id) {
            await Promise.allSettled([
                createJournalEntry({
                    session_id: ctx.session_id,
                    kind: "note",
                    title: "⚠️ Le MJ trébuche",
                    content: `Échec génération félicitations: ${errorMessage}`,
                    chapter_id: ctx.chapter_id,
                    quest_id: null,
                    adventure_quest_id: null,
                }),
            ]);
        }

        throw new Error(errorMessage);
    }
}
