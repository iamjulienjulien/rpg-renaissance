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

/**
 * 🎒 Contexte “best-effort”
 * - On part de chapter_quest_id -> session_id (+ potentiel chapter_id / adventure_id si dispo)
 * - Puis on tente de récupérer un champ texte depuis:
 *   - game_sessions (context / context_text / player_context / adventure_context)
 *   - adventures (context / description)
 *   - chapters (notes / context)
 *
 * Si rien n’existe, on renvoie null.
 */
async function loadAdventureContextBestEffort(input: { chapter_quest_id: string }): Promise<{
    session_id: string | null;
    chapter_id: string | null;
    adventure_id: string | null;
    context_text: string | null;
}> {
    const supabase = await supabaseServer();

    // 1) chapter_quests -> session_id (+ chapter_id si ta table l’a)
    let session_id: string | null = null;
    let chapter_id: string | null = null;
    let adventure_id: string | null = null;

    try {
        // NOTE: si "chapter_id" n’existe pas dans ta table, Supabase renverra une erreur;
        // on retombe sur une requête minimale.
        const { data, error } = await supabase
            .from("chapter_quests")
            .select("session_id, chapter_id")
            .eq("id", input.chapter_quest_id)
            .maybeSingle();

        if (error) throw error;

        session_id = (data as any)?.session_id ?? null;
        chapter_id = (data as any)?.chapter_id ?? null;
    } catch {
        // fallback minimal
        const { data } = await supabase
            .from("chapter_quests")
            .select("session_id")
            .eq("id", input.chapter_quest_id)
            .maybeSingle();

        session_id = (data as any)?.session_id ?? null;
        chapter_id = null;
    }

    // 2) chapters -> adventure_id (si possible)
    if (chapter_id) {
        try {
            const { data } = await supabase
                .from("chapters")
                .select("adventure_id")
                .eq("id", chapter_id)
                .maybeSingle();

            adventure_id = (data as any)?.adventure_id ?? null;
        } catch {
            adventure_id = null;
        }
    }

    // 3) game_sessions -> contexte texte
    // On tente plusieurs noms de colonnes possibles (selon comment tu vas stocker le contexte).
    const tryColumns = ["context", "context_text", "player_context", "adventure_context"];

    let context_text: string | null = null;

    if (session_id) {
        for (const col of tryColumns) {
            try {
                const { data, error } = await supabase
                    .from("game_sessions")
                    .select(col)
                    .eq("id", session_id)
                    .maybeSingle();

                if (error) continue;

                const v = safeTrim((data as any)?.[col]);
                if (v) {
                    context_text = v;
                    break;
                }
            } catch {
                // ignore
            }
        }
    }

    // 4) fallback: adventures.description / adventures.context
    if (!context_text && adventure_id) {
        for (const col of ["context", "description"]) {
            try {
                const { data, error } = await supabase
                    .from("adventures")
                    .select(col)
                    .eq("id", adventure_id)
                    .maybeSingle();

                if (error) continue;

                const v = safeTrim((data as any)?.[col]);
                if (v) {
                    context_text = v;
                    break;
                }
            } catch {
                // ignore
            }
        }
    }

    // 5) fallback: chapters.context / chapters.notes
    if (!context_text && chapter_id) {
        for (const col of ["context", "notes"]) {
            try {
                const { data, error } = await supabase
                    .from("chapters")
                    .select(col)
                    .eq("id", chapter_id)
                    .maybeSingle();

                if (error) continue;

                const v = safeTrim((data as any)?.[col]);
                if (v) {
                    context_text = v;
                    break;
                }
            } catch {
                // ignore
            }
        }
    }

    return { session_id, chapter_id, adventure_id, context_text };
}

/* ============================================================================
🎉 MAIN
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

    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "motivant";
    const verbosity = character?.ai_style?.verbosity ?? "normal";
    const rules = verbosityRules(verbosity);

    // ✅ Contexte aventure (best-effort)
    const adv = await loadAdventureContextBestEffort({ chapter_quest_id: input.chapter_quest_id });

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
        character?.motto
            ? `Serment du personnage (à refléter sans le citer mot pour mot): ${character.motto}`
            : null,
        adv.context_text
            ? `Contexte global d'aventure (important, à intégrer subtilement): ${adv.context_text}`
            : `Contexte global: non fourni.`,
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
        session_id: adv.session_id,
        chapter_id: adv.chapter_id,
        adventure_id: adv.adventure_id,
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
                            `- title (court, 2 à 6 mots, style “sceau”) \n` +
                            `- message (félicitations)\n`,
                    },
                ],
            },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "quest_congrats_v1",
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
