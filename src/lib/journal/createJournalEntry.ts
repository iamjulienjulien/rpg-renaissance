// src/lib/journal/createJournalEntry.ts

import { supabaseServer } from "@/lib/supabase/server";

// ✅ system logs
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type JournalKind =
    | "adventure_created"
    | "quests_seeded"
    | "chapter_created"
    | "chapter_started"
    | "quest_started"
    | "quest_done"
    | "quest_reopened"
    | "quest_photo_added"
    | "note"
    | "system";

export type CreateJournalEntryInput = {
    session_id: string;
    kind: JournalKind;
    title: string;
    content?: string | null;
    chapter_id?: string | null;
    quest_id?: string | null;
    adventure_quest_id?: string | null;
    meta?: Record<string, any> | null;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function safeMetaShape(meta: unknown) {
    if (!meta || typeof meta !== "object") return null;
    const keys = Object.keys(meta as any);
    return { keys_count: keys.length, keys: keys.slice(0, 12) };
}

function safeSnippet(s: string, max = 200) {
    const x = safeTrim(s);
    if (!x) return "";
    return x.length > max ? `${x.slice(0, max)}…` : x;
}

/* ============================================================================
🧰 MAIN
============================================================================ */

export async function createJournalEntry(input: CreateJournalEntryInput) {
    const startedAtMs = Date.now();
    const timer = Log.timer("createJournalEntry", {
        source: "src/lib/journal/createJournalEntry.ts",
        metadata: {
            kind: input.kind,
        },
    });

    const session_id = safeTrim(input.session_id);
    const title = safeTrim(input.title);

    // 🔗 Patch request context (corrélation logs)
    patchRequestContext({
        session_id: session_id || undefined,
        chapter_id: input.chapter_id ?? undefined,
        chapter_quest_id: (input as any)?.chapter_quest_id ?? undefined, // (si jamais tu passes ce champ ailleurs)
        adventure_quest_id: input.adventure_quest_id ?? undefined,
    });

    // 🛑 Validations
    if (!session_id) {
        Log.error("journal.missing.session_id", undefined);
        timer.endError("journal.missing.session_id");
        throw new Error("Missing session_id");
    }

    if (!input.kind) {
        Log.error("journal.missing.kind", undefined, { metadata: { session_id } });
        timer.endError("journal.missing.kind");
        throw new Error("Missing kind");
    }

    if (!title) {
        Log.error("journal.missing.title", undefined, { metadata: { session_id } });
        timer.endError("journal.missing.title");
        throw new Error("Missing title");
    }

    Log.debug("journal.prepare", {
        metadata: {
            session_id,
            kind: input.kind,
            title_snippet: safeSnippet(title, 120) || null,
            has_content: !!safeTrim(input.content ?? ""),
            content_len: safeTrim(input.content ?? "").length,
            chapter_id: input.chapter_id ?? null,
            quest_id: input.quest_id ?? null,
            adventure_quest_id: input.adventure_quest_id ?? null,
            meta: safeMetaShape(input.meta),
        },
    });

    const payload = {
        session_id, // ✅ IMPORTANT: utiliser la version trim
        kind: input.kind,
        title,
        content: input.content ?? null,
        chapter_id: input.chapter_id ?? null,
        quest_id: input.quest_id ?? null,
        adventure_quest_id: input.adventure_quest_id ?? null,
        meta: input.meta ?? null,
    };

    const supabase = await supabaseServer();

    const d0 = Date.now();
    const { data, error } = await supabase
        .from("journal_entries")
        .insert(payload)
        .select("id, session_id, kind, title, created_at, meta")
        .maybeSingle();

    if (error) {
        Log.error("journal.insert.error", error, {
            metadata: {
                session_id,
                kind: input.kind,
                title_snippet: safeSnippet(title, 120) || null,
                chapter_id: input.chapter_id ?? null,
                quest_id: input.quest_id ?? null,
                adventure_quest_id: input.adventure_quest_id ?? null,
                duration_ms: msSince(d0),
            },
        });

        timer.endError("journal.insert.failed", error, {
            metadata: { total_ms: msSince(startedAtMs) },
        });

        throw new Error(`Journal insert failed: ${error.message}`);
    }

    Log.success("journal.insert.ok", {
        metadata: {
            ms: msSince(d0),
            id: data?.id ?? null,
            kind: data?.kind ?? input.kind,
            session_id: data?.session_id ?? session_id,
        },
    });

    timer.endSuccess("journal.success", {
        metadata: { total_ms: msSince(startedAtMs), id: data?.id ?? null },
    });

    return data;
}
