// src/lib/encouragement/generateEncouragement.ts
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

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

export type EncouragementContext = {
    chapter_quest_id: string; // ✅ clé pivot

    quest_title: string;
    room_code?: string | null;
    difficulty?: number | null;
    mission_md?: string | null;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function difficultyLabel(d?: number | null) {
    if (d == null) return "Standard";
    if (d <= 1) return "Facile";
    if (d === 2) return "Standard";
    return "Difficile";
}

function verbosityRules(v?: string | null) {
    // Encouragement = compact
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
 * ✅ Contexte global (aventure) + spécifique (chapitre) depuis chapter_quest_id
 * chapter_quests -> chapters(context_text, adventure_id) -> adventures(context_text)
 */
async function loadContextsByChapterQuestId(chapterQuestId: string): Promise<{
    session_id: string | null;
    chapter_id: string | null;
    adventure_id: string | null;
    adventure_context: string | null;
    chapter_context: string | null;
}> {
    const supabase = await supabaseServer();

    // 1) chapter_quests -> session_id + chapter_id
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id, session_id, chapter_id")
        .eq("id", chapterQuestId)
        .maybeSingle();

    if (cqErr) {
        console.warn("loadContextsByChapterQuestId: chapter_quests warning:", cqErr.message);
        return {
            session_id: null,
            chapter_id: null,
            adventure_id: null,
            adventure_context: null,
            chapter_context: null,
        };
    }

    const session_id = (cq as any)?.session_id ?? null;
    const chapter_id = (cq as any)?.chapter_id ?? null;

    if (!chapter_id) {
        return {
            session_id,
            chapter_id: null,
            adventure_id: null,
            adventure_context: null,
            chapter_context: null,
        };
    }

    // 2) chapters -> context_text + adventure_id
    const { data: ch, error: chErr } = await supabase
        .from("chapters")
        .select("context_text, adventure_id")
        .eq("id", chapter_id)
        .maybeSingle();

    if (chErr) {
        console.warn("loadContextsByChapterQuestId: chapters warning:", chErr.message);
        return {
            session_id,
            chapter_id,
            adventure_id: null,
            adventure_context: null,
            chapter_context: null,
        };
    }

    const chapterCtx = safeTrim((ch as any)?.context_text);
    const chapter_context = chapterCtx.length ? chapterCtx : null;

    const adventure_id = (ch as any)?.adventure_id ?? null;
    if (!adventure_id) {
        return {
            session_id,
            chapter_id,
            adventure_id: null,
            adventure_context: null,
            chapter_context,
        };
    }

    // 3) adventures -> context_text
    const { data: adv, error: advErr } = await supabase
        .from("adventures")
        .select("context_text")
        .eq("id", adventure_id)
        .maybeSingle();

    if (advErr) {
        console.warn("loadContextsByChapterQuestId: adventures warning:", advErr.message);
        return { session_id, chapter_id, adventure_id, adventure_context: null, chapter_context };
    }

    const advCtx = safeTrim((adv as any)?.context_text);
    const adventure_context = advCtx.length ? advCtx : null;

    return { session_id, chapter_id, adventure_id, adventure_context, chapter_context };
}

/* ============================================================================
💪 MAIN
============================================================================ */

/**
 * ✅ Encouragement IA (non stocké en BDD)
 * - Encourage une quête EN COURS
 * - Utilise 2 contextes:
 *   - adventures.context_text = contexte global
 *   - chapters.context_text   = contexte chapitre
 */
export async function generateEncouragementForQuest(input: EncouragementContext) {
    const supabase = await supabaseServer();

    // ✅ Auth obligatoire (login-only)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(authErr.message);

    const userId = authData?.user?.id ?? "";
    if (!userId) throw new Error("Not authenticated");

    // 1) Style joueur/personnage
    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "motivant";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    // 2) Contextes (global aventure + chapitre)
    const ctx = input.chapter_quest_id
        ? await loadContextsByChapterQuestId(input.chapter_quest_id)
        : {
              session_id: null,
              chapter_id: null,
              adventure_id: null,
              adventure_context: null,
              chapter_context: null,
          };

    // 3) Génération OpenAI
    const model = "gpt-4.1";

    const systemText = [
        `Tu es le Maître du Jeu de Renaissance.`,
        `Tu écris un ENCOURAGEMENT court et impactant pour une quête EN COURS.`,
        `Objectif: rebooster, recentrer, et donner UN mini prochain pas.`,
        `Style: RPG moderne, concret, humain. Emojis sobres.`,
        character
            ? `Voix: ${character.emoji ?? "🧙"} ${character.name}. Tone=${tone}, style=${style}, verbosity=${verbosity}.`
            : `Voix: neutre.`,
        playerName
            ? `Le joueur s'appelle "${playerName}". Utilise son nom 0 à 1 fois maximum.`
            : `Le joueur n'a pas de nom affiché. N'invente pas de prénom.`,

        // ✅ Contexte global (aventure)
        ctx.adventure_context
            ? `CONTEXTE GLOBAL D’AVENTURE (cadre général, priorités, contraintes globales, objectifs long-terme):\n${ctx.adventure_context}`
            : `CONTEXTE GLOBAL D’AVENTURE: (aucun fourni).`,

        // ✅ Contexte spécifique (chapitre)
        ctx.chapter_context
            ? `CONTEXTE SPÉCIFIQUE DE CE CHAPITRE (focus local, angle du moment; c’est une partie de l’aventure):\n${ctx.chapter_context}`
            : `CONTEXTE SPÉCIFIQUE DE CE CHAPITRE: (aucun fourni).`,

        `Règle d’or: si les deux contextes existent, respecte le global en premier, puis adapte finement au chapitre.`,
        character?.motto
            ? `Serment (à refléter sans citer mot pour mot): ${character.motto}`
            : null,
        `Contraintes: ${rules.linesMin} à ${rules.linesMax} lignes. Termine par UNE micro-consigne (un seul pas, pas une liste).`,
        `Interdit: meta, disclaimers, "en tant qu'IA", explications techniques.`,
        `La sortie doit respecter STRICTEMENT le schéma JSON demandé.`,
    ]
        .filter(Boolean)
        .join("\n");

    const userContext = {
        quest_title: safeTrim(input.quest_title) || "Quête",
        room_code: input.room_code ?? null,
        difficulty: difficultyLabel(input.difficulty),
        mission_hint: safeTrim(input.mission_md ?? "").slice(0, 800) || null,

        // utile à l’IA (redondant mais clair)
        adventure_context: ctx.adventure_context ?? "",
        chapter_context: ctx.chapter_context ?? "",

        // debug soft si besoin (sans être obligatoire)
        session_id: ctx.session_id,
        chapter_id: ctx.chapter_id,
        adventure_id: ctx.adventure_id,
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
                            `Contexte:\n${JSON.stringify(userContext, null, 2)}\n\n` +
                            `Génère:\n` +
                            `- title (court, 2 à 5 mots)\n` +
                            `- message (encouragement)\n`,
                    },
                ],
            },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "quest_encouragement_v1",
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
    });

    const encouragement = JSON.parse(response.output_text);

    return {
        encouragement,
        meta: {
            model,
            tone,
            style,
            verbosity,
            character_name: character?.name ?? null,
            character_emoji: character?.emoji ?? null,
        },
    };
}
