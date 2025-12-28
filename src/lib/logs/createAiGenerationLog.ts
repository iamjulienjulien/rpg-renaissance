// src/lib/logs/createAiGenerationLog.ts

import { supabaseServer } from "@/lib/supabase/server";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type AiGenerationStatus = "success" | "error";

export type AiGenerationInput = {
    // 🔐 Scope
    session_id: string;
    user_id?: string | null;

    // 🎯 Lien fonctionnel (optionnel mais recommandé)
    generation_type: string; // ex: "mission_order"
    source?: string | null; // ex: "generateMissionForChapterQuest"

    chapter_quest_id?: string | null;
    chapter_id?: string | null;
    adventure_id?: string | null;

    // 🤖 Modèle
    provider?: string; // default: "openai"
    model: string;

    // 🧾 Statut
    status: AiGenerationStatus;
    error_message?: string | null;
    error_code?: string | null;

    // ⏱️ Timing
    started_at?: string | Date;
    finished_at?: string | Date;
    duration_ms?: number | null;

    // 📤 Requête
    request_json: any;
    system_text?: string | null;
    user_input_text?: string | null;
    context_json?: any;

    // 📥 Réponse
    response_json?: any;
    output_text?: string | null;
    parsed_json?: any;
    parse_error?: string | null;

    // 🧩 Rendu final (si applicable)
    rendered_md?: string | null;

    // 📊 Usage / debug
    usage_json?: any;
    tags?: string[] | null;
    metadata?: any;
};

/* ============================================================================
🧰 MAIN
============================================================================ */

export async function createAiGenerationLog(input: AiGenerationInput) {
    const supabase = await supabaseServer();

    const session_id = typeof input.session_id === "string" ? input.session_id.trim() : "";

    if (!session_id) {
        throw new Error("Missing session_id");
    }

    if (!input.generation_type) {
        throw new Error("Missing generation_type");
    }

    if (!input.model) {
        throw new Error("Missing model");
    }

    if (!input.request_json) {
        throw new Error("Missing request_json");
    }

    const payload = {
        // Scope
        session_id,
        user_id: input.user_id ?? null,

        chapter_quest_id: input.chapter_quest_id ?? null,
        chapter_id: input.chapter_id ?? null,
        adventure_id: input.adventure_id ?? null,

        // Identification
        generation_type: input.generation_type,
        source: input.source ?? null,

        provider: input.provider ?? "openai",
        model: input.model,

        // Status
        status: input.status,
        error_message: input.error_message ?? null,
        error_code: input.error_code ?? null,

        // Timing
        started_at: input.started_at ? new Date(input.started_at).toISOString() : undefined,
        finished_at: input.finished_at ? new Date(input.finished_at).toISOString() : undefined,
        duration_ms: input.duration_ms ?? null,

        // Request
        request_json: input.request_json,
        system_text: input.system_text ?? null,
        user_input_text: input.user_input_text ?? null,
        context_json: input.context_json ?? null,

        // Response
        response_json: input.response_json ?? null,
        output_text: input.output_text ?? null,
        parsed_json: input.parsed_json ?? null,
        parse_error: input.parse_error ?? null,

        // Render
        rendered_md: input.rendered_md ?? null,

        // Debug
        usage_json: input.usage_json ?? null,
        tags: input.tags ?? null,
        metadata: input.metadata ?? null,
    };

    const { data, error } = await supabase
        .from("ai_generations")
        .insert(payload)
        .select("id, generation_type, status, model, created_at")
        .maybeSingle();

    if (error) {
        throw new Error(`AI generation log insert failed: ${error.message}`);
    }

    return data;
}
