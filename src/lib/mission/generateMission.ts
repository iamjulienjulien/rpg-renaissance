// src/lib/mission/generateMission.ts
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

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
🗺️ MAIN
============================================================================ */

/**
 * ✅ Ordre de mission IA pour une chapter_quest
 * - Prend en compte 2 contextes:
 *   - adventures.context_text = contexte global
 *   - chapters.context_text   = contexte spécifique du chapitre
 * - Cache scopé par session_id
 */
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

    // 1) Contexte global (aventure) + spécifique (chapitre)
    let adventureContext: string | null = null;
    let chapterContext: string | null = null;

    if (cq.chapter_id) {
        const { data: ch } = await supabase
            .from("chapters")
            .select("context_text, adventure_id")
            .eq("id", cq.chapter_id)
            .maybeSingle();

        const ctx = safeTrim((ch as any)?.context_text);
        chapterContext = ctx.length ? ctx : null;

        const adventureId = (ch as any)?.adventure_id as string | null;

        if (adventureId) {
            const { data: adv } = await supabase
                .from("adventures")
                .select("context_text")
                .eq("id", adventureId)
                .maybeSingle();

            const advCtx = safeTrim((adv as any)?.context_text);
            adventureContext = advCtx.length ? advCtx : null;
        }
    }

    const questContext = {
        title: q.title,
        description: q.description ?? "",
        room_code: q.room_code ?? "",
        difficulty: q.difficulty ?? 2,
        estimate_min: q.estimate_min ?? null,
        status: cq.status,
        adventure_context: adventureContext ?? "",
        chapter_context: chapterContext ?? "",
    };

    // 2) Cache (scopé session) si pas force
    if (!force) {
        const { data: existing } = await supabase
            .from("quest_mission_orders")
            .select("chapter_quest_id, session_id, mission_json, mission_md, model, updated_at")
            .eq("chapter_quest_id", chapterQuestId)
            .eq("session_id", sessionId)
            .maybeSingle();

        if (existing) return { mission: existing as MissionCacheRow, cached: true };
    }

    // 3) Style joueur / personnage
    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "motivant";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    // 4) Génération OpenAI
    const model = "gpt-4.1";

    const systemText = [
        `Tu es le Maître du Jeu de Renaissance.`,
        `Tu écris un ordre de mission RPG, concret, actionnable.`,
        `Le rendu FINAL sera assemblé côté code.`,
        `Emojis sobres.`,
        character
            ? `Voix: ${character.emoji ?? "🧙"} ${character.name}. Tone=${tone}, style=${style}, verbosity=${verbosity}.`
            : `Voix: neutre.`,
        playerName
            ? `Le joueur s'appelle "${playerName}". Utilise son nom 0 à 2 fois max.`
            : `Le joueur n'a pas de nom affiché.`,

        // ✅ Contextes
        adventureContext
            ? `CONTEXTE GLOBAL D’AVENTURE:\n${adventureContext}`
            : `CONTEXTE GLOBAL D’AVENTURE: (aucun).`,
        chapterContext
            ? `CONTEXTE SPÉCIFIQUE DU CHAPITRE:\n${chapterContext}`
            : `CONTEXTE SPÉCIFIQUE DU CHAPITRE: (aucun).`,
        `Règle d’or: le contexte global prime, le chapitre affine.`,
        character?.motto ? `Serment (à refléter sans citer): ${character.motto}` : null,
        `Contraintes: intro ≤ ${rules.maxIntroLines} lignes. Étapes ${rules.stepsMin}-${rules.stepsMax}.`,
        `Interdit: meta, disclaimers, "en tant qu'IA".`,
    ]
        .filter(Boolean)
        .join("\n");

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
                            `Contexte quête:\n${JSON.stringify(questContext, null, 2)}\n\n` +
                            `Génère:\n` +
                            `- intro\n- objectives_paragraph\n- steps\n- success_paragraph\n- title (optionnel)\n`,
                    },
                ],
            },
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
                        estimated_time: { type: "string" },
                        difficulty_label: { type: "string" },
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
                        "estimated_time",
                        "difficulty_label",
                        "intro",
                        "objectives_paragraph",
                        "steps",
                        "success_paragraph",
                    ],
                },
            },
        },
    });

    const missionJson = JSON.parse(response.output_text);

    // 5) Ajustements BDD
    missionJson.estimated_time =
        formatEstimate(questContext.estimate_min) ??
        missionJson.estimated_time ??
        "Temps estimé: ?";
    missionJson.difficulty_label = difficultyLabel(questContext.difficulty);

    // 6) Markdown final
    const missionMd = [
        `⏱️ ${missionJson.estimated_time}`,
        `💪 ${missionJson.difficulty_label}`,
        ``,
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

    if (saveErr) throw new Error(saveErr.message);

    return { mission: saved as MissionCacheRow, cached: false };
}
