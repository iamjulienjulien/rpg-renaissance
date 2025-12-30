// src/lib/logs/createAiGenerationLog.ts

// import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ✅ system logs
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type AiGenerationStatus = "success" | "error";

export type AiGenerationInput = {
    // 🔐 Scope
    session_id: string;
    user_id?: string | null;

    // 🎯 Lien fonctionnel
    generation_type: string;
    source?: string | null;

    chapter_quest_id?: string | null;
    chapter_id?: string | null;
    adventure_id?: string | null;

    // 🤖 Modèle
    provider?: string;
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

    // 🧩 Rendu
    rendered_md?: string | null;

    // 📊 Debug
    usage_json?: any;
    tags?: string[] | null;
    metadata?: any;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function toIsoOrNull(x?: string | Date | null) {
    if (!x) return null;
    const d = new Date(x);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

/* ============================================================================
🧰 MAIN
============================================================================ */

export async function createAiGenerationLog(input: AiGenerationInput) {
    const startedAtMs = Date.now();
    const timer = Log.timer("createAiGenerationLog", {
        source: "src/lib/logs/createAiGenerationLog.ts",
        metadata: {
            generation_type: input.generation_type,
            status: input.status,
            model: input.model,
        },
    });

    const session_id = safeTrim(input.session_id);

    // 🛑 Validations strictes
    if (!session_id) {
        Log.error("ai_log.missing.session_id", undefined);
        timer.endError("ai_log.missing.session_id");
        throw new Error("Missing session_id");
    }

    if (!input.generation_type) {
        Log.error("ai_log.missing.generation_type", undefined, {
            metadata: { session_id },
        });
        timer.endError("ai_log.missing.generation_type");
        throw new Error("Missing generation_type");
    }

    if (!input.model) {
        Log.error("ai_log.missing.model", undefined, {
            metadata: { session_id, generation_type: input.generation_type },
        });
        timer.endError("ai_log.missing.model");
        throw new Error("Missing model");
    }

    if (!input.request_json) {
        Log.error("ai_log.missing.request_json", undefined, {
            metadata: { session_id, generation_type: input.generation_type },
        });
        timer.endError("ai_log.missing.request_json");
        throw new Error("Missing request_json");
    }

    // 🔗 Patch request context (global logs)
    patchRequestContext({
        session_id,
        user_id: input.user_id ?? undefined,
        chapter_id: input.chapter_id ?? undefined,
        chapter_quest_id: input.chapter_quest_id ?? undefined,
        adventure_id: input.adventure_id ?? undefined,
    });

    Log.debug("ai_log.prepare", {
        metadata: {
            session_id,
            generation_type: input.generation_type,
            source: input.source ?? null,
            status: input.status,
            model: input.model,
            has_error: input.status === "error",
            has_output: !!input.output_text,
            has_parsed: !!input.parsed_json,
            has_rendered_md: !!input.rendered_md,
            tags: input.tags ?? [],
        },
    });

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
        started_at: toIsoOrNull(input.started_at),
        finished_at: toIsoOrNull(input.finished_at),
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

    const supabase = await supabaseAdmin();

    const d0 = Date.now();
    const { data, error } = await supabase
        .from("ai_generations")
        .insert(payload)
        .select("id, generation_type, status, model, created_at")
        .maybeSingle();

    if (error) {
        Log.error("ai_log.insert.error", error, {
            metadata: {
                session_id,
                generation_type: input.generation_type,
                status: input.status,
                model: input.model,
                duration_ms: msSince(d0),
            },
        });

        timer.endError("ai_log.insert.failed", error, {
            metadata: { total_ms: msSince(startedAtMs) },
        });

        throw new Error(`AI generation log insert failed: ${error.message}`);
    }

    Log.success("ai_log.insert.ok", {
        metadata: {
            ms: msSince(d0),
            id: data?.id ?? null,
            generation_type: data?.generation_type,
            status: data?.status,
            model: data?.model,
        },
    });

    timer.endSuccess("ai_log.success", {
        metadata: {
            total_ms: msSince(startedAtMs),
            id: data?.id ?? null,
        },
    });

    return data;
}
