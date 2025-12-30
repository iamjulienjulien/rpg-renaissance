import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";

import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧱 TYPES
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

type LoadedContexts = {
    session_id: string | null;
    chapter_id: string | null;
    adventure_id: string | null;
    adventure_context_text: string | null;
    chapter_context_text: string | null;
};

type QuestData = {
    adventure_quest_id: string | null;
    quest_title: string;
    description: string | null;
    room_code: string | null;
    difficulty: number | null;
    mission_md: string | null;
};

export type GenerateEncouragementQuestMessageInput = {
    chapter_quest_id: string;
};

type EncouragementJson = {
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
    if (v === "short") return { linesMin: 2, linesMax: 4 };
    if (v === "rich") return { linesMin: 4, linesMax: 8 };
    return { linesMin: 3, linesMax: 7 };
}

/* ============================================================================
🔎 DATA LOADERS (identiques à photo message)
============================================================================ */

async function loadPlayerContextByUserId(userId: string): Promise<PlayerContext> {
    const supabase = await supabaseServer();

    const { data } = await supabase
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

async function loadContextsForChapterQuest(chapterQuestId: string): Promise<LoadedContexts> {
    const supabase = await supabaseServer();

    const { data: cq } = await supabase
        .from("chapter_quests")
        .select("id, session_id, chapter_id")
        .eq("id", chapterQuestId)
        .maybeSingle();

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

    patchRequestContext({ session_id, chapter_id, chapter_quest_id: chapterQuestId });

    let adventure_id: string | null = null;
    let chapter_context_text: string | null = null;

    if (chapter_id) {
        const { data: ch } = await supabase
            .from("chapters")
            .select("context_text, adventure_id")
            .eq("id", chapter_id)
            .maybeSingle();

        const ctx = safeTrim((ch as any)?.context_text);
        chapter_context_text = ctx.length ? ctx : null;
        adventure_id = (ch as any)?.adventure_id ?? null;
    }

    let adventure_context_text: string | null = null;

    if (adventure_id) {
        const { data: adv } = await supabase
            .from("adventures")
            .select("context_text")
            .eq("id", adventure_id)
            .maybeSingle();

        const advCtx = safeTrim((adv as any)?.context_text);
        adventure_context_text = advCtx.length ? advCtx : null;
    }

    return {
        session_id,
        chapter_id,
        adventure_id,
        adventure_context_text,
        chapter_context_text,
    };
}

async function loadQuestDataForChapterQuest(chapterQuestId: string): Promise<QuestData> {
    const supabase = await supabaseServer();

    const { data: cq } = await supabase
        .from("chapter_quests")
        .select("adventure_quest_id, mission_md")
        .eq("id", chapterQuestId)
        .maybeSingle();

    const adventure_quest_id = (cq as any)?.adventure_quest_id ?? null;
    const mission_md = safeTrim((cq as any)?.mission_md) || null;

    if (!adventure_quest_id) {
        return {
            adventure_quest_id: null,
            quest_title: "Quête",
            description: null,
            room_code: null,
            difficulty: null,
            mission_md,
        };
    }

    const { data: aq } = await supabase
        .from("adventure_quests")
        .select("title, description, room_code, difficulty")
        .eq("id", adventure_quest_id)
        .maybeSingle();

    return {
        adventure_quest_id,
        quest_title: safeTrim((aq as any)?.title) || "Quête",
        description: safeTrim((aq as any)?.description) || null,
        room_code: (aq as any)?.room_code ?? null,
        difficulty: (aq as any)?.difficulty ?? null,
        mission_md,
    };
}

async function ensureQuestThreadId(input: {
    session_id: string;
    chapter_quest_id: string;
}): Promise<string | null> {
    const supabase = await supabaseServer();

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
    const supabase = await supabaseServer();

    await supabase.from("quest_messages").insert({
        id: crypto.randomUUID(),
        session_id: input.session_id,
        thread_id: input.thread_id,
        chapter_quest_id: input.chapter_quest_id,
        role: "mj",
        kind: "encouragement",
        title: input.title,
        content: input.content,
    });
}

/* ============================================================================
💪 MAIN
============================================================================ */

export async function generateEncouragementQuestMessage(
    input: GenerateEncouragementQuestMessageInput
) {
    const supabase = await supabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id ?? null;
    if (!userId) throw new Error("Not authenticated");

    const chapterQuestId = safeTrim(input.chapter_quest_id);
    if (!chapterQuestId) throw new Error("Missing chapter_quest_id");

    patchRequestContext({ user_id: userId, chapter_quest_id: chapterQuestId });

    const ctx = await loadContextsForChapterQuest(chapterQuestId);
    const quest = await loadQuestDataForChapterQuest(chapterQuestId);

    const player = await loadPlayerContextByUserId(userId);
    const character = player.character;
    const playerName = player.display_name;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "motivant";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    const systemText = [
        `Tu es le Maître du Jeu de Renaissance.`,
        `Tu écris un ENCOURAGEMENT pour une quête en cours.`,
        `Objectif: redonner de l’élan, rappeler le sens, proposer UN prochain pas.`,
        `Style RPG humain, bienveillant, concret. Emojis sobres.`,
        character
            ? `Voix: ${character.emoji ?? "🧙"} ${character.name}. Tone=${tone}, style=${style}.`
            : `Voix: neutre.`,
        playerName
            ? `Le joueur s'appelle "${playerName}". Utilise son nom 0 à 1 fois maximum.`
            : null,

        ctx.adventure_context_text
            ? `CONTEXTE GLOBAL D’AVENTURE:\n${ctx.adventure_context_text}`
            : null,

        ctx.chapter_context_text ? `CONTEXTE DU CHAPITRE:\n${ctx.chapter_context_text}` : null,

        `Contraintes: ${rules.linesMin} à ${rules.linesMax} lignes. Termine par une micro-consigne.`,
        `Interdit: meta, "en tant qu'IA".`,
        `La sortie doit respecter STRICTEMENT le schéma JSON.`,
    ]
        .filter(Boolean)
        .join("\n");

    const userText =
        `Quête:\n` +
        JSON.stringify(
            {
                title: quest.quest_title,
                description: quest.description,
                room_code: quest.room_code,
                difficulty: difficultyLabel(quest.difficulty),
                mission_hint: quest.mission_md?.slice(0, 600) ?? null,
            },
            null,
            2
        ) +
        `\n\nGénère:\n- title\n- message\n`;

    const requestJson = {
        model: "gpt-4.1",
        input: [
            { role: "system", content: [{ type: "input_text", text: systemText }] },
            { role: "user", content: [{ type: "input_text", text: userText }] },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "quest_encouragement_message_v1",
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

    const startedAt = new Date();
    const response = await openai.responses.create(requestJson as any);
    const outputText = response?.output_text ?? "";
    const parsed = JSON.parse(outputText) as EncouragementJson;

    if (!ctx.session_id) return parsed;

    const threadId = await ensureQuestThreadId({
        session_id: ctx.session_id,
        chapter_quest_id: chapterQuestId,
    });

    if (threadId) {
        await createQuestMessageRow({
            session_id: ctx.session_id,
            thread_id: threadId,
            chapter_quest_id: chapterQuestId,
            title: parsed.title,
            content: parsed.message,
        });
    }

    await createAiGenerationLog({
        session_id: ctx.session_id,
        user_id: userId,
        generation_type: "encouragement",
        source: "generateEncouragementQuestMessage",
        chapter_quest_id: chapterQuestId,
        chapter_id: ctx.chapter_id,
        adventure_id: ctx.adventure_id,
        provider: "openai",
        model: "gpt-4.1",
        status: "success",
        started_at: startedAt,
        finished_at: new Date(),
        duration_ms: Date.now() - startedAt.getTime(),
        request_json: requestJson,
        parsed_json: parsed,
    });

    await createJournalEntry({
        session_id: ctx.session_id,
        kind: "note",
        title: `💪 ${parsed.title}`,
        content: parsed.message,
        chapter_id: ctx.chapter_id,
        adventure_quest_id: quest.adventure_quest_id,
    });

    return parsed;
}
