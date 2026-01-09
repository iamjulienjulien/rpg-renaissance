// src/lib/prompts/generatePlayerAvatar.ts
import crypto from "crypto";
import { openai } from "@/lib/openai";
import { toFile } from "openai/uploads";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createAiGenerationLog } from "@/lib/logs/createAiGenerationLog";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";

import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
TYPES
============================================================================ */

export type PlayerAvatarFormat = "square" | "portrait";
export type PlayerAvatarVibe = "knight" | "ranger" | "mage" | "dark";
export type PlayerAvatarBackground = "studio" | "forest" | "castle" | "battlefield";
export type PlayerAvatarAccessory = "none" | "hood" | "helm" | "crown" | "pauldron";
export type PlayerAvatarFaithfulness = "faithful" | "balanced" | "stylized";

export type PlayerAvatarOptions = {
    format: PlayerAvatarFormat;
    vibe: PlayerAvatarVibe;
    background: PlayerAvatarBackground;
    accessory: PlayerAvatarAccessory;
    faithfulness: PlayerAvatarFaithfulness;

    dramatic_light?: boolean;
    battle_scars?: boolean;
    glow_eyes?: boolean;

    notes?: string | null;
};

export type GeneratePlayerAvatarArgs = {
    user_id: string;
    photo_ids: string[];
    options?: Partial<PlayerAvatarOptions> | null;
    force?: boolean;
    ai_job_id?: string | null;
};

export type GeneratePlayerAvatarOutput = {
    user_id: string;
    model: string;
    cached: boolean;

    avatar_photo_id: string;
    storage_bucket: string;
    storage_path: string;
    avatar_url: string | null;

    prompt_image: string;
    negative_prompt: string;
    suggested_size: "1024x1024" | "1024x1536";
    alt_text: string;
    style_tags: string[];
};

