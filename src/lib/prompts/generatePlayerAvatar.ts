// src/lib/prompts/generatePlayerAvatar.ts

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

export type PlayerAvatarPhotoRef = {
    photo_id: string;
};

export type GeneratePlayerAvatarInput = {
    user_id: string;
    photos: PlayerAvatarPhotoRef[];
    options: PlayerAvatarOptions;
};

export type GeneratePlayerAvatarResult = {
    systemText: string;
    userText: string;
    context: Record<string, any>;
    schema: Record<string, any>;
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

function clampNotes(notes: string | null | undefined, maxLen = 400): string | null {
    const t = safeTrim(notes);
    if (!t) return null;
    return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function formatLine(label: string, value: string | null) {
    if (!value) return "";
    return `- ${label}: ${value}\n`;
}

function formatToggle(label: string, on: boolean) {
    return `- ${label}: ${on ? "oui" : "non"}\n`;
}

function styleDirectives(options: PlayerAvatarOptions) {
    const faithfulness = options.faithfulness;

    // “faithful” = ressemble le plus possible aux photos
    // “stylized” = plus illustration héroïque, traits un peu amplifiés
    // “balanced” = compromis
    if (faithfulness === "faithful") {
        return [
            "Respecte fidèlement les traits du visage observés sur les photos.",
            "Évite les changements radicaux (âge, morphologie, couleur des yeux/cheveux) sauf si demandé.",
            "Rendu fantasy, mais identité clairement reconnaissable.",
        ];
    }

    if (faithfulness === "stylized") {
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

function outputSchema() {
    // Le worker utilisera ces champs:
    // - prompt_image: prompt final à envoyer à l'API Images
    // - negative_prompt: ce qu’on veut éviter
    // - suggested_size: selon format
    // - alt_text: accessibilité + SEO interne
    // - style_tags: pour classer côté UI
    return {
        name: "player_avatar_prompt_v1",
        strict: true,
        schema: {
            type: "object",
            additionalProperties: false,
            properties: {
                prompt_image: { type: "string", minLength: 50 },
                negative_prompt: { type: "string", minLength: 10 },
                suggested_size: {
                    type: "string",
                    enum: ["1024x1024", "1024x1536"],
                },
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

function suggestedSize(format: PlayerAvatarFormat) {
    return format === "portrait" ? "1024x1536" : "1024x1024";
}

/* ============================================================================
DATA LOADERS
============================================================================ */
// (Aucun loader ici: le worker QStash récupérera les URLs signées et passera les images à l’API)

/* ============================================================================
MAIN
============================================================================ */

export function generatePlayerAvatar(input: GeneratePlayerAvatarInput): GeneratePlayerAvatarResult {
    const user_id = safeTrim(input.user_id);

    const photos = Array.isArray(input.photos) ? input.photos : [];
    const photo_ids = photos
        .map((p) => safeTrim(p?.photo_id))
        .filter((x) => typeof x === "string" && x.length > 0);

    const options: PlayerAvatarOptions = {
        format: input.options?.format ?? "square",
        vibe: input.options?.vibe ?? "knight",
        background: input.options?.background ?? "studio",
        accessory: input.options?.accessory ?? "none",
        faithfulness: input.options?.faithfulness ?? "balanced",
        dramatic_light: safeBool(input.options?.dramatic_light),
        battle_scars: safeBool(input.options?.battle_scars),
        glow_eyes: safeBool(input.options?.glow_eyes),
        notes: clampNotes(input.options?.notes),
    };

    const schema = outputSchema();

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

    const toggles = [
        formatToggle("Lumière dramatique", !!options.dramatic_light),
        formatToggle("Cicatrices de bataille", !!options.battle_scars),
        formatToggle("Yeux lumineux", !!options.glow_eyes),
    ].join("");

    const notesLine = options.notes
        ? `\nNotes utilisateur (à intégrer subtilement): ${options.notes}\n`
        : "";

    const userText = [
        "Construis un prompt image final (prompt_image) pour un avatar fantasy épique.",
        "Tu dois inclure: cadrage portrait, description du visage, tenue, ambiance, lumière, détails matériels, qualité.",
        "Tu dois aussi produire: un negative_prompt, une taille suggérée, un alt_text, et des style_tags.",
        "",
        "Paramètres choisis:",
        formatLine("Format", options.format),
        formatLine("Vibe", options.vibe),
        formatLine("Background", options.background),
        formatLine("Accessoire", options.accessory),
        formatLine("Fidélité", options.faithfulness),
        toggles,
        notesLine,
        "Directives artistiques:",
        directives.map((x) => `- ${x}`).join("\n"),
        "",
        "Important: les photos de référence seront fournies à l'outil de génération par le système. Ne décris pas des détails incertains (couleur exacte des yeux, cicatrices réelles) si elles ne sont pas demandées.",
    ].join("\n");

    const context = {
        kind: "player_avatar",
        user_id,
        photos: {
            count: photo_ids.length,
            photo_ids,
        },
        options,
        output: {
            suggested_size: suggestedSize(options.format),
            schema_name: schema?.name ?? "player_avatar_prompt_v1",
        },
        meta: {
            version: "v1",
            generated_at: new Date().toISOString(),
        },
    };

    return {
        systemText,
        userText,
        context,
        schema,
    };
}
