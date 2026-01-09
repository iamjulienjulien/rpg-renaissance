// src/lib/avatar/avatarOptionsHelpers.ts
// Single source of truth = AVATAR_OPTIONS (content).
// This file contains only:
// - accessors (groups/options)
// - normalization (validate + defaults)
// - prompt FRAGMENTS getters (per option), NOT full prompt assembly
//
// Usable client + server.

import { AVATAR_OPTIONS } from "@/content/avatarOptions";

/* ============================================================================
TYPES (minimal, derived from AVATAR_OPTIONS keys)
============================================================================ */

export type AvatarOptionsKey =
    | "format"
    | "vibe"
    | "background"
    | "accessory"
    | "faithfulness"
    | "dramatic_light"
    | "battle_scars"
    | "glow_eyes"
    | "notes";

export type AvatarGroupType = "enum" | "boolean" | "string";

export type AvatarOptionItem = {
    slug: string;
    label: string;
    emoji?: string;
    description?: string;
    prompt?: string | null; // prompt fragment
};

export type AvatarGroup = {
    key: AvatarOptionsKey;
    label: string;
    emoji?: string;
    type: AvatarGroupType;
    options: AvatarOptionItem[];
};

export type AvatarOptionsSpec = {
    version: string;
    generated_from?: string;
    groups: AvatarGroup[];
};

// What the API/job/generator actually consumes
export type PlayerAvatarOptions = {
    format: string;
    vibe: string;
    background: string;
    accessory: string;
    faithfulness: string;

    dramatic_light?: boolean;
    battle_scars?: boolean;
    glow_eyes?: boolean;

    notes?: string | null;
};

// Small: prompt fragments resolved from AVATAR_OPTIONS
export type AvatarPromptFragments = {
    format: string; // "Format: square"
    vibe: string; // archetype block
    background: string;
    accessory: string;
    faithfulness: string;
    dramatic_light: string; // only if enabled
    battle_scars: string; // only if enabled
    glow_eyes: string; // only if enabled
    notes: string; // expanded with <notes> if provided
    // Convenience aggregation, but still fragments only (no system/user wrapper)
    directives: string[]; // split on \n, trimmed, non-empty
};

/* ============================================================================
INTERNAL SAFE HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function safeBool(x: unknown): boolean {
    return x === true;
}

function clampNotes(notes: unknown, maxLen = 400): string | null {
    const t = safeTrim(notes);
    if (!t) return null;
    return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function asSpec(): AvatarOptionsSpec {
    return AVATAR_OPTIONS as any;
}

function findGroup(key: AvatarOptionsKey): AvatarGroup | null {
    const spec = asSpec();
    const g = Array.isArray(spec?.groups) ? spec.groups.find((x: any) => x?.key === key) : null;
    return (g as any) ?? null;
}

function findOption(key: AvatarOptionsKey, slug: string): AvatarOptionItem | null {
    const g = findGroup(key);
    const opts = Array.isArray(g?.options) ? g!.options : [];
    return (opts.find((o: any) => o?.slug === slug) as any) ?? null;
}

function firstEnumSlug(key: AvatarOptionsKey): string | null {
    const g = findGroup(key);
    if (!g || g.type !== "enum") return null;
    const o0 = Array.isArray(g.options) ? g.options[0] : null;
    const slug = safeTrim(o0?.slug);
    return slug || null;
}

function isAllowedEnumSlug(key: AvatarOptionsKey, slug: unknown): slug is string {
    const s = safeTrim(slug);
    if (!s) return false;
    return !!findOption(key, s);
}

function promptOrEmpty(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function expandNotesPrompt(template: string, notes: string | null): string {
    if (!template) return "";
    if (!notes) return "";
    return template.replace("<notes>", notes);
}

/* ============================================================================
PUBLIC: READ SPEC FOR UI
============================================================================ */

export function getAvatarOptionsSpec(): AvatarOptionsSpec {
    return asSpec();
}

export function getAvatarGroups(): AvatarGroup[] {
    const spec = asSpec();
    return Array.isArray(spec?.groups) ? spec.groups : [];
}

export function getAvatarGroup(key: AvatarOptionsKey): AvatarGroup | null {
    return findGroup(key);
}

export function getAvatarGroupOptions(key: AvatarOptionsKey): AvatarOptionItem[] {
    const g = findGroup(key);
    return g?.options ?? [];
}