/* ============================================================================
HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function safeBool(x: unknown): boolean {
    return x === true;
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function clampNotes(notes: string | null | undefined, maxLen = 400): string | null {
    const t = safeTrim(notes);
    if (!t) return null;
    return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function suggestedSize(format: PlayerAvatarFormat) {
    return format === "portrait" ? "1024x1536" : "1024x1024";
}

function styleDirectives(options: PlayerAvatarOptions) {
    if (options.faithfulness === "faithful") {
        return [
            "Respecte fidèlement les traits du visage observés sur les photos.",
            "Évite les changements radicaux (âge, morphologie, couleur des yeux/cheveux) sauf si demandé.",
            "Rendu fantasy, mais identité clairement reconnaissable.",
        ];
    }

    if (options.faithfulness === "stylized") {
        return [
            "Conserve l'identité générale, mais autorise une stylisation marquée (illustration héroïque).",
            "Traits légèrement amplifiés (caractère, aura, posture), sans dénaturer.",
            "Priorise le rendu épique et la cohérence artistique.",
        ];
    }

    return [
        "Conserve une forte ressemblance, avec une stylisation légère.",
        "Rendu épique, mais visage cohérent et reconnaissable.",
        "Équilibre réalisme et illustration.",
    ];
}

function vibeDirectives(vibe: PlayerAvatarVibe) {
    if (vibe === "knight") {
        return [
            "Archétype: chevalier fantasy noble et solide.",
            "Tenue: armure légère ou cuir renforcé, cape éventuelle.",
            "Attitude: stoïque, protecteur, déterminé.",
        ];
    }

    if (vibe === "ranger") {
        return [
            "Archétype: rôdeur, pisteur, aventurier des bois.",
            "Tenue: cuir, tissus pratiques, cape/écharpe, détails utilitaires.",
            "Attitude: alerte, agile, regard perçant.",
        ];
    }

    if (vibe === "mage") {
        return [
            "Archétype: mage, érudit, mystique.",
            "Tenue: robes fantasy, détails runiques subtils, talisman éventuel.",
            "Attitude: calme, intense, aura mystérieuse.",
        ];
    }

    return [
        "Archétype: dark fantasy, anti-héros ou chevalier noir.",
        "Tenue: cuir sombre/armure, textures usées, élégance menaçante.",
        "Attitude: froide, résolue, dramatique.",
    ];
}

function backgroundDirectives(bg: PlayerAvatarBackground) {
    if (bg === "forest") return "Fond: forêt brumeuse, feuillage, atmosphère naturelle.";
    if (bg === "castle") return "Fond: château, pierre, bannières, ambiance médiévale.";
    if (bg === "battlefield") return "Fond: champ de bataille, fumée légère, dramatisme.";
    return "Fond: studio fantasy neutre, lumière maîtrisée, focus sur le visage.";
}

function accessoryDirectives(a: PlayerAvatarAccessory) {
    if (a === "hood") return "Accessoire: capuche (hood) élégante.";
    if (a === "helm") return "Accessoire: casque (helm) partiel ou relevé, visage visible.";
    if (a === "crown") return "Accessoire: couronne (crown) discrète, noble.";
    if (a === "pauldron") return "Accessoire: épaulière (pauldron) détaillée.";
    return "Accessoire: aucun (none).";
}

function outputSchemaPack() {
    return {
        name: "player_avatar_prompt_v1",
        strict: true,
        schema: {
            type: "object",
            additionalProperties: false,
            properties: {
                prompt_image: { type: "string", minLength: 50 },
                negative_prompt: { type: "string", minLength: 10 },
                suggested_size: { type: "string", enum: ["1024x1024", "1024x1536"] },
                alt_text: { type: "string", minLength: 20 },
                style_tags: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 12,
                },
            },
            required: [
                "prompt_image",
                "negative_prompt",
                "suggested_size",
                "alt_text",
                "style_tags",
            ],
        },
    };
}

function buildPrompt(options: PlayerAvatarOptions) {
    const schemaPack = outputSchemaPack();

    const systemText = [
        "Tu es un directeur artistique expert en illustration fantasy épique, spécialisé en portraits réalistes stylisés.",
        "Objectif: produire un prompt image de très haute qualité pour générer un avatar de joueur à partir de photos de référence.",
        "",
        "Contraintes non négociables:",
        "- Le visage doit rester cohérent et reconnaissable (selon le niveau de 'faithfulness').",
        "- Pas de nudité, pas de sexualisation, pas de gore explicite, pas de symboles haineux.",
        "- Ne pas inventer de texte lisible (bannières, logos). Si du texte apparaît, il doit être illisible.",
        "- Évite les artefacts: yeux asymétriques, mains difformes, dents bizarres, bijoux fusionnés.",
        "",
        "Tu dois rendre un JSON strict conforme au schéma fourni, sans texte autour.",
    ].join("\n");

    const directives = [
        ...styleDirectives(options),
        ...vibeDirectives(options.vibe),
        backgroundDirectives(options.background),
        accessoryDirectives(options.accessory),
    ];

    const notesLine = options.notes ? `Notes utilisateur: ${options.notes}\n` : "";

    const userText = [
        "Construis un prompt image final (prompt_image) pour un avatar fantasy épique.",
        "Tu dois inclure: cadrage, description du visage, tenue, ambiance, lumière, détails matériels, qualité.",
        "Tu dois aussi produire: un negative_prompt, une taille suggérée, un alt_text, et des style_tags.",
        "",
        `Format: ${options.format}`,
        `Vibe: ${options.vibe}`,
        `Background: ${options.background}`,
        `Accessoire: ${options.accessory}`,
        `Fidélité: ${options.faithfulness}`,
        `Lumière dramatique: ${options.dramatic_light ? "oui" : "non"}`,
        `Cicatrices: ${options.battle_scars ? "oui" : "non"}`,
        `Regard magique: ${options.glow_eyes ? "oui" : "non"}`,
        notesLine,
        "Directives artistiques:",
        directives.map((x) => `- ${x}`).join("\n"),
        "",
        "Important: les photos de référence seront fournies à l'outil de génération par le système.",
        "Ne décris pas des détails incertains (couleur exacte des yeux, cicatrices réelles) si elles ne sont pas demandées.",
    ].join("\n");

    return { systemText, userText, schemaPack };
}

async function safeJsonParse(text: string) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

// helper local dans le fichier
async function fetchArrayBufferWithTimeout(url: string, timeoutMs = 20_000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const r = await fetch(url, { signal: controller.signal, cache: "no-store" });

        const contentType = r.headers.get("content-type") || null;
        const contentLength = r.headers.get("content-length");
        const length = contentLength ? Number(contentLength) : null;

        Log.debug("player_avatar.refs.fetch.response", {
            metadata: {
                ok: r.ok,
                status: r.status,
                content_type: contentType,
                content_length: length,
            },
        });

        if (!r.ok) {
            throw new Error(`fetch failed: ${r.status}`);
        }

        // Optionnel: limite taille (ex: 12 MB)
        if (length && length > 12 * 1024 * 1024) {
            throw new Error(`image too large: ${length} bytes`);
        }

        const ab = await r.arrayBuffer();

        Log.debug("player_avatar.refs.fetch.body_ok", {
            metadata: { bytes: ab.byteLength },
        });

        return { ab, contentType };
    } finally {
        clearTimeout(t);
    }
}

/* ============================================================================
MAIN
============================================================================ */

