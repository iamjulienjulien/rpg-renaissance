// src/lib/briefing/generateBriefing.ts
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

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

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function verbosityRules(v?: string | null) {
    if (v === "short") return { maxIntroLines: 2, bulletsMin: 3, bulletsMax: 5 };
    if (v === "rich") return { maxIntroLines: 4, bulletsMin: 5, bulletsMax: 9 };
    return { maxIntroLines: 3, bulletsMin: 4, bulletsMax: 8 };
}

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
    const c = (data as any)?.characters ?? null;

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

/**
 * ✅ Briefing IA pour une aventure (non stocké en BDD pour l’instant).
 * Se régénère quand le personnage change.
 */
export async function generateBriefingForAdventure(adventure: AdventureInfo) {
    const supabase = await supabaseServer();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(authErr.message);

    const userId = authData?.user?.id ?? "";
    if (!userId) throw new Error("Not authenticated");

    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "motivant";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    const model = "gpt-4.1";

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
        `La sortie doit respecter le schéma JSON demandé.`,
    ]
        .filter(Boolean)
        .join("\n");

    const context = {
        adventure_code: adventure.code,
        title: adventure.title,
        base_goal: adventure.baseGoal,
        neutral_steps: adventure.steps,
    };

    const response = await openai.responses.create({
        model,
        input: [
            { role: "system", content: [{ type: "input_text", text: systemText }] },
            {
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text:
                            `Contexte aventure:\n${JSON.stringify(context, null, 2)}\n\n` +
                            `Génère ces champs:\n` +
                            `- title (court)\n` +
                            `- intro (voix du personnage)\n` +
                            `- bullets (plan d’action jouable)\n` +
                            `- rules_paragraph (1 paragraphe: règle score/renown)\n` +
                            `- outro (1-2 phrases de clôture)\n`,
                    },
                ],
            },
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
    });

    const briefing = JSON.parse(response.output_text);

    return {
        briefing,
        meta: {
            model,
            tone,
            style,
            verbosity,
            character_name: character?.name ?? null,
        },
    };
}
