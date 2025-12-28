// src/lib/journal/generateChapterStory.ts
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";
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

export type ChapterStoryRow = {
    chapter_id: string;
    session_id: string;
    story_json: any;
    story_md: string;
    model: string;
    updated_at: string;
    created_at?: string;
};

type ChapterData = {
    id: string;
    session_id: string;
    adventure_id: string | null;
    title: string;
    pace: "calme" | "standard" | "intense";
    context_text: string | null;
    status: string | null;
    created_at: string | null;
};

type AdventureData = {
    title: string | null;
    code: string | null;
    context_text: string | null;
};

type QuestBucketRow = {
    status: "todo" | "doing" | "done";
    adventure_quests: {
        id: string;
        title: string | null;
        room_code: string | null;
        difficulty: number | null;
        estimate_min: number | null;
    } | null;
};

type StoryContext = {
    chapter: {
        id: string;
        title: string;
        pace: string;
        status: string | null;
        created_at: string | null;
        chapter_context: string;
    };
    adventure: {
        title: string | null;
        code: string | null;
        adventure_context: string;
    };
    quests: {
        done: Array<{ title: string; room_code: string | null; difficulty: number | null }>;
        doing: Array<{ title: string; room_code: string | null }>;
        todo: Array<{ title: string; room_code: string | null }>;
    };
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
 * Charge:
 * - chapitre (session_id scope, contexte chapitre)
 * - aventure (best-effort, contexte aventure)
 * - quêtes du chapitre (buckets todo/doing/done)
 */
async function loadStoryInputs(chapterId: string): Promise<{
    chapter: ChapterData;
    adventure: AdventureData;
    chapter_context_text: string | null;
    adventure_context_text: string | null;
    quests: { done: any[]; doing: any[]; todo: any[] };
}> {
    const supabase = await supabaseServer();

    // 0) Chapitre
    const { data: ch, error: chErr } = await supabase
        .from("chapters")
        .select("id, session_id, adventure_id, title, pace, context_text, status, created_at")
        .eq("id", chapterId)
        .maybeSingle();

    if (chErr) throw new Error(chErr.message);
    if (!ch) throw new Error("Chapter not found");
    if (!(ch as any).session_id) throw new Error("Missing session_id on chapters");

    const chapter = {
        id: (ch as any).id,
        session_id: (ch as any).session_id,
        adventure_id: (ch as any).adventure_id ?? null,
        title: safeTrim((ch as any).title) || "Chapitre",
        pace: ((ch as any).pace ?? "standard") as ChapterData["pace"],
        context_text: (ch as any).context_text ?? null,
        status: (ch as any).status ?? null,
        created_at: (ch as any).created_at ?? null,
    } satisfies ChapterData;

    const chapterCtx = safeTrim(chapter.context_text);
    const chapter_context_text = chapterCtx.length ? chapterCtx : null;

    // 1) Aventure (best-effort)
    let adventure: AdventureData = { title: null, code: null, context_text: null };
    let adventure_context_text: string | null = null;

    if (chapter.adventure_id) {
        const { data: adv, error: advErr } = await supabase
            .from("adventures")
            .select("title, code, context_text")
            .eq("id", chapter.adventure_id)
            .maybeSingle();

        if (advErr) {
            console.warn("generateChapterStory: adventures warning:", advErr.message);
        } else if (adv) {
            adventure = {
                title: safeTrim((adv as any)?.title) || null,
                code: safeTrim((adv as any)?.code) || null,
                context_text: (adv as any)?.context_text ?? null,
            };

            const advCtx = safeTrim(adventure.context_text);
            adventure_context_text = advCtx.length ? advCtx : null;
        }
    }

    // 2) Quêtes du chapitre (join adventure_quests)
    const { data: cqs, error: cqErr } = await supabase
        .from("chapter_quests")
        .select(
            `
            status,
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
        .eq("session_id", chapter.session_id);

    if (cqErr) throw new Error(cqErr.message);

    const rows = (cqs ?? []) as unknown as QuestBucketRow[];

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

    return {
        chapter,
        adventure,
        chapter_context_text,
        adventure_context_text,
        quests: { done, doing, todo },
    };
}

/* ============================================================================
🧠 PROMPT BUILDER
============================================================================ */

function buildSystemText(input: {
    playerName: string | null;
    character: CharacterStyle | null;
    tone: string;
    style: string;
    verbosity: string;
    maxParagraphs: number;
    adventureContext: string | null;
    chapterContext: string | null;
}) {
    const {
        playerName,
        character,
        tone,
        style,
        verbosity,
        maxParagraphs,
        adventureContext,
        chapterContext,
    } = input;

    return [
        `Tu es le Maître du Jeu de Renaissance.`,
        `Tu écris un récit de chapitre figé (stocké en BDD).`,
        `Style: roman de jeu vidéo, concret, sensoriel, sans blabla meta.`,
        `Interdit: "en tant qu'IA", disclaimers, justification meta.`,
        `Emojis sobres.`,
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
        `Contrainte: max ${maxParagraphs} paragraphes. Chaque paragraphe = 2 à 5 phrases.`,
        `Tu dois fournir un JSON STRICT selon le schéma demandé.`,
    ]
        .filter(Boolean)
        .join("\n");
}

function buildUserText(inputContext: StoryContext) {
    return (
        `Contexte:\n${JSON.stringify(inputContext, null, 2)}\n\n` +
        `Génère:\n` +
        `- title (court)\n` +
        `- summary (1 phrase)\n` +
        `- paragraphs (array de paragraphes texte)\n` +
        `- trophies (array de 2 à 6 lignes courtes, optionnel mais recommandé)\n`
    );
}

function renderStoryMarkdown(storyJson: any): string {
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

    return mdParts.join("\n").trim();
}

/* ============================================================================
📖 MAIN
============================================================================ */

/**
 * ✅ Récit IA “scellé” pour un chapitre (stocké en BDD)
 * - 2 contextes:
 *   - adventures.context_text = global
 *   - chapters.context_text   = chapitre
 * - Cache scopé par session_id
 * - ✅ Log BDD (ai_generations) pour debug/dev
 * - ✅ Journal entry (journal_entries) pour trace gameplay (best-effort)
 */
export async function generateStoryForChapter(chapterId: string, force: boolean = false) {
    const supabase = await supabaseServer();

    // ✅ Auth obligatoire (login-only)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(authErr.message);

    const userId = authData?.user?.id ?? "";
    if (!userId) throw new Error("Not authenticated");

    // 0) Inputs: chapitre + aventure + quêtes + contextes
    const { chapter, adventure, chapter_context_text, adventure_context_text, quests } =
        await loadStoryInputs(chapterId);

    const sessionId = chapter.session_id;
    const chapterTitle = chapter.title;
    const pace = chapter.pace;

    // 1) Cache (scopé session) si pas force
    if (!force) {
        const { data: existing } = await supabase
            .from("chapter_stories")
            .select("chapter_id, session_id, story_json, story_md, model, updated_at, created_at")
            .eq("chapter_id", chapterId)
            .eq("session_id", sessionId)
            .maybeSingle();

        if (existing) {
            // ✅ Journal best-effort (cache hit)
            try {
                await createJournalEntry({
                    session_id: sessionId,
                    kind: "note",
                    title: "📖 Récit (cache)",
                    content: `Récit récupéré depuis le cache pour le chapitre: ${chapterTitle}.`,
                    chapter_id: chapterId,
                });
            } catch {}

            // ✅ Log best-effort (cache hit)
            try {
                await createAiGenerationLog({
                    session_id: sessionId,
                    user_id: userId,
                    generation_type: "chapter_story",
                    source: "generateStoryForChapter",
                    provider: "openai",
                    model: (existing as any)?.model ?? "unknown",
                    status: "success",
                    chapter_id: chapterId,
                    adventure_id: chapter.adventure_id,
                    request_json: {
                        cached: true,
                        force: false,
                        chapter_id: chapterId,
                    },
                    response_json: null,
                    output_text: null,
                    parsed_json: (existing as any)?.story_json ?? null,
                    rendered_md: (existing as any)?.story_md ?? null,
                    metadata: {
                        note: "cache_hit",
                        updated_at: (existing as any)?.updated_at ?? null,
                    },
                });
            } catch {}

            return { story: existing as ChapterStoryRow, cached: true };
        }
    }

    // 2) Style joueur/personnage
    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "narratif";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    // 3) Prompt + payload OpenAI (gardé tel quel pour logs)
    const model = "gpt-4.1";

    const systemText = buildSystemText({
        playerName,
        character,
        tone,
        style,
        verbosity,
        maxParagraphs: rules.maxParagraphs,
        adventureContext: adventure_context_text,
        chapterContext: chapter_context_text,
    });

    const inputContext: StoryContext = {
        chapter: {
            id: chapterId,
            title: chapterTitle,
            pace,
            status: chapter.status,
            created_at: chapter.created_at,
            chapter_context: chapter_context_text ?? "",
        },
        adventure: {
            title: adventure.title ?? null,
            code: adventure.code ?? null,
            adventure_context: adventure_context_text ?? "",
        },
        quests: {
            done: quests.done,
            doing: quests.doing,
            todo: quests.todo,
        },
    };

    const userText = buildUserText(inputContext);

    const requestPayload = {
        model,
        input: [
            { role: "system", content: [{ type: "input_text", text: systemText }] },
            {
                role: "user",
                content: [{ type: "input_text", text: userText }],
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
    };

    const startedAt = new Date();
    const t0 = Date.now();

    let response: any = null;
    let storyJson: any = null;
    let storyMd: string | null = null;

    try {
        // 4) Appel OpenAI
        response = await openai.responses.create(requestPayload as any);

        // ⚠️ output_text est attendu car text.format=json_schema
        storyJson = JSON.parse(response.output_text);

        // 5) Markdown final (affichage UI)
        storyMd = renderStoryMarkdown(storyJson);
    } catch (err: any) {
        const finishedAt = new Date();
        const durationMs = Date.now() - t0;

        // ✅ Log BDD (error) best-effort
        try {
            await createAiGenerationLog({
                session_id: sessionId,
                user_id: userId,
                generation_type: "chapter_story",
                source: "generateStoryForChapter",
                provider: "openai",
                model,
                status: "error",
                chapter_id: chapterId,
                adventure_id: chapter.adventure_id,
                started_at: startedAt,
                finished_at: finishedAt,
                duration_ms: durationMs,
                request_json: requestPayload,
                system_text: systemText,
                user_input_text: userText,
                context_json: inputContext,
                response_json: null,
                output_text: null,
                parsed_json: null,
                parse_error: null,
                rendered_md: null,
                error_message: err?.message ? String(err.message) : "Unknown error",
                metadata: {
                    force,
                    chapter_title: chapterTitle,
                },
            });
        } catch {}

        // ✅ Journal best-effort (error)
        try {
            await createJournalEntry({
                session_id: sessionId,
                kind: "note",
                title: "📖 Récit (erreur IA)",
                content:
                    `Échec génération du récit pour "${chapterTitle}".\n` +
                    `Erreur: ${err?.message ? String(err.message) : "Unknown error"}`,
                chapter_id: chapterId,
            });
        } catch {}

        throw err;
    }

    const finishedAt = new Date();
    const durationMs = Date.now() - t0;

    // 6) Upsert cache (scopé session)
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

    if (saveErr) {
        // ✅ Log best-effort: génération OK mais save KO
        try {
            await createAiGenerationLog({
                session_id: sessionId,
                user_id: userId,
                generation_type: "chapter_story",
                source: "generateStoryForChapter",
                provider: "openai",
                model,
                status: "error",
                chapter_id: chapterId,
                adventure_id: chapter.adventure_id,
                started_at: startedAt,
                finished_at: finishedAt,
                duration_ms: durationMs,
                request_json: requestPayload,
                system_text: systemText,
                user_input_text: userText,
                context_json: inputContext,
                response_json: response,
                output_text: response?.output_text ?? null,
                parsed_json: storyJson,
                parse_error: null,
                rendered_md: storyMd,
                error_message: `Chapter story upsert failed: ${saveErr.message}`,
            });
        } catch {}

        throw new Error(saveErr.message);
    }

    // ✅ Log BDD (success) best-effort
    try {
        await createAiGenerationLog({
            session_id: sessionId,
            user_id: userId,
            generation_type: "chapter_story",
            source: "generateStoryForChapter",
            provider: "openai",
            model,
            status: "success",
            chapter_id: chapterId,
            adventure_id: chapter.adventure_id,
            started_at: startedAt,
            finished_at: finishedAt,
            duration_ms: durationMs,
            request_json: requestPayload,
            system_text: systemText,
            user_input_text: userText,
            context_json: inputContext,
            response_json: response,
            output_text: response?.output_text ?? null,
            parsed_json: storyJson,
            parse_error: null,
            rendered_md: storyMd,
            usage_json: (response as any)?.usage ?? null,
            metadata: {
                force,
                chapter_title: chapterTitle,
                quest_counts: {
                    done: quests.done.length,
                    doing: quests.doing.length,
                    todo: quests.todo.length,
                },
            },
        });
    } catch {}

    // ✅ Journal entry best-effort (success)
    // Note: on reste sur kind="note" pour coller à ton union type actuel.
    // Tu pourras créer un kind dédié plus tard si tu veux.
    try {
        await createJournalEntry({
            session_id: sessionId,
            kind: "note",
            title: "📖 Récit scellé",
            content:
                `Le MJ a scellé le récit du chapitre: ${chapterTitle}\n` +
                `Modèle: ${model}\n` +
                `Quêtes: ${quests.done.length} terminées, ${quests.doing.length} en cours, ${quests.todo.length} à faire.`,
            chapter_id: chapterId,
        });
    } catch {}

    return { story: saved as ChapterStoryRow, cached: false };
}