/* ============================================================================
PUBLIC: NORMALIZE (replaces static allowed lists everywhere)
============================================================================ */

export function getAvatarDefaults(): PlayerAvatarOptions {
    return {
        format: firstEnumSlug("format") ?? "square",
        vibe: firstEnumSlug("vibe") ?? "knight",
        background: firstEnumSlug("background") ?? "studio",
        accessory: firstEnumSlug("accessory") ?? "none",
        faithfulness: firstEnumSlug("faithfulness") ?? "balanced",

        dramatic_light: false,
        battle_scars: false,
        glow_eyes: false,
        notes: null,
    };
}

export function normalizeAvatarOptions(input?: any): PlayerAvatarOptions {
    const d = getAvatarDefaults();
    const opt = input ?? {};

    return {
        format: isAllowedEnumSlug("format", opt?.format) ? safeTrim(opt.format) : d.format,
        vibe: isAllowedEnumSlug("vibe", opt?.vibe) ? safeTrim(opt.vibe) : d.vibe,
        background: isAllowedEnumSlug("background", opt?.background)
            ? safeTrim(opt.background)
            : d.background,
        accessory: isAllowedEnumSlug("accessory", opt?.accessory)
            ? safeTrim(opt.accessory)
            : d.accessory,
        faithfulness: isAllowedEnumSlug("faithfulness", opt?.faithfulness)
            ? safeTrim(opt.faithfulness)
            : d.faithfulness,

        dramatic_light: safeBool(opt?.dramatic_light),
        battle_scars: safeBool(opt?.battle_scars),
        glow_eyes: safeBool(opt?.glow_eyes),

        notes: clampNotes(opt?.notes),
    };
}

/* ============================================================================
PUBLIC: PROMPT FRAGMENTS (NO final prompt assembly here)
============================================================================ */

export function getAvatarPromptFragment(key: AvatarOptionsKey, slug: string): string {
    return promptOrEmpty(findOption(key, slug)?.prompt);
}

export function getAvatarPromptFragments(normalized: PlayerAvatarOptions): AvatarPromptFragments {
    const format = promptOrEmpty(findOption("format", normalized.format)?.prompt);
    const vibe = promptOrEmpty(findOption("vibe", normalized.vibe)?.prompt);
    const background = promptOrEmpty(findOption("background", normalized.background)?.prompt);
    const accessory = promptOrEmpty(findOption("accessory", normalized.accessory)?.prompt);
    const faithfulness = promptOrEmpty(findOption("faithfulness", normalized.faithfulness)?.prompt);

    const dramatic_light =
        normalized.dramatic_light === true
            ? promptOrEmpty(findOption("dramatic_light", "dramatic_light")?.prompt)
            : "";

    const battle_scars =
        normalized.battle_scars === true
            ? promptOrEmpty(findOption("battle_scars", "battle_scars")?.prompt)
            : "";

    const glow_eyes =
        normalized.glow_eyes === true
            ? promptOrEmpty(findOption("glow_eyes", "glow_eyes")?.prompt)
            : "";

    const notesTemplate = promptOrEmpty(findOption("notes", "notes")?.prompt);
    const notes = expandNotesPrompt(notesTemplate, normalized.notes ?? null);

    // Directives are just a normalized list of lines (generator decides how to format)
    const directives = [
        faithfulness,
        vibe,
        background,
        accessory,
        format,
        dramatic_light,
        battle_scars,
        glow_eyes,
        notes,
    ]
        .filter((x) => !!x)
        .join("\n")
        .split("\n")
        .map((x) => x.trim())
        .filter((x) => x.length > 0);

    return {
        format,
        vibe,
        background,
        accessory,
        faithfulness,
        dramatic_light,
        battle_scars,
        glow_eyes,
        notes,
        directives,
    };
}

/* ============================================================================
PUBLIC: SUGGESTED SIZE (tiny logic still ok here)
============================================================================ */

export function suggestedSize(format: string): "1024x1024" | "1024x1536" {
    return format === "portrait" ? "1024x1536" : "1024x1024";
}

/* ============================================================================
PUBLIC: JSON SCHEMA PACK (kept here to centralize)
============================================================================ */

export function playerAvatarOutputSchemaPack() {
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
