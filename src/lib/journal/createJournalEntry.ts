import { supabaseServer } from "@/lib/supabase/server";

export type JournalKind =
    | "adventure_created"
    | "quests_seeded"
    | "chapter_created"
    | "chapter_started"
    | "quest_started"
    | "quest_done"
    | "quest_reopened"
    | "note";

export async function createJournalEntry(input: {
    session_id: string;
    kind: JournalKind;
    title: string;
    content?: string | null;
    chapter_id?: string | null;
    quest_id?: string | null;
    adventure_quest_id?: string | null;
}) {
    const supabase = await supabaseServer();

    const session_id = typeof input.session_id === "string" ? input.session_id.trim() : "";
    const title = typeof input.title === "string" ? input.title.trim() : "";

    if (!session_id) {
        throw new Error("Missing session_id");
    }
    if (!input.kind) {
        throw new Error("Missing kind");
    }
    if (!title) {
        throw new Error("Missing title");
    }

    const payload = {
        session_id: input.session_id, // ✅ IMPORTANT
        kind: input.kind,
        title: input.title,
        content: input.content ?? null,
        chapter_id: input.chapter_id ?? null,
        quest_id: input.chapter_id ?? null,
        adventure_quest_id: input.adventure_quest_id ?? null,
    };

    const { data, error } = await supabase
        .from("journal_entries")
        .insert(payload)
        .select("id, session_id, kind, title, created_at")
        .maybeSingle();

    if (error) {
        throw new Error(`Journal insert failed: ${error.message}`);
    }

    return data;
}
