// src/lib/inventory/schemas/plants/v1.ts
import { z } from "zod";

/* ============================================================================
🧱 TYPES (v1)
============================================================================ */

export type PlantFieldTypeV1 = "string" | "number" | "boolean" | "enum" | "date" | "text";

export type PlantDraftV1 = {
    schema_version: "plants.v1";
    title: string;
    ai_description: string;
    data: Record<PlantFieldKeyV1, { type: PlantFieldTypeV1; value: any }>;
};

export const PLANTS_SCHEMA_VERSION = "plants.v1" as const;

/* ============================================================================
✅ FIELD KEYS (v1) – option A (fields typés + value)
============================================================================ */

export const PLANTS_FIELD_KEYS_V1 = [
    "name",
    "common_name",
    "species",
    "location",
    "light",
    "watering",
    "health",
    "notes",
] as const;

export type PlantFieldKeyV1 = (typeof PLANTS_FIELD_KEYS_V1)[number];

/* ============================================================================
🧪 ZOD VALIDATION
============================================================================ */

const PlantFieldValueSchema = z.object({
    type: z.enum(["string", "number", "boolean", "enum", "date", "text"]),
    value: z.any(),
});

const PlantDataV1Schema = z
    .object({
        name: PlantFieldValueSchema,
        common_name: PlantFieldValueSchema,
        species: PlantFieldValueSchema,
        location: PlantFieldValueSchema,
        light: PlantFieldValueSchema,
        watering: PlantFieldValueSchema,
        health: PlantFieldValueSchema,
        notes: PlantFieldValueSchema,
    })
    .strict();

export const PlantDraftV1Schema = z.object({
    schema_version: z.literal(PLANTS_SCHEMA_VERSION),
    title: z.string().min(1).max(80),
    ai_description: z.string().min(1).max(1200),
    data: PlantDataV1Schema,
});

export function validatePlantDraftV1(input: unknown): {
    ok: boolean;
    data?: PlantDraftV1;
    errors?: string[];
} {
    const res = PlantDraftV1Schema.safeParse(input);
    if (res.success) {
        return { ok: true, data: res.data as PlantDraftV1 };
    }
    return {
        ok: false,
        errors: res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
}

/* ============================================================================
📦 OPENAI JSON SCHEMA (STRICT)
============================================================================ */

export const OPENAI_PLANT_PREFILL_SCHEMA_V1 = {
    type: "object",
    additionalProperties: false,
    properties: {
        schema_version: { type: "string", enum: [PLANTS_SCHEMA_VERSION] },
        title: { type: "string" },
        ai_description: { type: "string" },
        data: {
            type: "object",
            additionalProperties: false,
            properties: {
                name: {
                    type: "object",
                    required: ["type", "value"],
                    additionalProperties: false,
                    properties: {
                        type: { type: "string" },
                        value: { type: ["string", "null"], maxLength: 80 },
                    },
                },
                common_name: {
                    type: "object",
                    required: ["type", "value"],
                    additionalProperties: false,
                    properties: {
                        type: { type: "string" },
                        value: { type: ["string", "null"], maxLength: 120 },
                    },
                },
                species: {
                    type: "object",
                    required: ["type", "value"],
                    additionalProperties: false,
                    properties: {
                        type: { type: "string" },
                        value: { type: ["string", "null"], maxLength: 160 },
                    },
                },
                location: {
                    type: "object",
                    required: ["type", "value"],
                    additionalProperties: false,
                    properties: {
                        type: { type: "string" },
                        value: { type: ["string", "null"], maxLength: 140 },
                    },
                },
                light: {
                    type: "object",
                    required: ["type", "value"],
                    additionalProperties: false,
                    properties: {
                        type: { type: "string" },
                        value: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
                    },
                },
                watering: {
                    type: "object",
                    required: ["type", "value"],
                    additionalProperties: false,
                    properties: {
                        type: { type: "string" },
                        value: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
                    },
                },
                health: {
                    type: "object",
                    required: ["type", "value"],
                    additionalProperties: false,
                    properties: {
                        type: { type: "string" },
                        value: { type: ["string", "null"], enum: ["poor", "ok", "good", null] },
                    },
                },
                notes: {
                    type: "object",
                    required: ["type", "value"],
                    additionalProperties: false,
                    properties: {
                        type: { type: "string" },
                        value: { type: ["string", "null"], maxLength: 700 },
                    },
                },
            },
            required: [
                "name",
                "common_name",
                "species",
                "location",
                "light",
                "watering",
                "health",
                "notes",
            ],
        },
    },
    required: ["schema_version", "title", "ai_description", "data"],
} as const;
