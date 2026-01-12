import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";

// Context loaders
// import { getPlayerContext } from "@/lib/context/getPlayerContext";
import { getCharacterContext } from "@/lib/context/getCharacterContext";
import { getChapterContext } from "@/lib/context/getChapterContext";
import { getAdventureContext } from "@/lib/context/getAdventureContext";
import { getChapterDoneQuestsContext } from "@/lib/context/getChapterDoneQuestsContext";
import { buildContextPrompt } from "@/lib/context/buildContextPrompt";

// Logs
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";
import { getPlayerWithDetailsContext } from "../context/getPlayerWithDetailsContext";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type ChapterStoryResult = {
    chapter_id: string;
    session_id: string;
    story_json: any;
    story_md: string;
    model: string;
    cached: boolean;
};

type ChapterStoryCacheRow = {
    chapter_id: string;
    session_id: string;
    story_json: any;
    story_md: string;
    model: string;
    updated_at: string;
};

/* ============================================================================
🧠 CONSTANTS (prompt parts)
============================================================================ */

const GAME_INTRO = `
Tu es le Maître du Jeu de **Renaissance**.

Renaissance transforme la vie réelle du joueur en aventure narrative structurée.
Chaque chapitre raconte ce qui a été accompli, compris et dépassé.
`.trim();

const PROMPT_INTRO = `
Ta tâche est d’écrire un **RÉCIT DE CHAPITRE**.

Ce récit:
- fige ce qui a été accompli
- donne du sens aux quêtes terminées
- marque une étape claire dans l’aventure du joueur
`.trim();

const PROMPT_CONSTRAINTS = `
════════════════════════════════════
📐 CONTRAINTES DE SORTIE
════════════════════════════════════

Tu dois produire un JSON strict conforme au schéma attendu.

Règles:
- Ton incarné Maître du Jeu
- Narratif, sensoriel, concret
- Aucune méta, aucune mention d’IA
- Emojis sobres et signifiants

Structure attendue:
- title
- summary (3-4 phrases)
- scenes (1 scène par quête terminée, ordre fourni)
- trophies (2 à 6)
- mj_verdict (1 phrase)
`.trim();

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function renderStoryMd(json: any): string {
    const out: string[] = [];

    if (json?.summary) {
        out.push(`**${safeTrim(json.summary)}**`, ``);
    }

    if (Array.isArray(json?.scenes)) {
        out.push(`**🎬 Scènes**`, ``);
        for (const s of json.scenes) {
            const title = safeTrim(s.quest_title) || "Quête";
            const room = safeTrim(s.room_code);
            out.push(`- **${room ? `${title} · ${room}` : title}**`);
            if (s.scene) out.push(`  ${safeTrim(s.scene)}`, ``);
        }
    }

    if (Array.isArray(json?.trophies)) {
        out.push(`**🏅 Trophées**`, ``);
        for (const t of json.trophies) {
            out.push(`- **${safeTrim(t.title)}** — ${safeTrim(t.description)}`);
        }
        out.push(``);
    }

    if (json?.mj_verdict) {
        out.push(`**🧙 Avis du MJ**`, ``, safeTrim(json.mj_verdict));
    }

    return out.join("\n").trim();
}

/* ============================================================================
🗺️ MAIN
============================================================================ */

