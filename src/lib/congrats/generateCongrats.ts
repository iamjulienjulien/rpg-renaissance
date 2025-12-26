// src/lib/congrats/generateCongrats.ts
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

export type CongratsContext = {
    chapter_quest_id: string;
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
    // “félicitations” -> compact par design
    if (v === "short") return { linesMin: 2, linesMax: 4 };
    if (v === "rich") return { linesMin: 4, linesMax: 8 };
    return { linesMin: 3, linesMax: 7 };
}

/* ============================================================================
🔎 DATA LOADERS (aligné generateMission)
============================================================================ */

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
 * ✅ Même logique que generateMission:
 * - chapter_quests -> chapter_id + session_id
 * - chapters -> context_text + adventure_id
 * - adventures -> context_text
 */
async function loadContextsForChapterQuest(chapterQuestId: string): Promise<{
    session_id: string | null;
    chapter_id: string | null;
    adventure_id: string | null;
    adventure_context_text: string | null;
    chapter_context_text: string | null;
}> {
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
🎉 MAIN (structure proche generateMission)
============================================================================ */

/**
 * ✅ Félicitations IA (non stockées en BDD)
 * - Générées au startQuest (prefetch)
 * - Affichées plus tard dans la modal Renown
 */
export async function generateCongratsForQuest(input: CongratsContext) {
    const supabase = await supabaseServer();

    // ✅ Auth obligatoire (login-only)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(authErr.message);

    const userId = authData?.user?.id ?? "";
    if (!userId) throw new Error("Not authenticated");

    // 0) Contexte global (aventure) + spécifique (chapitre)
    const ctx = await loadContextsForChapterQuest(input.chapter_quest_id);

    // 1) Style personnage + display_name
    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "motivant";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    // 2) Génération OpenAI
    const model = "gpt-4.1";

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

    const context = {
        quest_title: safeTrim(input.quest_title),
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
                            `Contexte:\n${JSON.stringify(context, null, 2)}\n\n` +
                            `Génère:\n` +
                            `- title (court, 2 à 6 mots, style “sceau”)\n` +
                            `- message (félicitations)\n`,
                    },
                ],
            },
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
    });

    const congrats = JSON.parse(response.output_text);

    return {
        congrats,
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
