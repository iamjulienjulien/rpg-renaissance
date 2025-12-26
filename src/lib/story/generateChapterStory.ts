// src/lib/journal/generateChapterStory.ts
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

export type ChapterStoryRow = {
    chapter_id: string;
    session_id: string;
    story_json: any;
    story_md: string;
    model: string;
    updated_at: string;
    created_at?: string;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function verbosityRules(v?: string | null) {
    if (v === "short") return { maxParagraphs: 3 };
    if (v === "rich") return { maxParagraphs: 7 };
    return { maxParagraphs: 5 };
}

/* ============================================================================
🔎 DATA LOADERS
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

/* ============================================================================
📖 MAIN
============================================================================ */

/**
 * ✅ Récit IA “scellé” pour un chapitre (stocké en BDD)
 * - Prend en compte 2 contextes:
 *   - aventure.context_text = contexte global (cadre général)
 *   - chapters.context_text  = contexte spécifique (focus du chapitre)
 * - Cache scopé par session_id
 */
export async function generateStoryForChapter(chapterId: string, force: boolean = false) {
    const supabase = await supabaseServer();

    // ✅ Auth obligatoire (login-only)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(authErr.message);

    const userId = authData?.user?.id ?? "";
    if (!userId) throw new Error("Not authenticated");

    // 0) Charger le chapitre (et session_id pour scope cache)
    const { data: ch, error: chErr } = await supabase
        .from("chapters")
        .select("id, session_id, adventure_id, title, pace, context_text, status, created_at")
        .eq("id", chapterId)
        .maybeSingle();

    if (chErr) throw new Error(chErr.message);
    if (!ch) throw new Error("Chapter not found");
    if (!ch.session_id) throw new Error("Missing session_id on chapters");

    const sessionId = ch.session_id as string;
    const chapterTitle = safeTrim(ch.title) || "Chapitre";
    const pace = ch.pace ?? "standard";

    // ✅ Contexte spécifique (chapitre)
    const chapterContextText = safeTrim((ch as any)?.context_text);
    const chapterContext = chapterContextText.length ? chapterContextText : null;

    // 1) Cache (scopé session) si pas force
    if (!force) {
        const { data: existing } = await supabase
            .from("chapter_stories")
            .select("chapter_id, session_id, story_json, story_md, model, updated_at, created_at")
            .eq("chapter_id", chapterId)
            .eq("session_id", sessionId)
            .maybeSingle();

        if (existing) return { story: existing as ChapterStoryRow, cached: true };
    }

    // 2) Aventure (best-effort) + ✅ contexte global (aventure)
    let adventureTitle = "";
    let adventureCode = "";
    let adventureContext: string | null = null;

    if (ch.adventure_id) {
        const { data: adv, error: advErr } = await supabase
            .from("adventures")
            .select("title, code, context_text")
            .eq("id", ch.adventure_id)
            .maybeSingle();

        if (!advErr && adv) {
            adventureTitle = safeTrim((adv as any)?.title);
            adventureCode = safeTrim((adv as any)?.code);

            const advCtx = safeTrim((adv as any)?.context_text);
            adventureContext = advCtx.length ? advCtx : null;
        }
    }

    // 3) Quêtes du chapitre (join adventure_quests)
    const { data: cqs, error: cqErr } = await supabase
        .from("chapter_quests")
        .select(
            `
            id,
            status,
            created_at,
            adventure_quests!chapter_quests_adventure_quest_id_fkey (
                id,
                title,
                room_code,
                difficulty,
                estimate_min
            )
        `
        )
        .eq("chapter_id", chapterId)
        .eq("session_id", sessionId);

    if (cqErr) throw new Error(cqErr.message);

    const rows = (cqs ?? []) as Array<any>;

    const done = rows
        .filter((r) => r.status === "done")
        .map((r) => ({
            title: safeTrim(r.adventure_quests?.title) || "Quête",
            room_code: r.adventure_quests?.room_code ?? null,
            difficulty: r.adventure_quests?.difficulty ?? null,
        }));

    const doing = rows
        .filter((r) => r.status === "doing")
        .map((r) => ({
            title: safeTrim(r.adventure_quests?.title) || "Quête",
            room_code: r.adventure_quests?.room_code ?? null,
        }));

    const todo = rows
        .filter((r) => r.status === "todo")
        .map((r) => ({
            title: safeTrim(r.adventure_quests?.title) || "Quête",
            room_code: r.adventure_quests?.room_code ?? null,
        }));

    // 4) Style joueur/personnage
    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "narratif";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    // 5) Génération OpenAI
    const model = "gpt-4.1";

    const systemText = [
        `Tu es le Maître du Jeu de Renaissance.`,
        `Tu écris un récit de chapitre figé (stocké en BDD).`,
        `Style: roman de jeu vidéo, concret, sensoriel, sans blabla meta.`,
        `Interdit: "en tant qu'IA", disclaimers, justification meta.`,
        `Voix: ${character ? `${character.emoji ?? "🧙"} ${character.name}` : "neutre"}. Tone=${tone}, style=${style}, verbosity=${verbosity}.`,
        playerName
            ? `Le joueur s'appelle "${playerName}". Tu peux le citer 0 à 1 fois, jamais plus.`
            : `Le joueur n'a pas de nom affiché. N'invente pas de prénom.`,

        // ✅ Contexte global (aventure)
        adventureContext
            ? `CONTEXTE GLOBAL D’AVENTURE (cadre général, priorités, contraintes globales, objectifs long-terme):\n${adventureContext}`
            : `CONTEXTE GLOBAL D’AVENTURE: (aucun fourni).`,

        // ✅ Contexte spécifique (chapitre)
        chapterContext
            ? `CONTEXTE SPÉCIFIQUE DE CE CHAPITRE (focus local, angle du moment; c’est une partie de l’aventure):\n${chapterContext}`
            : `CONTEXTE SPÉCIFIQUE DE CE CHAPITRE: (aucun fourni).`,

        `Règle d’or: si les deux contextes existent, respecte le global en premier, puis adapte finement au chapitre.`,
        character?.motto
            ? `Serment (à refléter sans citer mot pour mot): ${character.motto}`
            : null,
        `Contrainte: max ${rules.maxParagraphs} paragraphes. Chaque paragraphe = 2 à 5 phrases.`,
        `Tu dois fournir un JSON STRICT selon le schéma demandé.`,
    ]
        .filter(Boolean)
        .join("\n");

    const inputContext = {
        chapter: {
            id: chapterId,
            title: chapterTitle,
            pace,
            status: ch.status,
            created_at: ch.created_at,
            chapter_context: chapterContext ?? "",
        },
        adventure: {
            title: adventureTitle || null,
            code: adventureCode || null,
            adventure_context: adventureContext ?? "",
        },
        quests: {
            done,
            doing,
            todo,
        },
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
                            `Contexte:\n${JSON.stringify(inputContext, null, 2)}\n\n` +
                            `Génère:\n` +
                            `- title (court)\n` +
                            `- summary (1 phrase)\n` +
                            `- paragraphs (array de paragraphes texte)\n` +
                            `- trophies (array de 2 à 6 lignes courtes, optionnel mais recommandé)\n`,
                    },
                ],
            },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "chapter_story_v1",
                schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        title: { type: "string" },
                        summary: { type: "string" },
                        paragraphs: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 2,
                            maxItems: rules.maxParagraphs,
                        },
                        trophies: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 0,
                            maxItems: 6,
                        },
                    },
                    required: ["title", "summary", "paragraphs", "trophies"],
                },
            },
        },
    });

    const storyJson = JSON.parse(response.output_text);

    // 6) Markdown final (pour ton MasterCard)
    const mdParts: string[] = [];
    mdParts.push(`**${String(storyJson.summary ?? "").trim()}**`);
    mdParts.push("");

    for (const p of storyJson.paragraphs ?? []) {
        mdParts.push(String(p).trim());
        mdParts.push("");
    }

    if (Array.isArray(storyJson.trophies) && storyJson.trophies.length) {
        mdParts.push("**🏅 Faits marquants**");
        mdParts.push("");
        for (const t of storyJson.trophies) {
            mdParts.push(`- ${String(t).trim()}`);
        }
        mdParts.push("");
    }

    const storyMd = mdParts.join("\n").trim();

    // 7) Upsert cache (scopé session)
    const { data: saved, error: saveErr } = await supabase
        .from("chapter_stories")
        .upsert(
            {
                chapter_id: chapterId,
                session_id: sessionId,
                story_json: storyJson,
                story_md: storyMd,
                model,
            },
            { onConflict: "chapter_id" }
        )
        .select("chapter_id, session_id, story_json, story_md, model, updated_at, created_at")
        .single();

    if (saveErr) throw new Error(saveErr.message);

    // (Optionnel) journal entry: trace que le récit est “scellé”
    await supabase.from("journal_entries").insert({
        kind: "chapter_story_created",
        title: "📖 Récit scellé",
        content: `Le MJ a scellé le récit du chapitre: ${chapterTitle}`,
        chapter_id: chapterId,
        session_id: sessionId,
    });

    return { story: saved as ChapterStoryRow, cached: false };
}
