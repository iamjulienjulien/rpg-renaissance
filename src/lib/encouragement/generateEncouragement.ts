// src/lib/encouragement/generateEncouragement.ts
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

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
    // ✅ déjà ajouté chez toi côté input: on l’utilise ici
    chapter_quest_id: string;

    quest_title: string;
    room_code?: string | null;
    difficulty?: number | null;
    mission_md?: string | null;
};

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
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

function difficultyLabel(d?: number | null) {
    if (d == null) return "Standard";
    if (d <= 1) return "Facile";
    if (d === 2) return "Standard";
    return "Difficile";
}

/**
 * ✅ Charge chapters.context_text à partir d’un chapter_quest_id
 * (chapter_quests -> chapter_id -> chapters.context_text)
 */
async function loadChapterContextTextByChapterQuestId(
    chapterQuestId: string
): Promise<string | null> {
    const supabase = await supabaseServer();

    // 1) chapter_id depuis chapter_quests
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id, chapter_id")
        .eq("id", chapterQuestId)
        .maybeSingle();

    if (cqErr) {
        console.warn("loadChapterContextText: chapter_quests warning:", cqErr.message);
        return null;
    }

    const chapterId = (cq as any)?.chapter_id as string | null;
    if (!chapterId) return null;

    // 2) context_text depuis chapters
    const { data: ch, error: chErr } = await supabase
        .from("chapters")
        .select("context_text")
        .eq("id", chapterId)
        .maybeSingle();

    if (chErr) {
        console.warn("loadChapterContextText: chapters warning:", chErr.message);
        return null;
    }

    const ctx = safeTrim((ch as any)?.context_text);
    return ctx.length ? ctx : null;
}

/**
 * ✅ Encouragement IA (non stocké en BDD).
 * Ton/style reflètent le personnage actif.
 */
export async function generateEncouragementForQuest(input: EncouragementContext) {
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

    // ✅ Contexte “aventure” (texte joueur)
    const chapterContextText = input.chapter_quest_id
        ? await loadChapterContextTextByChapterQuestId(input.chapter_quest_id)
        : null;

    const model = "gpt-4.1";

    const systemText = [
        `Tu es le Maître du Jeu de Renaissance.`,
        `Tu écris un ENCOURAGEMENT court et impactant pour une quête EN COURS.`,
        `Objectif: rebooster, recentrer, donner un mini prochain pas. Pas de blabla meta.`,
        `Style: RPG moderne, concret, chaleureux (selon le ton). Emojis sobres.`,
        character
            ? `Voix actuelle: ${character.emoji ?? "🧙"} ${character.name}. Tone=${tone}, style=${style}, verbosity=${verbosity}.`
            : `Voix actuelle: neutre.`,
        playerName
            ? `Le joueur s'appelle "${playerName}". Utilise son nom 0 à 1 fois maximum.`
            : `Le joueur n'a pas de nom affiché. N'invente pas de prénom.`,
        chapterContextText
            ? `Contexte de l'aventure (fourni par le joueur, à prendre en compte dans l'encouragement: contraintes, motivation, foyer, priorités):\n${chapterContextText}`
            : `Contexte de l'aventure: (aucun fourni).`,
        character?.motto
            ? `Serment du personnage (à refléter sans le citer mot pour mot): ${character.motto}`
            : null,
        `Contraintes: 3 à 7 lignes max. Termine par une micro-consigne (un seul pas).`,
        `Interdit: disclaimer, "en tant qu'IA", explications techniques.`,
        `La sortie doit respecter le schéma JSON demandé.`,
    ]
        .filter(Boolean)
        .join("\n");

    const context = {
        quest_title: input.quest_title,
        room_code: input.room_code ?? null,
        difficulty: difficultyLabel(input.difficulty),
        mission_hint: safeTrim(input.mission_md ?? "").slice(0, 800) || null,
        // ✅ contexte chapitre aussi dans le JSON côté user (redondant, mais utile)
        chapter_context: chapterContextText ?? "",
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
                            `Contexte quête:\n${JSON.stringify(context, null, 2)}\n\n` +
                            `Génère:\n- title (court, 2 à 5 mots)\n- message (encouragement)\n`,
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
