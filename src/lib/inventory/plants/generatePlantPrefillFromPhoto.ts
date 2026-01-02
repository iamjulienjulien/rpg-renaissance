// src/lib/inventory/plants/generatePlantPrefillFromPhoto.ts
import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";
import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

import {
    OPENAI_PLANT_PREFILL_SCHEMA_V1,
    PLANTS_SCHEMA_VERSION,
    PlantDraftV1,
    validatePlantDraftV1,
    PLANTS_FIELD_KEYS_V1,
    type PlantFieldTypeV1,
} from "@/lib/inventory/schemas/plants/v1";

/* ============================================================================
🧱 TYPES
============================================================================ */

export type GeneratePlantPrefillInput = {
    photo_id: string;
    photo_signed_url: string; // URL courte durée
    photo_caption?: string | null; // optionnel
};

type PlayerContext = {
    display_name: string | null;
    character: {
        name: string;
        emoji: string | null;
        motto: string | null;
        ai_style?: { tone?: string; style?: string; verbosity?: string } | null;
    } | null;
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

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function safeSnippet(s: string, max = 240) {
    const x = safeTrim(s);
    if (!x) return "";
    return x.length > max ? `${x.slice(0, max)}…` : x;
}

function guessFieldType(key: string): PlantFieldTypeV1 {
    if (key === "light" || key === "watering" || key === "health") return "enum";
    if (key === "notes") return "text";
    return "string";
}

export function coercePlantPrefillToDraftV1(raw: any) {
    const out: any = {
        schema_version: PLANTS_SCHEMA_VERSION,
        title: typeof raw?.title === "string" ? raw.title : "",
        ai_description: typeof raw?.ai_description === "string" ? raw.ai_description : "",
        data: {},
    };

    const rawData = raw?.data ?? {};

    for (const key of PLANTS_FIELD_KEYS_V1) {
        const v = rawData?.[key];

        // Déjà au bon format {type,value}
        if (v && typeof v === "object" && "type" in v && "value" in v) {
            out.data[key] = v;
            continue;
        }

        // Format string/null => wrap
        out.data[key] = {
            type: guessFieldType(key),
            value: v ?? null,
        };
    }

    // Fallback title si manquant
    if (!out.title) {
        const n = out.data?.name?.value;
        const cn = out.data?.common_name?.value;
        out.title =
            (typeof n === "string" && n.trim()) ||
            (typeof cn === "string" && cn.trim()) ||
            "Plante";
    }

    // Fallback ai_description si manquant
    if (!out.ai_description) {
        out.ai_description = "Plante observée. Description à compléter.";
    }

    return out;
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
                motto,
                ai_style
            )
        `
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        return { display_name: null, character: null };
    }

    const display_name = safeTrim((data as any)?.display_name) || null;
    const c = normalizeSingle((data as any)?.characters);

    if (!c) return { display_name, character: null };

    return {
        display_name,
        character: {
            name: c.name ?? "Maître du Jeu",
            emoji: c.emoji ?? null,
            motto: c.motto ?? null,
            ai_style: c.ai_style ?? null,
        },
    };
}

/* ============================================================================
🌿 MAIN
============================================================================ */

export async function generatePlantPrefillFromPhoto(input: GeneratePlantPrefillInput) {
    const startedAtMs = Date.now();
    const timer = Log.timer("generatePlantPrefillFromPhoto", {
        source: "src/lib/inventory/plants/generatePlantPrefillFromPhoto.ts",
        metadata: { photo_id: safeTrim(input.photo_id) || null },
    });

    const supabase = await supabaseServer();

    // ✅ Auth obligatoire (login-only)
    const a0 = Date.now();
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
        timer.endError("plants.prefill.auth.error", authErr, { status_code: 401 });
        throw new Error(authErr.message);
    }
    const userId = authData?.user?.id ?? "";
    if (!userId) {
        timer.endError("plants.prefill.auth.missing_user", undefined, { status_code: 401 });
        throw new Error("Not authenticated");
    }

    patchRequestContext({ user_id: userId });

    const photoId = safeTrim(input.photo_id);
    const photoSignedUrl = safeTrim(input.photo_signed_url);
    if (!photoId || !photoSignedUrl) {
        timer.endError("plants.prefill.bad_input", undefined, { status_code: 400 });
        throw new Error("Missing photo_id or photo_signed_url");
    }

    // 1) Player style (optionnel mais cool)
    const p0 = Date.now();
    const player = await loadPlayerContextByUserId(userId);
    const playerName = player.display_name;
    const character = player.character;

    const tone = character?.ai_style?.tone ?? "neutre";
    const style = character?.ai_style?.style ?? "clair";
    const verbosity = character?.ai_style?.verbosity ?? "normal";

    Log.debug("plants.prefill.style", {
        metadata: {
            ms: msSince(p0),
            player_name: playerName ?? null,
            character_name: character?.name ?? null,
            tone,
            style,
            verbosity,
        },
    });

    // 2) OpenAI request
    const model = "gpt-4.1";
    const provider = "openai";

    const systemText = [
        `Tu es le Maître du Jeu de Renaissance, mais ici tu joues le rôle d'un "Scribe d'Inventaire".`,
        `But: analyser une photo de plante et remplir un brouillon d'inventaire structuré.`,
        `Règles:`,
        `- Ne JAMAIS inventer de détails non visibles. Utilise "inconnu" ou null si nécessaire.`,
        `- Utilise un ton utile et sobre, pas de poésie excessive.`,
        `- title: court (1 à 4 mots).`,
        `- ai_description: 2 à 5 phrases max, factuelles, prudentes ("semble", "on dirait").`,
        character
            ? `Voix: ${character.emoji ?? "🧙"} ${character.name}. Tone=${tone}, style=${style}, verbosity=${verbosity}.`
            : null,
        playerName
            ? `Le joueur s'appelle "${playerName}". N'utilise son nom que si utile (0-1 fois).`
            : null,
        `Tu dois respecter STRICTEMENT le schéma JSON demandé.`,
        `schema_version = "${PLANTS_SCHEMA_VERSION}".`,
        `Champs (data.*.type): "string" | "text" | "enum" | "number" | "boolean" | "date".`,
        `Pour value, mets une string courte si tu n'es pas sûr.`,
    ]
        .filter(Boolean)
        .join("\n");

    const contextJson = {
        photo: {
            id: photoId,
            caption: safeTrim(input.photo_caption ?? "") || null,
        },
        inventory: {
            schema_version: PLANTS_SCHEMA_VERSION,
            kind: "plants",
        },
    };

    const userInputText =
        `Contexte:\n${JSON.stringify(contextJson, null, 2)}\n\n` +
        `Analyse la photo et génère un PlantDraftV1:\n` +
        `- schema_version\n- title\n- ai_description\n- data (name, common_name, species, location, light, watering, health, notes)\n`;

    Log.debug("debug JJ", {
        metadata: {
            schema: OPENAI_PLANT_PREFILL_SCHEMA_V1,
        },
    });
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
                name: "inventory_plants_prefill_v1",
                schema: OPENAI_PLANT_PREFILL_SCHEMA_V1,
            },
        },
    };

    const startedAt = new Date();

    let response: any = null;
    let outputText: string | null = null;
    let parsed: PlantDraftV1 | null = null;
    let parseError: string | null = null;

    try {
        const o0 = Date.now();
        response = await openai.responses.create(requestJson as any);
        Log.success("plants.prefill.openai.response.received", {
            metadata: {
                ms: msSince(o0),
                has_output_text: typeof response?.output_text === "string",
                usage: response?.usage ?? null,
            },
        });

        outputText = typeof response?.output_text === "string" ? response.output_text : null;

        // try {
        //     parsed = outputText ? (JSON.parse(outputText) as PlantDraftV1) : null;
        // } catch (e: any) {
        //     parseError = e?.message ? String(e.message) : "JSON parse error";
        //     parsed = null;
        // }

        // if (!parsed) throw new Error(parseError ?? "Invalid JSON output");

        // // ✅ Normalize AI output (field objects -> raw values) for Option A validator
        // const toValue = (x: any) => (x && typeof x === "object" && "value" in x ? x.value : x);

        // const normalized = {
        //     schema: parsed.schema,
        //     schema_version: parsed.schema_version,
        //     ai_description: parsed.ai_description,
        //     data: {
        //         name: toValue(parsed.data?.name) ?? null,
        //         common_name: toValue(parsed.data?.common_name) ?? null,
        //         species: toValue(parsed.data?.species) ?? null,
        //         location: toValue(parsed.data?.location) ?? null,
        //         light: toValue(parsed.data?.light) ?? null,
        //         watering: toValue(parsed.data?.watering) ?? null,
        //         health: toValue(parsed.data?.health) ?? null,
        //         notes: toValue(parsed.data?.notes) ?? null,
        //     },
        // };

        const parsedRaw = outputText ? JSON.parse(outputText) : null;

        // ✅ Normalisation: accepte B ou A, sort toujours A
        const parsed = coercePlantPrefillToDraftV1(parsedRaw);

        Log.debug("JJ", {
            metadata: {
                parsed,
            },
        });

        const validation = validatePlantDraftV1(parsed);
        if (!validation.ok) {
            throw new Error(`Invalid PlantDraftV1: ${validation.errors?.join(" | ") ?? "unknown"}`);
        }

        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();

        // ✅ ai_generations log (best-effort)
        await Promise.allSettled([
            createAiGenerationLog({
                session_id: (contextJson as any)?.session_id ?? crypto.randomUUID(), // fallback; tu remplaceras quand tu auras session inventaires
                user_id: userId,

                generation_type: "inventory_plants_prefill",
                source: "generatePlantPrefillFromPhoto",

                chapter_quest_id: null,
                chapter_id: null,
                adventure_id: null,

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
                context_json: contextJson as any,

                response_json: response,
                output_text: outputText,
                parsed_json: parsed as any,
                parse_error: parseError,

                rendered_md: null,

                usage_json: response?.usage ?? null,
                tags: ["inventory", "plants", "prefill"],
                metadata: {
                    photo_id: photoId,
                    caption_snippet: safeSnippet(String(input.photo_caption ?? ""), 140) || null,
                    tone,
                    style,
                    verbosity,
                },
            }),
        ]);

        timer.endSuccess("plants.prefill.success", {
            metadata: { total_ms: msSince(startedAtMs) },
        });

        return {
            draft: parsed,
            meta: {
                model,
                provider,
                usage: response?.usage ?? null,
            },
        };
    } catch (e: any) {
        const errorMessage = e?.message ? String(e.message) : "OpenAI request failed";

        Log.error("plants.prefill.error", e, {
            metadata: {
                total_ms: msSince(startedAtMs),
                photo_id: photoId,
                parse_error: parseError,
                output_snippet: outputText ? safeSnippet(outputText, 260) : null,
            },
        });

        timer.endError("plants.prefill.failed", e, { status_code: 500 });

        throw new Error(errorMessage);
    }
}