export async function generatePlayerAvatar(
    args: GeneratePlayerAvatarArgs
): Promise<GeneratePlayerAvatarOutput> {
    const request_id = crypto.randomUUID();
    const startedAtMs = Date.now();
    const route = "lib/prompts/generatePlayerAvatar";
    const method = "RUN";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAtMs },
        async () => {
            const t = Log.timer("generatePlayerAvatar", {
                source: "src/lib/prompts/generatePlayerAvatar.ts",
            });

            const user_id = safeTrim(args?.user_id);
            const force = !!args?.force;
            const ai_job_id = safeTrim(args?.ai_job_id ?? "") || null;

            const photo_ids = Array.isArray(args?.photo_ids)
                ? args.photo_ids.map((x) => safeTrim(x)).filter((x) => x.length > 0)
                : [];

            const options: PlayerAvatarOptions = {
                format: (args?.options?.format as any) ?? "square",
                vibe: (args?.options?.vibe as any) ?? "knight",
                background: (args?.options?.background as any) ?? "studio",
                accessory: (args?.options?.accessory as any) ?? "none",
                faithfulness: (args?.options?.faithfulness as any) ?? "balanced",
                dramatic_light: safeBool(args?.options?.dramatic_light),
                battle_scars: safeBool(args?.options?.battle_scars),
                glow_eyes: safeBool(args?.options?.glow_eyes),
                notes: clampNotes((args?.options as any)?.notes ?? null),
            };

            const plannedSize = suggestedSize(options.format);

            try {
                Log.info("player_avatar.start", {
                    metadata: {
                        user_id,
                        photo_ids_count: photo_ids.length,
                        force,
                        ai_job_id,
                        options,
                    },
                });

                if (!user_id) {
                    Log.warning("player_avatar.missing.user_id", { status_code: 400 });
                    t.endError("player_avatar.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing user_id");
                }

                if (photo_ids.length === 0) {
                    Log.warning("player_avatar.missing.photo_ids", { status_code: 400 });
                    t.endError("player_avatar.bad_request", undefined, { status_code: 400 });
                    throw new Error("Missing photo_ids");
                }

                patchRequestContext({
                    user_id,
                    ai_job_id: ai_job_id ?? undefined,
                    photo_ids_count: photo_ids.length,
                } as any);

                const supabase = await supabaseAdmin();

                /* ------------------------------------------------------------
             0) Charger session_id (best-effort) depuis user_profiles
            ------------------------------------------------------------ */
                const sess0 = Date.now();
                let session_id: string | null = null;

                try {
                    const { data: profile, error: profileErr } = await supabase
                        .from("game_sessions")
                        .select("id, user_id")
                        .eq("user_id", user_id)
                        .eq("is_active", "TRUE")
                        .maybeSingle();

                    if (profileErr) {
                        Log.warning("player_avatar.user_profiles.select_failed", {
                            status_code: 200,
                            metadata: { ms: msSince(sess0), error: profileErr.message },
                        });
                    } else {
                        session_id = (profile as any)?.id ?? null;
                    }
                } catch {}

                patchRequestContext({ session_id: session_id ?? undefined } as any);

                Log.debug("player_avatar.session.ok", {
                    metadata: { ms: msSince(sess0), session_id: session_id ?? null },
                });

                /* ------------------------------------------------------------
             1) Load source photos
            ------------------------------------------------------------ */
                const p0 = Date.now();
                const { data: photos, error: photosErr } = await supabase
                    .from("player_photos")
                    .select(
                        "id, user_id, bucket, storage_path, mime_type, width, height, kind, created_at"
                    )
                    .in("id", photo_ids)
                    .eq("user_id", user_id);

                if (photosErr) {
                    Log.error("player_avatar.photos.select_failed", photosErr, {
                        status_code: 500,
                        metadata: { ms: msSince(p0), user_id, photo_ids_count: photo_ids.length },
                    });
                    t.endError("player_avatar.photos_select_failed", photosErr, {
                        status_code: 500,
                    });
                    throw new Error(photosErr.message);
                }

                const sourcePhotos = (photos ?? []).filter(
                    (p: any) => p?.kind === "portrait_source"
                );
                if (!sourcePhotos.length) {
                    Log.warning("player_avatar.photos.not_found", {
                        status_code: 404,
                        metadata: { ms: msSince(p0), user_id, photo_ids },
                    });
                    t.endError("player_avatar.photos_not_found", undefined, { status_code: 404 });
                    throw new Error("Source photos not found");
                }

                Log.success("player_avatar.photos.loaded", {
                    status_code: 200,
                    metadata: {
                        ms: msSince(p0),
                        count: sourcePhotos.length,
                        buckets:
                            Array.from(new Set(sourcePhotos.map((p: any) => p.bucket))).join(",") ||
                            null,
                    },
                });

                /* ------------------------------------------------------------
             2) Signed URLs
            ------------------------------------------------------------ */
                const s0 = Date.now();
                const signedUrls: string[] = [];

                for (const p of sourcePhotos) {
                    const bucket = (p as any)?.bucket || "player-photos";
                    const path = (p as any)?.storage_path;

                    if (!path) continue;

                    const { data: signedData, error: signedErr } = await supabase.storage
                        .from(bucket)
                        .createSignedUrl(path, 60 * 10);

                    if (signedErr) {
                        Log.error("player_avatar.photos.sign_failed", signedErr, {
                            status_code: 500,
                            metadata: { user_id, photo_id: p.id, bucket, path },
                        });
                        throw new Error(signedErr.message);
                    }

                    if (signedData?.signedUrl) signedUrls.push(signedData.signedUrl);
                }

                if (!signedUrls.length) {
                    Log.warning("player_avatar.photos.no_signed_urls", {
                        status_code: 400,
                        metadata: { ms: msSince(s0), user_id, source_count: sourcePhotos.length },
                    });
                    throw new Error("Unable to build signed URLs for source photos");
                }

                Log.success("player_avatar.photos.signed", {
                    status_code: 200,
                    metadata: { ms: msSince(s0), count: signedUrls.length },
                });

                /* ------------------------------------------------------------
             3) OpenAI structured prompt builder
            ------------------------------------------------------------ */
                const o0 = Date.now();
                const startedAt = new Date();

                const { systemText, userText, schemaPack } = buildPrompt(options);

                if (!schemaPack?.schema || schemaPack.schema.type !== "object") {
                    Log.error("player_avatar.schema.invalid", new Error("Invalid JSON schema"), {
                        status_code: 500,
                        metadata: { schema_type: (schemaPack as any)?.schema?.type ?? null },
                    });
                    throw new Error("Invalid schemaPack.schema");
                }

                const model = "gpt-4o-mini";

                const requestPayload: any = {
                    model,
                    input: [
                        { role: "system", content: [{ type: "input_text", text: systemText }] },
                        { role: "user", content: [{ type: "input_text", text: userText }] },
                    ],
                    text: {
                        format: {
                            type: "json_schema",
                            name: schemaPack.name ?? "player_avatar_prompt_v1",
                            strict: schemaPack.strict ?? true,
                            schema: schemaPack.schema,
                        },
                    },
                };

                let response: any = null;
                let jsonOut: any = null;

                try {
                    response = await openai.responses.create(requestPayload);
                    jsonOut = await safeJsonParse(response.output_text);
                } catch (err: any) {
                    Log.error("player_avatar.openai.prompt.error", err, {
                        status_code: 500,
                        metadata: { ms: msSince(o0), model },
                    });

                    try {
                        await createAiGenerationLog({
                            session_id,
                            user_id,
                            generation_type: "player_avatar_prompt",
                            source: "generatePlayerAvatar",
                            provider: "openai",
                            model,
                            status: "error",
                            started_at: startedAt,
                            finished_at: new Date(),
                            duration_ms: msSince(o0),
                            request_json: requestPayload,
                            system_text: systemText,
                            user_input_text: userText,
                            response_json: null,
                            output_text: null,
                            parsed_json: null,
                            parse_error: err?.message ? String(err.message) : "openai_error",
                            rendered_md: null,
                            error_message: err?.message ? String(err.message) : "Unknown error",
                            metadata: { ai_job_id, options, planned_size: plannedSize },
                        } as any);
                    } catch {}

                    t.endError("player_avatar.openai_prompt_failed", err, { status_code: 500 });
                    throw err;
                }

                if (!jsonOut) {
                    const err = new Error("Failed to parse JSON output_text");
                    Log.error("player_avatar.openai.prompt.parse_failed", err, {
                        status_code: 500,
                        metadata: {
                            output_text_preview: String(response?.output_text ?? "").slice(0, 200),
                        },
                    });

                    try {
                        await createAiGenerationLog({
                            session_id,
                            user_id,
                            generation_type: "player_avatar_prompt",
                            source: "generatePlayerAvatar",
                            provider: "openai",
                            model,
                            status: "error",
                            started_at: startedAt,
                            finished_at: new Date(),
                            duration_ms: msSince(o0),
                            request_json: requestPayload,
                            system_text: systemText,
                            user_input_text: userText,
                            response_json: response,
                            output_text: response?.output_text ?? null,
                            parsed_json: null,
                            parse_error: "JSON.parse failed",
                            rendered_md: null,
                            error_message: "JSON.parse failed",
                            metadata: { ai_job_id, options, planned_size: plannedSize },
                        } as any);
                    } catch {}

                    throw err;
                }

                const prompt_image = safeTrim(jsonOut?.prompt_image);
                const negative_prompt = safeTrim(jsonOut?.negative_prompt);
                const suggested_size = (safeTrim(jsonOut?.suggested_size) as any) || plannedSize;
                const alt_text = safeTrim(jsonOut?.alt_text);
                const style_tags = Array.isArray(jsonOut?.style_tags)
                    ? jsonOut.style_tags
                          .map((x: any) => safeTrim(x))
                          .filter((x: string) => x.length > 0)
                    : [];

                if (
                    !prompt_image ||
                    !negative_prompt ||
                    !suggested_size ||
                    !alt_text ||
                    style_tags.length < 3
                ) {
                    Log.warning("player_avatar.openai.prompt.invalid_output", {
                        status_code: 500,
                        metadata: {
                            has_prompt_image: !!prompt_image,
                            has_negative_prompt: !!negative_prompt,
                            suggested_size,
                            has_alt_text: !!alt_text,
                            style_tags_count: style_tags.length,
                        },
                    });
                    throw new Error("Structured output missing required fields");
                }

                Log.success("player_avatar.openai.prompt.ok", {
                    status_code: 200,
                    metadata: {
                        ms: msSince(o0),
                        model,
                        suggested_size,
                        style_tags_count: style_tags.length,
                    },
                });

                Log.debug("jj.debug1", {
                    metadata: {
                        message: "ok",
                    },
                });

                /* ------------------------------------------------------------
             4) Download refs into buffers
            ------------------------------------------------------------ */
                const d0 = Date.now();
                const refImages: Array<{ name: string; mime: string; data: Buffer }> = [];

                Log.debug("jj.debug2", {
                    metadata: {
                        message: "ok",
                        signedUrls,
                    },
                });

                for (let i = 0; i < signedUrls.length; i++) {
                    const url = signedUrls[i];

                    Log.debug("player_avatar.refs.fetch.start", {
                        metadata: { index: i },
                    });

                    let ab: ArrayBuffer;
                    let contentType: string | null;

                    try {
                        const out = await fetchArrayBufferWithTimeout(url, 25_000);
                        ab = out.ab;
                        contentType = out.contentType;
                    } catch (e: any) {
                        Log.error("player_avatar.refs.fetch.error", e, {
                            status_code: 502,
                            metadata: { index: i, message: e?.message ?? null },
                        });
                        throw e;
                    }

                    const mime = contentType || "image/jpeg";

                    refImages.push({
                        name: `ref_${i}.jpg`,
                        mime,
                        data: Buffer.from(ab),
                    });
                }

                Log.debug("jj.debug4", {
                    metadata: {
                        message: "ok",
                        signedUrls,
                    },
                });

                Log.success("player_avatar.refs.loaded", {
                    status_code: 200,
                    metadata: { ms: msSince(d0), count: refImages.length },
                });

                /* ------------------------------------------------------------
             5) Generate image (gpt-image-1)
            ------------------------------------------------------------ */
                const i0 = Date.now();

                let imgRes: any = null;
                try {
                    const imageFiles = await Promise.all(
                        refImages.map((im) =>
                            toFile(im.data, im.name, { type: im.mime || "image/jpeg" })
                        )
                    );

                    imgRes = await openai.images.edit({
                        model: "gpt-image-1",
                        prompt: `${prompt_image}\n\nÉvite absolument:\n${negative_prompt}`,
                        size: suggested_size,
                        image: imageFiles, // ✅ tableau de File
                    } as any);
                } catch (err: any) {
                    Log.error("player_avatar.openai.image.error", err, {
                        status_code: 500,
                        metadata: { ms: msSince(i0), suggested_size },
                    });

                    try {
                        await createAiGenerationLog({
                            session_id,
                            user_id,
                            generation_type: "player_avatar_image",
                            source: "generatePlayerAvatar",
                            provider: "openai",
                            model: "gpt-image-1",
                            status: "error",
                            started_at: startedAt,
                            finished_at: new Date(),
                            duration_ms: msSince(i0),
                            request_json: {
                                prompt_image,
                                negative_prompt,
                                suggested_size,
                                refs: refImages.length,
                                options,
                            },
                            response_json: null,
                            output_text: null,
                            parsed_json: jsonOut,
                            parse_error: null,
                            rendered_md: null,
                            error_message: err?.message
                                ? String(err.message)
                                : "Image generation failed",
                            metadata: { ai_job_id },
                        } as any);
                    } catch {}

                    throw err;
                }

                const b64 =
                    (imgRes as any)?.data?.[0]?.b64_json ?? (imgRes as any)?.data?.[0]?.b64 ?? null;

                if (!b64) {
                    Log.warning("player_avatar.openai.image.no_output", {
                        status_code: 500,
                        metadata: { ms: msSince(i0) },
                    });
                    throw new Error("No image generated");
                }

                const imageBuffer = Buffer.from(b64, "base64");

                Log.success("player_avatar.openai.image.ok", {
                    status_code: 200,
                    metadata: { ms: msSince(i0), bytes: imageBuffer.byteLength, suggested_size },
                });

                /* ------------------------------------------------------------
             6) Upload to storage (bucket player-photos)
            ------------------------------------------------------------ */
                const up0 = Date.now();
                const bucket = "player-photos";

                const avatar_photo_id = crypto.randomUUID();
                const ext = "png";
                const storage_path = `${user_id}/avatars/${avatar_photo_id}.${ext}`;

                const { error: upErr } = await supabase.storage
                    .from(bucket)
                    .upload(storage_path, imageBuffer, {
                        contentType: "image/png",
                        upsert: true,
                    });

                if (upErr) {
                    Log.error("player_avatar.storage.upload_failed", upErr, {
                        status_code: 500,
                        metadata: { ms: msSince(up0), bucket, storage_path },
                    });
                    throw new Error(upErr.message);
                }

                Log.success("player_avatar.storage.uploaded", {
                    status_code: 200,
                    metadata: { ms: msSince(up0), bucket, storage_path },
                });

                /* ------------------------------------------------------------
             7) DB: deactivate previous + insert new avatar row
            ------------------------------------------------------------ */
                const db0 = Date.now();

                // deactivate previous active avatars (best effort)
                const { error: deactErr } = await supabase
                    .from("player_photos")
                    .update({ is_active: false })
                    .eq("user_id", user_id)
                    .eq("kind", "avatar_generated")
                    .eq("is_active", true);

                if (deactErr) {
                    Log.warning("player_avatar.db.deactivate_failed", {
                        status_code: 200,
                        metadata: { ms: msSince(db0), error: deactErr.message },
                    });
                } else {
                    Log.debug("player_avatar.db.deactivated_previous", {
                        metadata: { ms: msSince(db0) },
                    });
                }

                const { data: inserted, error: insErr } = await supabase
                    .from("player_photos")
                    .insert({
                        id: avatar_photo_id,
                        user_id,
                        kind: "avatar_generated",
                        bucket,
                        storage_path,
                        mime_type: "image/png",
                        is_active: true,
                        avatar_style: "fantasy_epic",
                        avatar_variant: options.vibe,
                        avatar_format: options.format,
                        ai_job_id,
                        ai_model: model,
                        prompt_json: {
                            prompt_image,
                            negative_prompt,
                            suggested_size,
                            style_tags,
                        },
                        options_json: options,
                        source_photo_ids: sourcePhotos.map((p: any) => p.id),
                        alt_text,
                        caption: null,
                    })
                    .select("id, user_id, bucket, storage_path, created_at")
                    .single();

                if (insErr) {
                    Log.error("player_avatar.db.insert_failed", insErr, {
                        status_code: 500,
                        metadata: { ms: msSince(db0), user_id, storage_path },
                    });
                    throw new Error(insErr.message);
                }

                Log.success("player_avatar.db.inserted", {
                    status_code: 200,
                    metadata: { ms: msSince(db0), avatar_photo_id: inserted?.id, storage_path },
                });

                /* ------------------------------------------------------------
             8) avatar_url + update user_profiles.avatar_url (best-effort)
            ------------------------------------------------------------ */
                let avatar_url: string | null = null;

                try {
                    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storage_path);
                    avatar_url = (pub as any)?.publicUrl ?? null;
                } catch {}

                const prof0 = Date.now();
                if (avatar_url) {
                    const { error: profErr } = await supabase
                        .from("user_profiles")
                        .update({ avatar_url })
                        .eq("user_id", user_id);

                    if (profErr) {
                        Log.warning("player_avatar.user_profiles.update_failed", {
                            status_code: 200,
                            metadata: { ms: msSince(prof0), error: profErr.message },
                        });
                    } else {
                        Log.success("player_avatar.user_profiles.updated", {
                            status_code: 200,
                            metadata: { ms: msSince(prof0) },
                        });
                    }
                }

                /* ------------------------------------------------------------
             9) AiGenerationLog + JournalEntry (best-effort)
            ------------------------------------------------------------ */
                const finishedAt = new Date();
                const totalMs = msSince(startedAtMs);

                try {
                    await createAiGenerationLog({
                        session_id,
                        user_id,
                        generation_type: "player_avatar",
                        source: "generatePlayerAvatar",
                        provider: "openai",
                        model,
                        status: "success",
                        started_at: startedAt,
                        finished_at: finishedAt,
                        duration_ms: totalMs,
                        request_json: {
                            model,
                            options,
                            photo_ids,
                            signed_urls_count: signedUrls.length,
                            suggested_size,
                        },
                        system_text: systemText,
                        user_input_text: userText,
                        context_json: {
                            options,
                            photo_ids,
                            source_photo_ids: sourcePhotos.map((p: any) => p.id),
                        },
                        response_json: response ?? null,
                        output_text: response?.output_text ?? null,
                        parsed_json: jsonOut,
                        parse_error: null,
                        rendered_md: null,
                        usage_json: (response as any)?.usage ?? null,
                        metadata: {
                            ai_job_id,
                            avatar_photo_id,
                            bucket,
                            storage_path,
                            avatar_url,
                        },
                    } as any);
                } catch {}

                try {
                    if (session_id) {
                        await createJournalEntry({
                            session_id,
                            kind: "note",
                            title: "🧙 Avatar généré",
                            content:
                                `Un nouvel avatar a été forgé.\n` +
                                `- Vibe: ${options.vibe}\n` +
                                `- Format: ${options.format}\n` +
                                `- Taille: ${suggested_size}\n` +
                                `- Photos: ${sourcePhotos.length}\n`,
                            chapter_id: null,
                            quest_id: null,
                            adventure_id: null,
                            adventure_quest_id: null,
                        } as any);
                    }
                } catch {}

                Log.success("player_avatar.done", {
                    status_code: 200,
                    metadata: {
                        ms_total: totalMs,
                        model,
                        suggested_size,
                        avatar_photo_id,
                        storage_path,
                        avatar_url,
                    },
                });

                t.endSuccess("player_avatar.success", { status_code: 200 });

                return {
                    user_id,
                    model,
                    cached: false,
                    avatar_photo_id,
                    storage_bucket: bucket,
                    storage_path,
                    avatar_url,
                    prompt_image,
                    negative_prompt,
                    suggested_size,
                    alt_text,
                    style_tags,
                };
            } catch (e: any) {
                Log.error("player_avatar.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAtMs) },
                });
                t.endError("player_avatar.fatal", e, { status_code: 500 });
                throw e;
            }
        }
    );
}