export async function generateJournalChapterStory(args: {
    chapter_id: string;
    user_id: string;
    force?: boolean;
}): Promise<ChapterStoryResult> {
    const request_id = crypto.randomUUID();
    const startedAtMs = Date.now();

    return await withRequestContext(
        {
            request_id,
            route: "lib/prompts/generateJournalChapterStory",
            method: "RUN",
            started_at_ms: startedAtMs,
        },
        async () => {
            const t = Log.timer("generateJournalChapterStory", {
                source: "src/lib/prompts/generateJournalChapterStory.ts",
            });

            const chapter_id = safeTrim(args.chapter_id);
            const user_id = safeTrim(args.user_id);
            const force = !!args.force;

            try {
                if (!chapter_id || !user_id) {
                    t.endError("chapter_story.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing chapter_id or user_id");
                }

                patchRequestContext({ user_id, chapter_id });

                const supabase = await supabaseAdmin();

                /* ------------------------------------------------------------
                 1) Charger chapter + session
                ------------------------------------------------------------ */
                const { data: chapter, error } = await supabase
                    .from("chapters")
                    .select("id, session_id, adventure_id, title")
                    .eq("id", chapter_id)
                    .maybeSingle();

                if (error || !chapter?.id || !chapter.session_id) {
                    t.endError("chapter_story.chapter_not_found", error, { status_code: 404 });
                    throw new Error("Chapter not found");
                }

                const session_id = chapter.session_id;
                const adventure_id = chapter.adventure_id ?? null;

                patchRequestContext({
                    session_id,
                    adventure_id: adventure_id ?? undefined,
                });

                /* ------------------------------------------------------------
                 2) Cache
                ------------------------------------------------------------ */
                if (!force) {
                    const { data: cached } = await supabase
                        .from("chapter_stories")
                        .select("chapter_id, session_id, story_json, story_md, model, updated_at")
                        .eq("chapter_id", chapter_id)
                        .eq("session_id", session_id)
                        .maybeSingle();

                    if (cached) {
                        t.endSuccess("chapter_story.cached", { status_code: 200 });
                        return {
                            chapter_id,
                            session_id,
                            story_json: cached.story_json,
                            story_md: cached.story_md,
                            model: cached.model,
                            cached: true,
                        };
                    }
                }

                /* ------------------------------------------------------------
                 3) Contexts
                ------------------------------------------------------------ */
                const [player, character, chapterCtx, adventureCtx, doneQuests] = await Promise.all(
                    [
                        getPlayerWithDetailsContext({ mode: "server", user_id }),
                        getCharacterContext({ mode: "server", user_id }),
                        getChapterContext({ mode: "server", chapter_id }),
                        adventure_id
                            ? getAdventureContext({ mode: "server", adventure_id })
                            : Promise.resolve(null),
                        getChapterDoneQuestsContext({ mode: "server", chapter_id }),
                    ]
                );

                const ctxPrompt = buildContextPrompt({
                    player,
                    character,
                    chapter: chapterCtx,
                    adventure: adventureCtx,
                    doneQuests: doneQuests,
                });

                /* ------------------------------------------------------------
                 4) Prompt
                ------------------------------------------------------------ */
                const systemText = [
                    GAME_INTRO,
                    PROMPT_INTRO,
                    ctxPrompt.text,
                    PROMPT_CONSTRAINTS,
                ].join("\n");

                const userText = `Génère le récit de chapitre en JSON strict.`;

                const model = "gpt-4.1";
                const requestPayload = {
                    model,
                    input: [
                        { role: "system", content: [{ type: "input_text", text: systemText }] },
                        { role: "user", content: [{ type: "input_text", text: userText }] },
                    ],
                    text: {
                        format: {
                            type: "json_schema",
                            name: "chapter_story_v4",
                            schema: {
                                type: "object",
                                additionalProperties: false,
                                properties: {
                                    title: { type: "string" },
                                    summary: { type: "string" },

                                    scenes: {
                                        type: "array",
                                        minItems: 1,
                                        items: {
                                            type: "object",
                                            additionalProperties: false,
                                            properties: {
                                                quest_title: { type: "string" },
                                                room_code: { type: ["string", "null"] },
                                                scene: { type: "string" },
                                            },
                                            required: ["quest_title", "room_code", "scene"], // ✅ doit inclure toutes les props
                                        },
                                    },

                                    trophies: {
                                        type: "array",
                                        minItems: 2,
                                        maxItems: 6,
                                        items: {
                                            type: "object",
                                            additionalProperties: false,
                                            properties: {
                                                title: { type: "string" },
                                                description: { type: "string" },
                                            },
                                            required: ["title", "description"],
                                        },
                                    },

                                    mj_verdict: { type: "string" },
                                },
                                required: ["title", "summary", "scenes", "trophies", "mj_verdict"],
                            },
                        },
                    },
                };

                /* ------------------------------------------------------------
                 5) IA
                ------------------------------------------------------------ */
                const startedAt = new Date();
                const response = await openai.responses.create(requestPayload as any);
                const storyJson = JSON.parse(response.output_text);
                const storyMd = renderStoryMd(storyJson);

                /* ------------------------------------------------------------
                 6) Save
                ------------------------------------------------------------ */
                const { data: saved, error: saveErr } = await supabase
                    .from("chapter_stories")
                    .upsert(
                        {
                            chapter_id,
                            session_id,
                            story_json: storyJson,
                            story_md: storyMd,
                            model,
                        },
                        { onConflict: "chapter_id" }
                    )
                    .select()
                    .single();

                if (saveErr) throw saveErr;

                /* ------------------------------------------------------------
                 7) Logs & Journal
                ------------------------------------------------------------ */
                try {
                    await createAiGenerationLog({
                        session_id,
                        user_id,
                        chapter_id,
                        adventure_id,
                        generation_type: "chapter_story",
                        source: "generateJournalChapterStory",
                        provider: "openai",
                        model,
                        status: "success",
                        started_at: startedAt,
                        finished_at: new Date(),
                        duration_ms: msSince(startedAtMs),

                        request_json: requestPayload,
                        system_text: systemText,
                        user_input_text: userText,
                        context_json: {
                            player: player,
                            character: character,
                            doneQuests: doneQuests,
                            chapter: chapterCtx,

                            adventure: adventureCtx,
                        },
                        response_json: response,
                        // output_text: outputText,
                        parsed_json: storyJson,
                        rendered_md: storyMd,
                    } as any);
                } catch {}

                try {
                    await createJournalEntry({
                        session_id,
                        kind: "note",
                        title: "📖 Chapitre scellé",
                        content: `Le récit du chapitre "${chapter.title}" a été gravé.`,
                        chapter_id,
                    });
                } catch {}

                t.endSuccess("chapter_story.success", { status_code: 200 });

                return {
                    chapter_id,
                    session_id,
                    story_json: saved.story_json,
                    story_md: saved.story_md,
                    model,
                    cached: false,
                };
            } catch (e: any) {
                Log.error("chapter_story.fatal", e);
                t.endError("chapter_story.fatal", e, { status_code: 500 });
                throw e;
            }
        }
    );
}
