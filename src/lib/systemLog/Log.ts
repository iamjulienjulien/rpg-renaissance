// src/lib/systemLog/Log.ts
import { supabaseServer } from "@/lib/supabase/server";
import { getRequestContext, type RequestLogContext } from "@/lib/systemLog/requestContext";

type LogLevel = "debug" | "info" | "success" | "warning" | "error";

type LogInput = {
    message: string;

    // context overrides
    request_id?: string | null;
    trace_id?: string | null;

    route?: string | null;
    method?: string | null;
    status_code?: number | null;
    duration_ms?: number | null;

    session_id?: string | null;
    user_id?: string | null;

    chapter_id?: string | null;
    adventure_id?: string | null;
    chapter_quest_id?: string | null;
    adventure_quest_id?: string | null;

    // origin
    source?: string | null;

    // error
    error?: unknown;

    // extra
    metadata?: Record<string, unknown> | null;
};

function safeString(x: unknown): string | null {
    if (typeof x === "string") return x;
    if (x == null) return null;
    try {
        return JSON.stringify(x);
    } catch {
        return String(x);
    }
}

function parseError(err: unknown) {
    if (!err) return null;

    if (err instanceof Error) {
        return {
            error_name: err.name ?? "Error",
            error_message: err.message ?? "",
            stack: err.stack ?? null,
        };
    }

    return {
        error_name: "Error",
        error_message: safeString(err) ?? "Unknown error",
        stack: null,
    };
}

// best-effort: extrait file/line depuis stack (V8)
function extractCallerInfo(stack?: string | null) {
    if (!stack)
        return {
            file: null as string | null,
            line: null as number | null,
            function_name: null as string | null,
        };

    const lines = stack.split("\n").map((l) => l.trim());

    // On saute les frames internes Log.* et on cherche la première frame “utile”
    const candidate = lines.find(
        (l) => l.includes("/src/") || l.includes("/app/") || l.includes("/pages/")
    );

    if (!candidate) return { file: null, line: null, function_name: null };

    // Ex: at myFn (/path/app/api/photos/route.ts:123:45)
    const fnMatch = candidate.match(/^at\s+([^\s(]+)\s+\(/);
    const locMatch =
        candidate.match(/\((.*):(\d+):(\d+)\)$/) || candidate.match(/at\s+(.*):(\d+):(\d+)$/);

    const function_name = fnMatch?.[1] ?? null;
    const file = locMatch?.[1] ?? null;
    const line = locMatch?.[2] ? Number(locMatch[2]) : null;

    return {
        file,
        line: Number.isFinite(line as any) ? (line as number) : null,
        function_name,
    };
}

async function insertSystemLog(level: LogLevel, input: LogInput) {
    const ctx: RequestLogContext | null = getRequestContext();

    const mergedRequestId = input.request_id ?? ctx?.request_id ?? null;
    const route = input.route ?? ctx?.route ?? null;
    const method = input.method ?? ctx?.method ?? null;

    const session_id = input.session_id ?? ctx?.session_id ?? null;
    const user_id = input.user_id ?? ctx?.user_id ?? null;

    const chapter_id = input.chapter_id ?? ctx?.chapter_id ?? null;
    const adventure_id = input.adventure_id ?? ctx?.adventure_id ?? null;
    const chapter_quest_id = input.chapter_quest_id ?? ctx?.chapter_quest_id ?? null;
    const adventure_quest_id = input.adventure_quest_id ?? ctx?.adventure_quest_id ?? null;

    const duration_ms =
        typeof input.duration_ms === "number"
            ? input.duration_ms
            : ctx?.started_at_ms
              ? Math.max(0, Date.now() - ctx.started_at_ms)
              : null;

    const errParsed = parseError(input.error);
    const caller = extractCallerInfo(errParsed?.stack ?? new Error().stack ?? null);

    const row = {
        level,
        message: input.message,

        request_id: mergedRequestId,
        trace_id: input.trace_id ?? null,

        route,
        method,
        status_code: input.status_code ?? null,
        duration_ms,

        session_id,
        user_id,

        chapter_id,
        adventure_id,
        chapter_quest_id,
        adventure_quest_id,

        source: input.source ?? null,
        file: caller.file,
        line: caller.line,
        function_name: caller.function_name,

        error_name: errParsed?.error_name ?? null,
        error_message: errParsed?.error_message ?? null,
        stack: errParsed?.stack ?? null,

        metadata: input.metadata ?? {},
    };

    try {
        const supabase = await supabaseServer();
        const { error } = await supabase.from("system_logs").insert(row as any);
        if (error) {
            // fallback console (dernier filet)
            console.error("system_logs insert failed:", error.message);
        }
    } catch (e) {
        console.error("system_logs fatal insert error:", e);
    }
}

export class Log {
    static debug(message: string, input?: Omit<LogInput, "message">) {
        void insertSystemLog("debug", { message, ...(input ?? {}) });
    }

    static info(message: string, input?: Omit<LogInput, "message">) {
        void insertSystemLog("info", { message, ...(input ?? {}) });
    }

    static success(message: string, input?: Omit<LogInput, "message">) {
        void insertSystemLog("success", { message, ...(input ?? {}) });
    }

    static warning(message: string, input?: Omit<LogInput, "message">) {
        void insertSystemLog("warning", { message, ...(input ?? {}) });
    }

    static error(message: string, error?: unknown, input?: Omit<LogInput, "message" | "error">) {
        void insertSystemLog("error", { message, error, ...(input ?? {}) });
    }

    // pratique: commence un timer et renvoie un end() qui log duration_ms
    static timer(label: string, input?: Omit<LogInput, "message" | "duration_ms">) {
        const started = Date.now();
        return {
            endSuccess: (message?: string, extra?: Omit<LogInput, "message" | "duration_ms">) => {
                void insertSystemLog("success", {
                    message: message ?? label,
                    duration_ms: Date.now() - started,
                    ...(input ?? {}),
                    ...(extra ?? {}),
                });
            },
            endError: (
                message: string,
                err?: unknown,
                extra?: Omit<LogInput, "message" | "duration_ms" | "error">
            ) => {
                void insertSystemLog("error", {
                    message,
                    error: err,
                    duration_ms: Date.now() - started,
                    ...(input ?? {}),
                    ...(extra ?? {}),
                });
            },
        };
    }
}
