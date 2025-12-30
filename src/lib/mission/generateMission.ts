// src/lib/mission/generateMission.ts
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";
import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";
import { buildMjContext } from "@/lib/context/buildMjContext";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type MissionCacheRow = {
    chapter_quest_id: string;
    session_id: string;
    mission_json: any;
    mission_md: string;
    model: string;
    updated_at: string;
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

/** ✅ plus de context aventure/chapitre dans QuestContext: maintenant via buildMjContext */
type QuestContext = {
    title: string;
    description: string;
    room_code: string;
    difficulty: number;
    estimate_min: number | null;
    status: string;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function verbosityRules(v?: string | null) {
    if (v === "short") return { maxIntroLines: 2, stepsMin: 3, stepsMax: 6 };
    if (v === "rich") return { maxIntroLines: 4, stepsMin: 5, stepsMax: 9 };
    return { maxIntroLines: 3, stepsMin: 3, stepsMax: 9 };
}

function difficultyLabel(d: number) {
    if (d <= 1) return "Facile";
    if (d === 2) return "Standard";
    return "Difficile";
}

function formatEstimate(estimateMin: number | null): string | null {
    if (!estimateMin || estimateMin <= 0) return null;
    if (estimateMin < 60) return `${estimateMin} min`;
    const h = Math.floor(estimateMin / 60);
    const m = estimateMin % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
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
🧠 PROMPT BUILDER
============================================================================ */

function buildSystemText(input: {
    playerName: string | null;
    character: CharacterStyle | null;
    tone: string;
    style: string;
    verbosity: string;
    rules: { maxIntroLines: number; stepsMin: number; stepsMax: number };
    mjContext?: {
        user?: {
            self?: string | null;
            family?: string | null;
            home?: string | null;
            routine?: string | null;
            challenges?: string | null;
        };
        adventure?: {
            title?: string | null;
            context?: string | null;
        };
        chapter?: {
            title?: string | null;
            context?: string | null;
        };
    } | null;
    quest: {
        title: string;
        description: string;
        room_code?: string | null;
        difficulty: number;
        estimate_min: number | null;
        status: string;
    };
}) {
    const { playerName, character, tone, style, verbosity, rules, mjContext, quest } = input;

    const ctx = mjContext ?? {};

    const difficulty =
        quest.difficulty <= 1 ? "facile" : quest.difficulty === 2 ? "standard" : "difficile";

    return [
        `Tu es le Maître du Jeu de Renaissance.`,
        `Tu écris un ORDRE DE MISSION RPG, concret, actionnable, destiné à être exécuté dans le monde réel.`,
        `Ce texte doit guider l’action, clarifier les priorités et donner envie d’agir.`,

        ``,
        `════════════════════════════════════`,
        `🎯 QUÊTE À ACCOMPLIR`,
        `════════════════════════════════════`,
        `Titre: ${quest.title}`,
        quest.description ? `Description: ${quest.description}` : null,
        quest.room_code ? `Zone concernée: ${quest.room_code}` : null,
        `Difficulté: ${difficulty}`,
        quest.estimate_min
            ? `Temps estimé: environ ${quest.estimate_min} minutes`
            : `Temps estimé: non précisé`,
        `État actuel de la quête: ${quest.status}`,

        ``,
        `Ta mission: transformer cette quête en un ordre clair, motivant et structuré.`,
        `Le joueur doit savoir exactement quoi faire, dans quel ordre, et comment reconnaître la réussite.`,

        ``,
        `════════════════════════════════════`,
        `🧠 CONTEXTE DU JOUEUR (à respecter en priorité)`,
        `════════════════════════════════════`,
        ctx.user?.self ? `👤 Joueur: ${ctx.user.self}` : null,
        ctx.user?.family ? `👨‍👩‍👧 Famille: ${ctx.user.family}` : null,
        ctx.user?.home ? `🏠 Foyer: ${ctx.user.home}` : null,
        ctx.user?.routine ? `⏱️ Quotidien: ${ctx.user.routine}` : null,
        ctx.user?.challenges ? `⚠️ Défis actuels: ${ctx.user.challenges}` : null,

        ``,
        `════════════════════════════════════`,
        `🌍 CONTEXTE GLOBAL D’AVENTURE`,
        `════════════════════════════════════`,
        ctx.adventure?.title ? `Aventure: ${ctx.adventure.title}` : null,
        ctx.adventure?.context ? ctx.adventure.context : null,

        ``,
        `════════════════════════════════════`,
        `📖 CONTEXTE DU CHAPITRE`,
        `════════════════════════════════════`,
        ctx.chapter?.title ? `Chapitre: ${ctx.chapter.title}` : null,
        ctx.chapter?.context ? ctx.chapter.context : null,

        ``,
        `Règle d’or:`,
        `1) Le contexte du joueur prime toujours.`,
        `2) Le contexte d’aventure donne la direction.`,
        `3) Le chapitre affine l’angle et le ton.`,

        ``,
        `════════════════════════════════════`,
        `🎭 STYLE DU MAÎTRE DU JEU`,
        `════════════════════════════════════`,
        character ? `Voix: ${character.emoji ?? "🧙"} ${character.name}` : `Voix: neutre`,
        `Tone: ${tone}`,
        `Style: ${style}`,
        `Verbosité: ${verbosity}`,
        character?.motto ? `Serment du MJ (à refléter sans citer): ${character.motto}` : null,
        playerName
            ? `Nom du joueur: "${playerName}" (à utiliser 0 à 2 fois maximum)`
            : `Le joueur n’a pas de nom affiché.`,

        ``,
        `════════════════════════════════════`,
        `📐 CONTRAINTES DE FORME`,
        `════════════════════════════════════`,
        `- Introduction: maximum ${rules.maxIntroLines} lignes.`,
        `- Étapes: entre ${rules.stepsMin} et ${rules.stepsMax} étapes concrètes.`,
        `- Style direct, orienté action, sans blabla.`,

        ``,
        `Interdictions strictes:`,
        `- Pas de meta, pas de mentions d’IA.`,
        `- Pas d’hésitations ni de conditionnel mou.`,
        `- Pas de conseils vagues.`,

        ``,
        `La sortie doit respecter STRICTEMENT le schéma JSON demandé.`,
    ]
        .filter(Boolean)
        .join("\n");
}

function buildUserText(questContext: QuestContext) {
    return (
        `Contexte quête:\n${JSON.stringify(questContext, null, 2)}\n\n` +
        `Génère:\n` +
        `- intro\n- objectives_paragraph\n- steps\n- success_paragraph\n- title (optionnel)\n`
    );
}

/* ============================================================================
🗺️ MAIN
============================================================================ */

export async function generateMissionForChapterQuest(
    chapterQuestId: string,
    force: boolean = false
) {
    const supabase = await supabaseServer();

    // ✅ Auth obligatoire (login-only)
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(authErr.message);

    const userId = authData?.user?.id ?? "";
    if (!userId) throw new Error("Not authenticated");

    // 0) Charger chapter_quest + session_id + quête (+ chapter_id)
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select(
            `
            id,
            chapter_id,
            status,
            session_id,
            adventure_quests!chapter_quests_adventure_quest_id_fkey (
                id,
                title,
                description,
                room_code,
                difficulty,
                estimate_min
            )
        `
        )
        .eq("id", chapterQuestId)
        .maybeSingle();

    if (cqErr) throw new Error(cqErr.message);
    if (!cq) throw new Error("Chapter quest not found");
    if (!cq.session_id) throw new Error("Missing session_id on chapter_quests");
    if (!cq.adventure_quests) throw new Error("Quest not found");

    const sessionId = cq.session_id as string;
    const q = Array.isArray(cq.adventure_quests) ? cq.adventure_quests[0] : cq.adventure_quests;

    const chapterId = (cq as any)?.chapter_id ?? null;

    const questContext: QuestContext = {
        title: q.title,
        description: q.description ?? "",
        room_code: q.room_code ?? "",
        difficulty: q.difficulty ?? 2,
        estimate_min: q.estimate_min ?? null,
        status: cq.status,
    };

    // ✅ Nouveau: contexte MJ unifié (user + adventure(active session) + chapter(chapterId))
    const mjContext = chapterId ? await buildMjContext({ chapterId }) : null;

    // 2) Cache (scopé session) si pas force
    if (!force) {
        const { data: existing } = await supabase
            .from("quest_mission_orders")
            .select("chapter_quest_id, session_id, mission_json, mission_md, model, updated_at")
            .eq("chapter_quest_id", chapterQuestId)
            .eq("session_id", sessionId)
            .maybeSingle();

        if (existing) {
            // ✅ Journal entry best-effort (cache hit)
            try {
                await createJournalEntry({
                    session_id: sessionId,
                    kind: "note",
                    title: "🧠 Mission (cache)",
                    content: `Mission récupérée depuis le cache pour "${safeTrim(q.title) || "Quête"}".`,
                    chapter_id: chapterId ?? null,
                    quest_id: chapterQuestId,
                    adventure_quest_id: q.id ?? null,
                });
            } catch {}

            // ✅ Log best-effort (cache hit)
            try {
                await createAiGenerationLog({
                    session_id: sessionId,
                    user_id: userId,
                    generation_type: "mission_order",
                    source: "generateMissionForChapterQuest",
                    provider: "openai",
                    model: (existing as any)?.model ?? "unknown",
                    status: "success",
                    chapter_quest_id: chapterQuestId,
                    chapter_id: chapterId ?? null,
                    request_json: {
                        cached: true,
                        force: false,
                        quest_context: questContext,
                    },
                    context_json: { mj: mjContext, quest: questContext },
                    response_json: null,
                    output_text: null,
                    parsed_json: (existing as any)?.mission_json ?? null,
                    rendered_md: (existing as any)?.mission_md ?? null,
                    metadata: {
                        note: "cache_hit",
                        updated_at: (existing as any)?.updated_at ?? null,
                    },
                });
            } catch {}

            return { mission: existing as MissionCacheRow, cached: true };
        }
    }

    // 3) Style joueur / personnage
    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "motivant";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    // 4) Génération OpenAI (+ log complet)
    const model = "gpt-4.1";

    const mjContextForPrompt = mjContext
        ? {
              user: mjContext.user
                  ? {
                        self: mjContext.user.self ?? null,
                        family: mjContext.user.family ?? null,
                        home: mjContext.user.home ?? null,
                        routine: mjContext.user.routine ?? null,
                        challenges: mjContext.user.challenges ?? null,
                    }
                  : undefined,
              adventure: mjContext.adventure
                  ? {
                        title: (mjContext.adventure as any)?.title ?? null,
                        context: (mjContext.adventure as any)?.text ?? null,
                    }
                  : undefined,
              chapter: mjContext.chapter
                  ? {
                        title: (mjContext.chapter as any)?.title ?? null,
                        context: (mjContext.chapter as any)?.text ?? null,
                    }
                  : undefined,
          }
        : null;

    // ✅ NEW: passer la quête (et le mjContext unifié) à buildSystemText
    const systemText = buildSystemText({
        playerName,
        character,
        tone,
        style,
        verbosity,
        rules,
        mjContext: mjContextForPrompt, // ✅ NEW (au lieu de adventureContext/chapterContext)
        quest: {
            title: questContext.title,
            description: questContext.description ?? "",
            room_code: questContext.room_code ?? null,
            difficulty: questContext.difficulty ?? 2,
            estimate_min: questContext.estimate_min ?? null,
            status: questContext.status ?? "todo",
        },
    });

    // (optionnel) tu peux alléger le userText maintenant que la quête est dans le system prompt
    const userText = buildUserText(questContext);

    const requestPayload = {
        model,
        input: [
            { role: "system", content: [{ type: "input_text", text: systemText }] },
            { role: "user", content: [{ type: "input_text", text: userText }] },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "mission_order_v2",
                schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        title: { type: "string" },
                        intro: { type: "string" },
                        objectives_paragraph: { type: "string" },
                        steps: {
                            type: "array",
                            items: { type: "string" },
                            minItems: rules.stepsMin,
                            maxItems: rules.stepsMax,
                        },
                        success_paragraph: { type: "string" },
                    },
                    required: [
                        "title",
                        "intro",
                        "objectives_paragraph",
                        "steps",
                        "success_paragraph",
                    ],
                },
            },
        },
    };

    const startedAt = new Date();
    const t0 = Date.now();

    let response: any = null;
    let missionJson: any = null;
    let missionMd: string | null = null;

    try {
        response = await openai.responses.create(requestPayload as any);
        missionJson = JSON.parse(response.output_text);

        missionMd = [
            missionJson.intro,
            ``,
            `**🎯 Objectifs**`,
            ``,
            missionJson.objectives_paragraph,
            ``,
            `**🪜 Étapes**`,
            ``,
            ...(missionJson.steps ?? []).map((x: string) => `- ${x}`),
            ``,
            `**✅ Réussite**`,
            ``,
            missionJson.success_paragraph,
        ].join("\n");
    } catch (err: any) {
        const finishedAt = new Date();
        const durationMs = Date.now() - t0;

        try {
            await createAiGenerationLog({
                session_id: sessionId,
                user_id: userId,
                generation_type: "mission_order",
                source: "generateMissionForChapterQuest",
                provider: "openai",
                model,
                status: "error",
                chapter_quest_id: chapterQuestId,
                chapter_id: chapterId ?? null,
                started_at: startedAt,
                finished_at: finishedAt,
                duration_ms: durationMs,
                request_json: requestPayload,
                system_text: systemText,
                user_input_text: userText,
                context_json: { mj: mjContext, quest: questContext },
                response_json: null,
                output_text: null,
                parsed_json: null,
                parse_error: null,
                rendered_md: null,
                error_message: err?.message ? String(err.message) : "Unknown error",
                metadata: { quest_title: safeTrim(q.title) || null },
            });
        } catch {}

        try {
            await createJournalEntry({
                session_id: sessionId,
                kind: "note",
                title: "🧠 Mission (erreur IA)",
                content:
                    `Échec génération mission pour "${safeTrim(q.title) || "Quête"}".\n` +
                    `Erreur: ${err?.message ? String(err.message) : "Unknown error"}`,
                chapter_id: chapterId ?? null,
                quest_id: chapterQuestId,
                adventure_quest_id: q.id ?? null,
            });
        } catch {}

        throw err;
    }

    const finishedAt = new Date();
    const durationMs = Date.now() - t0;

    // 7) Upsert cache (scopé session)
    const { data: saved, error: saveErr } = await supabase
        .from("quest_mission_orders")
        .upsert(
            {
                chapter_quest_id: chapterQuestId,
                session_id: sessionId,
                mission_json: missionJson,
                mission_md: missionMd,
                model,
            },
            { onConflict: "chapter_quest_id" }
        )
        .select("chapter_quest_id, session_id, mission_json, mission_md, model, updated_at")
        .single();

    if (saveErr) {
        try {
            await createAiGenerationLog({
                session_id: sessionId,
                user_id: userId,
                generation_type: "mission_order",
                source: "generateMissionForChapterQuest",
                provider: "openai",
                model,
                status: "error",
                chapter_quest_id: chapterQuestId,
                chapter_id: chapterId ?? null,
                started_at: startedAt,
                finished_at: finishedAt,
                duration_ms: durationMs,
                request_json: requestPayload,
                system_text: systemText,
                user_input_text: userText,
                context_json: { mj: mjContext, quest: questContext },
                response_json: response,
                output_text: response?.output_text ?? null,
                parsed_json: missionJson,
                parse_error: null,
                rendered_md: missionMd,
                error_message: `Mission cache upsert failed: ${saveErr.message}`,
            });
        } catch {}

        throw new Error(saveErr.message);
    }

    // ✅ Log BDD (success) best-effort
    try {
        await createAiGenerationLog({
            session_id: sessionId,
            user_id: userId,
            generation_type: "mission_order",
            source: "generateMissionForChapterQuest",
            provider: "openai",
            model,
            status: "success",
            chapter_quest_id: chapterQuestId,
            chapter_id: chapterId ?? null,
            started_at: startedAt,
            finished_at: finishedAt,
            duration_ms: durationMs,
            request_json: requestPayload,
            system_text: systemText,
            user_input_text: userText,
            context_json: { mj: mjContext, quest: questContext },
            response_json: response,
            output_text: response?.output_text ?? null,
            parsed_json: missionJson,
            parse_error: null,
            rendered_md: missionMd,
            usage_json: (response as any)?.usage ?? null,
            metadata: {
                force,
                quest_title: safeTrim(q.title) || null,
                cache_write: true,
            },
        });
    } catch {}

    // ✅ Journal entry best-effort (success)
    try {
        const hasUser = !!(mjContext as any)?.user;
        const hasAdv = !!(mjContext as any)?.adventure;
        const hasCh = !!(mjContext as any)?.chapter;

        await createJournalEntry({
            session_id: sessionId,
            kind: "note",
            title: "🧠 Mission générée",
            content:
                `Le MJ a forgé un ordre de mission pour "${safeTrim(q.title) || "Quête"}".\n` +
                `Modèle: ${model}\n` +
                `Contexte: user=${hasUser ? "✓" : "—"} / adventure=${hasAdv ? "✓" : "—"} / chapter=${hasCh ? "✓" : "—"}`,
            chapter_id: chapterId ?? null,
            quest_id: chapterQuestId,
            adventure_quest_id: q.id ?? null,
        });
    } catch {}

    return { mission: saved as MissionCacheRow, cached: false };
}
