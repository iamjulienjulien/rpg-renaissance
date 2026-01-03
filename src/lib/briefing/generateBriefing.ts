// src/lib/briefing/generateBriefing.ts
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

// ✅ Logs + Journal
import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type AdventureInfo = {
    code: string;
    title: string;
    emoji: string;
    baseGoal: string;
    steps: string[];
};

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

type BriefingJson = {
    title: string;
    intro: string;
    bullets: string[];
    rules_paragraph: string;
    outro: string;
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

function verbosityRules(v?: string | null) {
    if (v === "short") return { maxIntroLines: 2, bulletsMin: 3, bulletsMax: 5 };
    if (v === "rich") return { maxIntroLines: 4, bulletsMin: 5, bulletsMax: 9 };
    return { maxIntroLines: 3, bulletsMin: 4, bulletsMax: 8 };
}

// Petit mapping “safe” (ton schema adventure_types ne contient pas emoji)
function emojiForAdventureTypeCode(code?: string | null): string {
    const c = safeTrim(code).toLowerCase();
    if (!c) return "🧭";
    if (c.includes("home") || c.includes("foyer")) return "🏠";
    if (c.includes("mind") || c.includes("esprit")) return "🧠";
    if (c.includes("body") || c.includes("corps")) return "🚶";
    return "🧭";
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

    if (!c) return { display_name, character: null };

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

type AdventureTypeRow = {
    code?: string | null;
    title?: string | null;
    description?: string | null;
};

/**
 * ✅ NEW: charge l’aventure “instance” + son type (si dispo)
 * ⚠️ Important: selon ton schéma, adventure_types n'a QUE code/title/description.
 * Donc emoji/base_goal/steps = fallback côté instance.
 */
async function loadAdventureInfoById(adventureId: string): Promise<AdventureInfo> {
    const supabase = await supabaseServer();

    // 1) adventure instance (ton schéma adventures)
    const { data: adv, error: advErr } = await supabase
        .from("adventures")
        .select(
            "id,title,description,context_text,type_id,legacy_type_code,instance_code,session_id"
        )
        .eq("id", adventureId)
        .single();

    if (advErr || !adv) {
        throw new Error(advErr?.message ?? "Adventure not found");
    }

    // 2) adventure type (si dispo)
    let typeRow: AdventureTypeRow | null = null;

    if ((adv as any).type_id) {
        const { data: t, error: tErr } = await supabase
            .from("adventure_types")
            .select("code,title,description")
            .eq("id", (adv as any).type_id)
            .maybeSingle();

        if (!tErr && t) typeRow = t as any;
    }

    // 3) map -> AdventureInfo (fallbacks)
    const code =
        safeTrim((typeRow as any)?.code) ||
        safeTrim((adv as any)?.legacy_type_code) ||
        safeTrim((adv as any)?.instance_code) ||
        "adventure";

    const title = safeTrim((adv as any)?.title) || safeTrim((typeRow as any)?.title) || "Aventure";

    // emoji: pas en DB pour l’instant -> mapping depuis code
    const emoji = emojiForAdventureTypeCode(code);

    // baseGoal: on privilégie description, puis context_text, puis description du type
    const baseGoal =
        safeTrim((adv as any)?.description) ||
        safeTrim((adv as any)?.context_text) ||
        safeTrim((typeRow as any)?.description) ||
        "Clarifier ton chemin et avancer.";

    // steps: pas en DB pour l’instant -> vide (tu pourras ajouter plus tard si tu ajoutes une colonne steps)
    const steps: string[] = [];

    return {
        code,
        title,
        emoji,
        baseGoal,
        steps,
    };
}

/**
 * ✅ NEW: API minimale = adventure_id
 * - Charge les infos utiles depuis la BDD
 * - Délègue à generateBriefingForAdventure()
 */
export async function generateBriefingForAdventureId(adventureId: string) {
    const adventure = await loadAdventureInfoById(adventureId);
    return generateBriefingForAdventure(adventure);
}

/* ============================================================================
🧭 MAIN
============================================================================ */

/**
 * ✅ Briefing IA pour une aventure (non stocké en BDD).
 * - Se régénère quand le personnage change (ou quand tu le décides côté cache UI)
 *
 * ✅ Ajouts:
 * - Log BDD (ai_generations)
 * - Entrée journal (trace visible “jeu”)
 *
 * ⚠️ Note: cette fonction n’a pas de session_id en param.
 * On le récupère via player_profiles.session_id si présent, sinon on log en best-effort.
 */
export async function generateBriefingForAdventure(adventure: AdventureInfo) {
    const supabase = await supabaseServer();

    // ✅ Auth obligatoire (login-only)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(authErr.message);

    const userId = authData?.user?.id ?? "";
    if (!userId) throw new Error("Not authenticated");

    // 0) Charger contexte joueur/personnage + (best-effort) session_id depuis player_profiles
    const player = await loadPlayerContextByUserId(userId);

    const { data: profileRow } = await supabase
        .from("player_profiles")
        .select("session_id")
        .eq("user_id", userId)
        .maybeSingle();

    const sessionId =
        typeof (profileRow as any)?.session_id === "string"
            ? String((profileRow as any).session_id)
            : null;

    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "motivant";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    // 1) Préparer OpenAI request
    const model = "gpt-4.1";
    const provider = "openai";

    const systemText = [
        `Tu es le Maître du Jeu de Renaissance.`,
        `Tu écris un BRIEFING D’AVENTURE (pas une quête).`,
        `Objectif: donner envie, clarifier la boucle de gameplay, et imprimer une voix de personnage.`,
        `Style: RPG moderne, concret, inspirant. Zéro blabla meta.`,
        `Emojis sobres.`,
        character
            ? `Voix actuelle: ${character.emoji ?? "🧙"} ${character.name}. Tone=${tone}, style=${style}, verbosity=${verbosity}.`
            : `Voix actuelle: neutre.`,
        playerName
            ? `Le joueur s'appelle "${playerName}". Utilise son nom 0 à 1 fois maximum, plutôt dans l’intro.`
            : `Le joueur n'a pas de nom affiché. N'invente pas de prénom.`,
        character?.motto
            ? `Serment du personnage (à refléter sans le citer mot pour mot): ${character.motto}`
            : null,
        `Contraintes: intro <= ${rules.maxIntroLines} lignes. Bullets ${rules.bulletsMin}-${rules.bulletsMax}.`,
        `Interdit: disclaimer, "en tant qu'IA", explications techniques.`,
        `La sortie doit respecter STRICTEMENT le schéma JSON demandé.`,
    ]
        .filter(Boolean)
        .join("\n");

    const contextJson = {
        adventure_code: safeTrim(adventure.code),
        title: safeTrim(adventure.title),
        emoji: safeTrim(adventure.emoji),
        base_goal: safeTrim(adventure.baseGoal),
        neutral_steps: Array.isArray(adventure.steps)
            ? adventure.steps.map((s) => safeTrim(s))
            : [],

        // debug soft
        user_id: userId,
        session_id: sessionId,
        character_name: character?.name ?? null,
        character_emoji: character?.emoji ?? null,
    };

    const userInputText =
        `Contexte aventure:\n${JSON.stringify(contextJson, null, 2)}\n\n` +
        `Génère ces champs:\n` +
        `- title (court)\n` +
        `- intro (voix du personnage)\n` +
        `- bullets (plan d’action jouable)\n` +
        `- rules_paragraph (1 paragraphe: règle score/renown)\n` +
        `- outro (1-2 phrases de clôture)\n`;

    const requestJson = {
        model,
        input: [
            { role: "system", content: [{ type: "input_text", text: systemText }] },
            { role: "user", content: [{ type: "input_text", text: userInputText }] },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "adventure_briefing_v1",
                schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        title: { type: "string" },
                        intro: { type: "string" },
                        bullets: {
                            type: "array",
                            items: { type: "string" },
                            minItems: rules.bulletsMin,
                            maxItems: rules.bulletsMax,
                        },
                        rules_paragraph: { type: "string" },
                        outro: { type: "string" },
                    },
                    required: ["title", "intro", "bullets", "rules_paragraph", "outro"],
                },
            },
        },
    };

    // 2) Timing + journal start
    const startedAt = new Date();

    if (sessionId) {
        await Promise.allSettled([
            createJournalEntry({
                session_id: sessionId,
                kind: "note",
                title: "🧭 Brief d’aventure en cours",
                content: `Le MJ prépare le briefing pour: ${safeTrim(adventure.title) || "Aventure"}.`,
                chapter_id: null,
                quest_id: null,
                adventure_quest_id: null,
            }),
        ]);
    }

    // 3) OpenAI call + parsing
    let response: any = null;
    let outputText: string | null = null;
    let parsed: BriefingJson | null = null;
    let parseError: string | null = null;

    try {
        response = await openai.responses.create(requestJson as any);
        outputText = typeof response?.output_text === "string" ? response.output_text : null;

        try {
            parsed = outputText ? (JSON.parse(outputText) as BriefingJson) : null;
        } catch (e: any) {
            parseError = e?.message ? String(e.message) : "JSON parse error";
            parsed = null;
        }

        if (
            !parsed?.title ||
            !parsed?.intro ||
            !Array.isArray(parsed?.bullets) ||
            !parsed?.rules_paragraph ||
            !parsed?.outro
        ) {
            throw new Error(parseError ?? "Invalid briefing JSON output");
        }

        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();

        // ✅ Log success (best-effort, dépend de sessionId)
        await Promise.allSettled([
            sessionId
                ? createAiGenerationLog({
                      session_id: sessionId,
                      user_id: userId,

                      generation_type: "adventure_briefing",
                      source: "generateBriefingForAdventure",

                      chapter_quest_id: null,
                      chapter_id: null,
                      adventure_id: null, // (si tu as un id BDD plus tard, tu pourras le passer)

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

                      rendered_md: null,

                      usage_json: response?.usage ?? null,
                      tags: ["briefing", "adventure"],
                      metadata: {
                          tone,
                          style,
                          verbosity,
                          character_name: character?.name ?? null,
                          character_emoji: character?.emoji ?? null,
                          adventure_code: safeTrim(adventure.code) || null,
                      },
                  })
                : Promise.resolve(null),
        ]);

        // ✅ Journal: trace visible (best-effort)
        if (sessionId) {
            await Promise.allSettled([
                createJournalEntry({
                    session_id: sessionId,
                    kind: "note",
                    title: `🧾 Brief: ${safeTrim(adventure.title) || safeTrim(adventure.code) || "Aventure"}`,
                    content:
                        `${safeTrim(parsed.intro)}\n\n` +
                        `• ${parsed.bullets
                            .map((b) => safeTrim(b))
                            .filter(Boolean)
                            .join("\n• ")}\n\n` +
                        `${safeTrim(parsed.outro)}`,
                    chapter_id: null,
                    quest_id: null,
                    adventure_quest_id: null,
                }),
            ]);
        }

        return {
            briefing: parsed,
            meta: {
                model,
                tone,
                style,
                verbosity,
                character_name: character?.name ?? null,
            },
        };
    } catch (e: any) {
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();
        const errorMessage = e?.message ? String(e.message) : "OpenAI request failed";

        // ✅ Log error (best-effort)
        await Promise.allSettled([
            sessionId
                ? createAiGenerationLog({
                      session_id: sessionId,
                      user_id: userId,

                      generation_type: "adventure_briefing",
                      source: "generateBriefingForAdventure",

                      chapter_quest_id: null,
                      chapter_id: null,
                      adventure_id: null,

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
                      tags: ["briefing", "adventure", "error"],
                      metadata: {
                          tone,
                          style,
                          verbosity,
                          character_name: character?.name ?? null,
                          character_emoji: character?.emoji ?? null,
                          adventure_code: safeTrim(adventure.code) || null,
                      },
                  })
                : Promise.resolve(null),
        ]);

        // ✅ Journal: trace soft
        if (sessionId) {
            await Promise.allSettled([
                createJournalEntry({
                    session_id: sessionId,
                    kind: "note",
                    title: "⚠️ Brief d’aventure interrompu",
                    content: `Échec génération briefing: ${errorMessage}`,
                    chapter_id: null,
                    quest_id: null,
                    adventure_quest_id: null,
                }),
            ]);
        }

        throw new Error(errorMessage);
    }
}
