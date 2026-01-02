// src/lib/inventory/schemas/plants.v1.ts

/* ============================================================================
🌿 INVENTORY SCHEMA — PLANTS (v1)
RPG Renaissance — Inventaire du Foyer
============================================================================ */

/**
 * Ce schéma est la “vérité côté code” (versionnée) pour:
 * - validation runtime (avec zod)
 * - types TS
 * - conversion vers json_schema OpenAI si besoin
 *
 * Stockage conseillé:
 * - Fichier: src/lib/inventory/schemas/plants.v1.ts
 * - BDD: inventory_schema_versions (à faire plus tard)
 */

import { z } from "zod";

/* ============================================================================
🧱 VERSION METADATA
============================================================================ */

export const PLANT_SCHEMA_VERSION = "v1" as const;
export const PLANT_INVENTORY_TYPE = "plants" as const;

/* ============================================================================
🧰 ENUMS
============================================================================ */

export const PlantLightEnum = z.enum(["low", "medium", "high"]);
export type PlantLight = z.infer<typeof PlantLightEnum>;

export const PlantWateringEnum = z.enum(["low", "medium", "high"]);
export type PlantWatering = z.infer<typeof PlantWateringEnum>;

export const PlantHealthEnum = z.enum(["poor", "ok", "good"]);
export type PlantHealth = z.infer<typeof PlantHealthEnum>;

/* ============================================================================
📦 DATA SCHEMA
============================================================================ */

export const PlantInventoryDataSchemaV1 = z
    .object({
        name: z
            .string()
            .trim()
            .min(1)
            .max(80)
            .nullable()
            .describe("Nom donné par l’utilisateur (ex: 'Pachira', 'Plante de Louise')"),

        common_name: z
            .string()
            .trim()
            .min(1)
            .max(120)
            .nullable()
            .describe("Nom courant si pertinent (ex: 'pied d’éléphant')"),

        species: z
            .string()
            .trim()
            .min(1)
            .max(160)
            .nullable()
            .describe("Espèce / nom latin si connu (ex: 'Beaucarnea recurvata')"),

        location: z
            .string()
            .trim()
            .min(1)
            .max(140)
            .nullable()
            .describe("Emplacement dans le foyer (ex: 'Cuisine', 'Salon - près fenêtre')"),

        light: PlantLightEnum.nullable().describe("Exposition: low|medium|high"),
        watering: PlantWateringEnum.nullable().describe("Arrosage: low|medium|high"),
        health: PlantHealthEnum.nullable().describe("État: poor|ok|good"),

        notes: z
            .string()
            .trim()
            .min(1)
            .max(700)
            .nullable()
            .describe("Notes libres (taille, rempotage, boutures, achats, événements, etc.)"),
    })
    .strict();

export type PlantInventoryDataV1 = z.infer<typeof PlantInventoryDataSchemaV1>;

/* ============================================================================
🧾 FULL RECORD (the form payload you persist)
============================================================================ */

export const PlantInventoryItemSchemaV1 = z
    .object({
        schema: z.literal(PLANT_INVENTORY_TYPE),
        schema_version: z.literal(PLANT_SCHEMA_VERSION),

        ai_description: z
            .string()
            .trim()
            .min(1)
            .max(900)
            .describe("Description factuelle de la plante rédigée par l’IA (2 à 5 phrases)."),

        data: PlantInventoryDataSchemaV1,
    })
    .strict();

export type PlantInventoryItemV1 = z.infer<typeof PlantInventoryItemSchemaV1>;

/* ============================================================================
🔁 HELPERS
============================================================================ */

export function normalizePlantInventoryItemV1(input: unknown): PlantInventoryItemV1 {
    // Parse + guarantee shape
    const parsed = PlantInventoryItemSchemaV1.parse(input);

    // Extra small normalization (avoid accidental empty strings)
    const toNull = (s: string | null) => (s && s.trim().length ? s.trim() : null);

    return {
        ...parsed,
        ai_description: parsed.ai_description.trim(),
        data: {
            ...parsed.data,
            name: toNull(parsed.data.name),
            common_name: toNull(parsed.data.common_name),
            species: toNull(parsed.data.species),
            location: toNull(parsed.data.location),
            notes: toNull(parsed.data.notes),
        },
    };
}

/**
 * Pour OpenAI Responses API (json_schema):
 * - tu peux transformer PlantInventoryItemSchemaV1 -> JSON Schema plus tard.
 * - ou garder une copie "hand-written" si tu veux 0 dépendance.
 */
