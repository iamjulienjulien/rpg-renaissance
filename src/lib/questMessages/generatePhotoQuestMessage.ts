// src/lib/questMessages/generatePhotoQuestMessage.ts
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";

// ✅ system logs
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

export type GeneratePhotoQuestMessageInput = {
    chapter_quest_id: string;

    photo_id: string;
    photo_category: "initial" | "final" | "other";
    photo_caption?: string | null;

    // ✅ on l'utilise juste pour l'appel Vision (URL courte durée ok)
    photo_signed_url: string;
};

type PhotoQuestMessageJson = {
    title: string;
    description: string; // description de la photo (concrète)
    message: string; // encouragement + lien à la quête
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

function photoCategoryLabel(c: "initial" | "final" | "other") {
    if (c === "initial") return "photo initiale";
    if (c === "final") return "photo finale";
    return "photo";
}

function verbosityRules(v?: string | null) {
    // Photo-message = un peu plus riche qu’un encouragement, mais compact
    if (v === "short") return { linesMin: 3, linesMax: 6 };
    if (v === "rich") return { linesMin: 6, linesMax: 12 };
    return { linesMin: 4, linesMax: 10 };
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function safeSnippet(s: string, max = 240) {
    const x = safeTrim(s);
    if (!x) return "";
    return x.length > max ? `${x.slice(0, max)}…` : x;
}

/* ============================================================================
🔎 DATA LOADERS
============================================================================ */

async function loadPlayerContextByUserId(userId: string): Promise<PlayerContext> {
    const t0 = Date.now();
    Log.debug("photo_mj.loadPlayer.start", { metadata: { user_id: userId } });

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
        Log.warning("photo_mj.loadPlayer.error", {
            metadata: { ms: msSince(t0), error: error.message },
        });
        return { display_name: null, character: null };
    }

    const display_name = safeTrim((data as any)?.display_name) || null;
    const c = normalizeSingle((data as any)?.characters);

    Log.success("photo_mj.loadPlayer.ok", {
        metadata: {
            ms: msSince(t0),
            has_display_name: !!display_name,
            has_character: !!c,
            character_name: c?.name ?? null,
        },
    });

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
    const t0 = Date.now();
    Log.debug("photo_mj.loadContexts.start", { metadata: { chapter_quest_id: chapterQuestId } });

    const supabase = await supabaseServer();

    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id, session_id, chapter_id")
        .eq("id", chapterQuestId)
        .maybeSingle();

    if (cqErr || !cq) {
        Log.warning("photo_mj.loadContexts.cq.missing", {
            metadata: {
                ms: msSince(t0),
                chapter_quest_id: chapterQuestId,
                error: cqErr?.message ?? null,
                found: !!cq,
            },
        });

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

    Log.debug("photo_mj.loadContexts.cq.ok", {
        metadata: { ms: msSince(t0), session_id, chapter_id },
    });

    let adventure_id: string | null = null;
    let chapter_context_text: string | null = null;

    if (chapter_id) {
        const t1 = Date.now();
        const { data: ch, error: chErr } = await supabase
            .from("chapters")
            .select("context_text, adventure_id")
            .eq("id", chapter_id)
            .maybeSingle();

        if (chErr) {
            Log.warning("photo_mj.loadContexts.chapter.error", {
                metadata: { ms: msSince(t1), chapter_id, error: chErr.message },
            });
        } else {
            const ctx = safeTrim((ch as any)?.context_text);
            chapter_context_text = ctx.length ? ctx : null;
            adventure_id = (ch as any)?.adventure_id ?? null;

            patchRequestContext({ adventure_id });

            Log.debug("photo_mj.loadContexts.chapter.ok", {
                metadata: {
                    ms: msSince(t1),
                    chapter_id,
                    adventure_id,
                    chapter_ctx_len: chapter_context_text?.length ?? 0,
                },
            });
        }
    }

    let adventure_context_text: string | null = null;

    if (adventure_id) {
        const t2 = Date.now();
        const { data: adv, error: advErr } = await supabase
            .from("adventures")
            .select("context_text")
            .eq("id", adventure_id)
            .maybeSingle();

        if (advErr) {
            Log.warning("photo_mj.loadContexts.adventure.error", {
                metadata: { ms: msSince(t2), adventure_id, error: advErr.message },
            });
        } else {
            const advCtx = safeTrim((adv as any)?.context_text);
            adventure_context_text = advCtx.length ? advCtx : null;

            Log.debug("photo_mj.loadContexts.adventure.ok", {
                metadata: {
                    ms: msSince(t2),
                    adventure_id,
                    adventure_ctx_len: adventure_context_text?.length ?? 0,
                },
            });
        }
    }

    Log.success("photo_mj.loadContexts.ok", {
        metadata: {
            ms: msSince(t0),
            session_id,
            chapter_id,
            adventure_id,
            has_adventure_ctx: !!adventure_context_text,
            has_chapter_ctx: !!chapter_context_text,
        },
    });

    return {
        session_id,
        chapter_id,
        adventure_id,
        adventure_context_text,
        chapter_context_text,
    };
}

/**
 * ✅ Données de quête:
 * - chapter_quests -> adventure_quest_id + mission_md
 * - adventure_quests -> title/description/room_code/difficulty
 */
async function loadQuestDataForChapterQuest(chapterQuestId: string): Promise<QuestData> {
    const t0 = Date.now();
    Log.debug("photo_mj.loadQuest.start", { metadata: { chapter_quest_id: chapterQuestId } });

    const supabase = await supabaseServer();

    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id, adventure_quest_id, mission_md")
        .eq("id", chapterQuestId)
        .maybeSingle();

    if (cqErr || !cq) {
        Log.warning("photo_mj.loadQuest.cq.missing", {
            metadata: {
                ms: msSince(t0),
                chapter_quest_id: chapterQuestId,
                error: cqErr?.message ?? null,
                found: !!cq,
            },
        });

        return {
            adventure_quest_id: null,
            quest_title: "Quête",
            description: null,
            room_code: null,
            difficulty: null,
            mission_md: null,
        };
    }

    const adventure_quest_id = (cq as any)?.adventure_quest_id ?? null;
    const mission_md = safeTrim((cq as any)?.mission_md) || null;

    patchRequestContext({ adventure_quest_id });

    Log.debug("photo_mj.loadQuest.cq.ok", {
        metadata: {
            ms: msSince(t0),
            adventure_quest_id,
            has_mission_md: !!mission_md,
            mission_md_len: mission_md?.length ?? 0,
        },
    });

    if (!adventure_quest_id) {
        Log.warning("photo_mj.loadQuest.no_adventure_quest_id", {
            metadata: { ms: msSince(t0), chapter_quest_id: chapterQuestId },
        });

        return {
            adventure_quest_id: null,
            quest_title: "Quête",
            description: null,
            room_code: null,
            difficulty: null,
            mission_md,
        };
    }

    const t1 = Date.now();
    const { data: aq, error: aqErr } = await supabase
        .from("adventure_quests")
        .select("id, title, description, room_code, difficulty")
        .eq("id", adventure_quest_id)
        .maybeSingle();

    if (aqErr || !aq) {
        Log.warning("photo_mj.loadQuest.aq.missing", {
            metadata: {
                ms: msSince(t1),
                adventure_quest_id,
                error: aqErr?.message ?? null,
                found: !!aq,
            },
        });

        return {
            adventure_quest_id,
            quest_title: "Quête",
            description: null,
            room_code: null,
            difficulty: null,
            mission_md,
        };
    }

    const quest_title = safeTrim((aq as any)?.title) || "Quête";
    const description = safeTrim((aq as any)?.description) || null;
    const room_code = (aq as any)?.room_code ?? null;
    const difficulty = (aq as any)?.difficulty ?? null;

    Log.success("photo_mj.loadQuest.ok", {
        metadata: {
            ms: msSince(t0),
            adventure_quest_id,
            quest_title,
            has_description: !!description,
            room_code,
            difficulty,
        },
    });

    return {
        adventure_quest_id,
        quest_title,
        description,
        room_code,
        difficulty,
        mission_md,
    };
}

/**
 * ✅ Thread MJ (quest_threads)
 */
async function ensureQuestThreadId(input: {
    session_id: string;
    chapter_quest_id: string;
}): Promise<string | null> {
    const t0 = Date.now();
    Log.debug("photo_mj.thread.ensure.start", { metadata: input });

    const supabase = await supabaseServer();

    const { data: existing, error: selErr } = await supabase
        .from("quest_threads")
        .select("id")
        .eq("session_id", input.session_id)
        .eq("chapter_quest_id", input.chapter_quest_id)
        .maybeSingle();

    if (selErr) {
        Log.warning("photo_mj.thread.select.error", {
            metadata: { ms: msSince(t0), error: selErr.message, ...input },
        });
    }

    if (existing?.id) {
        Log.debug("photo_mj.thread.exists", {
            metadata: { ms: msSince(t0), thread_id: existing.id, ...input },
        });
        return existing.id as string;
    }

    const id = crypto.randomUUID();

    const { error: insErr } = await supabase.from("quest_threads").insert({
        id,
        session_id: input.session_id,
        chapter_quest_id: input.chapter_quest_id,
    });

    if (insErr) {
        Log.warning("photo_mj.thread.insert.error", {
            metadata: { ms: msSince(t0), error: insErr.message, thread_id: id, ...input },
        });
        return null;
    }

    Log.success("photo_mj.thread.insert.ok", {
        metadata: { ms: msSince(t0), thread_id: id, ...input },
    });

    return id;
}

async function createQuestMessageRow(input: {
    session_id: string;
    thread_id: string;
    chapter_quest_id: string;
    role: "mj" | "user" | "system";
    kind: "message" | "photo_recognition" | "system_event";
    title?: string | null;
    content: string;
    meta?: Record<string, unknown> | null;
    photo_id?: string | null;
}): Promise<void> {
    const t0 = Date.now();
    Log.debug("photo_mj.thread.message.insert.start", {
        metadata: {
            session_id: input.session_id,
            thread_id: input.thread_id,
            chapter_quest_id: input.chapter_quest_id,
            role: input.role,
            kind: input.kind,
            has_title: !!safeTrim(input.title ?? ""),
            content_len: safeTrim(input.content).length,
            photo_id: input.photo_id ?? null,
        },
    });

    const supabase = await supabaseServer();

    const { error } = await supabase.from("quest_messages").insert({
        id: crypto.randomUUID(),
        session_id: input.session_id,
        thread_id: input.thread_id,
        chapter_quest_id: input.chapter_quest_id,
        role: input.role,
        kind: input.kind,
        title: input.title ?? null,
        content: input.content,
        meta: input.meta ?? null,
        photo_id: input.photo_id ?? null,
    });

    if (error) {
        Log.warning("photo_mj.thread.message.insert.error", {
            metadata: { ms: msSince(t0), error: error.message },
        });
        return;
    }

    Log.success("photo_mj.thread.message.insert.ok", { metadata: { ms: msSince(t0) } });
}

/* ============================================================================
📸 MAIN
============================================================================ */

export async function generatePhotoQuestMessageForQuest(input: GeneratePhotoQuestMessageInput) {
    const startedAtMs = Date.now();
    const timer = Log.timer("generatePhotoQuestMessageForQuest", {
        source: "src/lib/questMessages/generatePhotoQuestMessage.ts",
        metadata: {
            photo_id: safeTrim(input.photo_id) || null,
            photo_category: input.photo_category,
        },
    });

    Log.info("photo_mj.start", {
        metadata: {
            chapter_quest_id: safeTrim(input.chapter_quest_id) || null,
            photo_id: safeTrim(input.photo_id) || null,
            photo_category: input.photo_category,
            caption_present: !!safeTrim(input.photo_caption ?? ""),
            signed_url_present: !!safeTrim(input.photo_signed_url),
            signed_url_host: (() => {
                try {
                    const u = new URL(safeTrim(input.photo_signed_url));
                    return u.host;
                } catch {
                    return null;
                }
            })(),
        },
    });

    const supabase = await supabaseServer();

    // ✅ Auth obligatoire (login-only)
    const a0 = Date.now();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
        Log.error("photo_mj.auth.error", authErr, { metadata: { ms: msSince(a0) } });
        timer.endError("photo_mj.auth.error", authErr, { status_code: 401 });
        throw new Error(authErr.message);
    }

    const userId = authData?.user?.id ?? "";
    if (!userId) {
        Log.warning("photo_mj.auth.missing_user", { metadata: { ms: msSince(a0) } });
        timer.endError("photo_mj.auth.missing_user", undefined, { status_code: 401 });
        throw new Error("Not authenticated");
    }

    patchRequestContext({ user_id: userId });

    const chapterQuestId = safeTrim(input.chapter_quest_id);
    if (!chapterQuestId) {
        Log.warning("photo_mj.input.missing.chapter_quest_id", { status_code: 400 });
        timer.endError("photo_mj.bad_input", undefined, { status_code: 400 });
        throw new Error("Missing chapter_quest_id");
    }

    const photoSignedUrl = safeTrim(input.photo_signed_url);
    if (!photoSignedUrl) {
        Log.warning("photo_mj.input.missing.photo_signed_url", { status_code: 400 });
        timer.endError("photo_mj.bad_input", undefined, { status_code: 400 });
        throw new Error("Missing photo_signed_url");
    }

    const photoId = safeTrim(input.photo_id);
    const photoCategory = input.photo_category;

    patchRequestContext({
        chapter_quest_id: chapterQuestId,
        adventure_quest_id: null, // patché plus loin via loadQuestData
    });

    // 0) Contextes + quête
    const c0 = Date.now();
    const ctx = await loadContextsForChapterQuest(chapterQuestId);
    const quest = await loadQuestDataForChapterQuest(chapterQuestId);

    patchRequestContext({
        session_id: ctx.session_id ?? undefined,
        chapter_id: ctx.chapter_id ?? undefined,
        adventure_id: ctx.adventure_id ?? undefined,
        adventure_quest_id: quest.adventure_quest_id ?? undefined,
    });

    Log.success("photo_mj.context.loaded", {
        metadata: {
            ms: msSince(c0),
            session_id: ctx.session_id,
            chapter_id: ctx.chapter_id,
            adventure_id: ctx.adventure_id,
            adventure_quest_id: quest.adventure_quest_id,
            quest_title: quest.quest_title,
        },
    });

    // 1) Style joueur/personnage
    const p0 = Date.now();
    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "motivant";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    Log.debug("photo_mj.style", {
        metadata: {
            ms: msSince(p0),
            player_name: playerName ?? null,
            character_name: character?.name ?? null,
            character_emoji: character?.emoji ?? null,
            tone,
            style,
            verbosity,
            lines: rules,
        },
    });

    // 2) OpenAI request
    const model = "gpt-4.1";
    const provider = "openai";

    const systemText = [
        `Tu es le Maître du Jeu de Renaissance.`,
        `Tu reçois une photo envoyée comme preuve d'avancement d'une quête.`,
        `Objectif: (1) Décrire la photo de façon prudente et factuelle (pas d'invention), (2) Encourager le joueur et relier au contexte de l’aventure.`,
        `Style: RPG moderne, concret, humain. Emojis sobres.`,
        character
            ? `Voix: ${character.emoji ?? "🎭"} ${character.name}. Tone=${tone}, style=${style}, verbosity=${verbosity}.`
            : `Voix: neutre.`,
        playerName
            ? `Le joueur s'appelle "${playerName}". Utilise son nom 0 à 1 fois maximum.`
            : `Le joueur n'a pas de nom affiché. N'invente pas de prénom.`,

        ctx.adventure_context_text
            ? `CONTEXTE GLOBAL D’AVENTURE:\n${ctx.adventure_context_text}`
            : `CONTEXTE GLOBAL D’AVENTURE: (aucun fourni).`,

        ctx.chapter_context_text
            ? `CONTEXTE SPÉCIFIQUE DU CHAPITRE:\n${ctx.chapter_context_text}`
            : `CONTEXTE SPÉCIFIQUE DU CHAPITRE: (aucun fourni).`,

        `Règle d’or: si les deux contextes existent, respecte le global en premier, puis adapte au chapitre.`,
        character?.motto
            ? `Serment (à refléter sans citer mot pour mot): ${character.motto}`
            : null,

        `Contraintes de sortie:`,
        `- description: 2 à 5 phrases max, factuel, prudent ("on dirait", "il semble").`,
        `- message: ${rules.linesMin} à ${rules.linesMax} lignes, encouragement + 1 micro-consigne finale.`,
        `Interdit: meta, disclaimers, "en tant qu'IA", jugements blessants, contenu inventé.`,
        `La sortie doit respecter STRICTEMENT le schéma JSON demandé.`,
    ]
        .filter(Boolean)
        .join("\n");

    const contextJson = {
        photo: {
            id: photoId,
            category: photoCategory,
            category_label: photoCategoryLabel(photoCategory),
            caption: safeTrim(input.photo_caption ?? "") || null,
        },
        quest: {
            title: quest.quest_title,
            description: quest.description,
            room_code: quest.room_code,
            difficulty: difficultyLabel(quest.difficulty),
            mission_hint: safeTrim(quest.mission_md ?? "").slice(0, 800) || null,
        },
        adventure_context: ctx.adventure_context_text ?? "",
        chapter_context: ctx.chapter_context_text ?? "",
        session_id: ctx.session_id,
        chapter_id: ctx.chapter_id,
        adventure_id: ctx.adventure_id,
        adventure_quest_id: quest.adventure_quest_id,
    };

    const userInputText =
        `Contexte:\n${JSON.stringify(contextJson, null, 2)}\n\n` +
        `Analyse la photo fournie et génère:\n` +
        `- title (2 à 5 mots)\n` +
        `- description (2 à 5 phrases prudentes)\n` +
        `- message (encouragement + 1 micro-consigne finale)\n`;

    const requestJson = {
        model,
        input: [
            { role: "system", content: [{ type: "input_text", text: systemText }] },
            {
                role: "user",
                content: [
                    { type: "input_text", text: userInputText },
                    { type: "input_image", image_url: photoSignedUrl },
                ],
            },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "quest_photo_message_v1",
                schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        message: { type: "string" },
                    },
                    required: ["title", "description", "message"],
                },
            },
        },
    };

    Log.debug("photo_mj.openai.request.prepared", {
        metadata: {
            model,
            provider,
            system_len: systemText.length,
            user_len: userInputText.length,
            has_image: true,
            photo_category: photoCategory,
            photo_caption_snippet: safeSnippet(String(input.photo_caption ?? ""), 140) || null,
        },
    });

    const startedAt = new Date();

    // Journal "début" (best-effort)
    if (ctx.session_id) {
        const j0 = Date.now();
        await Promise.allSettled([
            createJournalEntry({
                session_id: ctx.session_id,
                kind: "note",
                title: "📸 Le MJ observe la preuve",
                content: `Analyse d’une photo (${photoCategoryLabel(photoCategory)}) pour: ${quest.quest_title}.`,
                chapter_id: ctx.chapter_id,
                adventure_quest_id: quest.adventure_quest_id ?? null,
                meta: {
                    photo_id: photoId,
                    photo_category: photoCategory,
                    chapter_quest_id: chapterQuestId,
                },
            }),
        ]);

        Log.info("photo_mj.journal.start.created", {
            metadata: { ms: msSince(j0), session_id: ctx.session_id, photo_id: photoId },
        });
    } else {
        Log.warning("photo_mj.journal.start.skipped.no_session", {
            metadata: { session_id: ctx.session_id },
        });
    }

    let response: any = null;
    let outputText: string | null = null;
    let parsed: PhotoQuestMessageJson | null = null;
    let parseError: string | null = null;

    try {
        // 3) OpenAI call + parsing
        const o0 = Date.now();
        response = await openai.responses.create(requestJson as any);

        Log.success("photo_mj.openai.response.received", {
            metadata: {
                ms: msSince(o0),
                has_output_text: typeof response?.output_text === "string",
                usage: response?.usage ?? null,
            },
        });

        outputText = typeof response?.output_text === "string" ? response.output_text : null;

        const p1 = Date.now();
        try {
            parsed = outputText ? (JSON.parse(outputText) as PhotoQuestMessageJson) : null;
        } catch (e: any) {
            parseError = e?.message ? String(e.message) : "JSON parse error";
            parsed = null;
        }

        Log.debug("photo_mj.openai.parse", {
            metadata: {
                ms: msSince(p1),
                parse_ok: !!(parsed?.title && parsed?.description && parsed?.message),
                parse_error: parseError,
                output_snippet: outputText ? safeSnippet(outputText, 260) : null,
            },
        });

        if (!parsed?.title || !parsed?.description || !parsed?.message) {
            throw new Error(parseError ?? "Invalid photo quest message JSON output");
        }

        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();

        // ✅ Log success (ai_generations)
        const l0 = Date.now();
        await Promise.allSettled([
            ctx.session_id
                ? createAiGenerationLog({
                      session_id: ctx.session_id,
                      user_id: userId,

                      generation_type: "quest_photo_message",
                      source: "generatePhotoQuestMessageForQuest",

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

                      rendered_md: null,

                      usage_json: response?.usage ?? null,
                      tags: ["quest", "photo", "mj"],
                      metadata: {
                          tone,
                          style,
                          verbosity,
                          character_name: character?.name ?? null,
                          character_emoji: character?.emoji ?? null,
                          photo_id: photoId,
                          photo_category: photoCategory,
                      },
                  })
                : Promise.resolve(null),
        ]);

        Log.success("photo_mj.ai_generations.logged", {
            metadata: { ms: msSince(l0), session_id: ctx.session_id, duration_ms: durationMs },
        });

        // ✅ Message MJ en BDD (thread)
        if (ctx.session_id) {
            const th0 = Date.now();
            const threadId = await ensureQuestThreadId({
                session_id: ctx.session_id,
                chapter_quest_id: chapterQuestId,
            });

            Log.debug("photo_mj.thread.ensure.done", {
                metadata: { ms: msSince(th0), thread_id: threadId, session_id: ctx.session_id },
            });

            if (threadId) {
                const msg0 = Date.now();
                await createQuestMessageRow({
                    session_id: ctx.session_id,
                    thread_id: threadId,
                    chapter_quest_id: chapterQuestId,
                    role: "mj",
                    kind: "photo_recognition",
                    title: safeTrim(parsed.title) || "Preuve reçue",
                    content:
                        // `${safeTrim(parsed.description)}\n\n` +
                        `${safeTrim(parsed.message)}`.trim(),
                    meta: {
                        photo_id: photoId,
                        photo_category: photoCategory,
                        photo_caption: safeTrim(input.photo_caption ?? "") || null,
                        quest_title: quest.quest_title,
                        room_code: quest.room_code,
                        difficulty: quest.difficulty,
                    },
                    photo_id: photoId,
                });

                Log.success("photo_mj.thread.message.created", {
                    metadata: { ms: msSince(msg0), thread_id: threadId, photo_id: photoId },
                });

                const aiDescription = safeTrim(parsed.description) || null;

                if (photoId && aiDescription) {
                    const u0 = Date.now();

                    const { error: updErr } = await supabase
                        .from("photos")
                        .update({ ai_description: aiDescription })
                        .eq("id", photoId);

                    if (updErr) {
                        Log.warning("photo_mj.photo.update_ai_description.error", {
                            metadata: {
                                ms: msSince(u0),
                                photo_id: photoId,
                                error: updErr.message,
                            },
                        });
                    } else {
                        Log.success("photo_mj.photo.update_ai_description.ok", {
                            metadata: {
                                ms: msSince(u0),
                                photo_id: photoId,
                                len: aiDescription.length,
                            },
                        });
                    }
                }
            } else {
                Log.warning("photo_mj.thread.message.skipped.no_thread", {
                    metadata: { session_id: ctx.session_id, chapter_quest_id: chapterQuestId },
                });
            }

            // ✅ Journal: résultat dispo
            const j1 = Date.now();
            await Promise.allSettled([
                createJournalEntry({
                    session_id: ctx.session_id,
                    kind: "note",
                    title: `🎭 ${safeTrim(parsed.title) || "Le MJ répond"}`,
                    content:
                        `${safeTrim(parsed.description)}\n\n` +
                        `${safeTrim(parsed.message)}`.trim(),
                    chapter_id: ctx.chapter_id,
                    adventure_quest_id: quest.adventure_quest_id ?? null,
                    meta: {
                        photo_id: photoId,
                        photo_category: photoCategory,
                        chapter_quest_id: chapterQuestId,
                    },
                }),
            ]);

            Log.success("photo_mj.journal.result.created", {
                metadata: {
                    ms: msSince(j1),
                    session_id: ctx.session_id,
                    photo_id: photoId,
                    title: safeTrim(parsed.title) || null,
                },
            });
        } else {
            Log.warning("photo_mj.persist.skipped.no_session", {
                metadata: { chapter_quest_id: chapterQuestId },
            });
        }

        Log.success("photo_mj.ok", {
            metadata: {
                total_ms: msSince(startedAtMs),
                photo_id: photoId,
                chapter_quest_id: chapterQuestId,
                session_id: ctx.session_id,
            },
        });

        timer.endSuccess("photo_mj.success", { metadata: { total_ms: msSince(startedAtMs) } });

        return {
            mj_message: parsed,
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

        Log.error("photo_mj.error", e, {
            metadata: {
                total_ms: msSince(startedAtMs),
                duration_ms: durationMs,
                photo_id: photoId,
                photo_category: photoCategory,
                chapter_quest_id: chapterQuestId,
                session_id: ctx.session_id,
                parse_error: parseError,
                output_snippet: outputText ? safeSnippet(outputText, 260) : null,
            },
        });

        // ✅ Log error (ai_generations)
        await Promise.allSettled([
            ctx.session_id
                ? createAiGenerationLog({
                      session_id: ctx.session_id,
                      user_id: userId,

                      generation_type: "quest_photo_message",
                      source: "generatePhotoQuestMessageForQuest",

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
                      tags: ["quest", "photo", "mj", "error"],
                      metadata: {
                          tone,
                          style,
                          verbosity,
                          character_name: character?.name ?? null,
                          character_emoji: character?.emoji ?? null,
                          photo_id: photoId,
                          photo_category: photoCategory,
                      },
                  })
                : Promise.resolve(null),
        ]);

        // ✅ Journal soft
        if (ctx.session_id) {
            const j2 = Date.now();
            await Promise.allSettled([
                createJournalEntry({
                    session_id: ctx.session_id,
                    kind: "note",
                    title: "⚠️ Le MJ n’a pas pu lire la preuve",
                    content: `Échec analyse photo: ${errorMessage}`,
                    chapter_id: ctx.chapter_id,
                    adventure_quest_id: quest.adventure_quest_id ?? null,
                    meta: {
                        photo_id: photoId,
                        photo_category: photoCategory,
                        chapter_quest_id: chapterQuestId,
                    },
                }),
            ]);

            Log.warning("photo_mj.journal.error_trace.created", {
                metadata: { ms: msSince(j2), session_id: ctx.session_id, photo_id: photoId },
            });
        }

        timer.endError("photo_mj.failed", e, { metadata: { total_ms: msSince(startedAtMs) } });

        throw new Error(errorMessage);
    }
}
