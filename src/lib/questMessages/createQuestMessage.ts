import { supabaseServer } from "@/lib/supabase/server";
import { type QuestMessageRole, type QuestMessageKind, type QuestMessageMeta } from "@/types/game";

/* ============================================================================
🧙‍♂️ QUEST MESSAGES — Création d’un message dans un thread de quête
============================================================================ */

/**
 * Création d’un message de quête (MJ / user / system)
 *
 * ⚠️ Le thread doit exister (ou être créé avant)
 */
export async function createQuestMessage(input: {
    session_id: string;
    thread_id: string;
    chapter_quest_id: string;

    role: QuestMessageRole;
    kind: QuestMessageKind;

    /** Contenu principal affiché */
    content: string;

    /** Titre optionnel (utile pour MJ / system) */
    title?: string | null;

    /** Données enrichies optionnelles */
    meta?: QuestMessageMeta | null;

    /** Lien optionnel vers une photo */
    photo_id?: string | null;
}) {
    const supabase = await supabaseServer();

    /* ---------------------------------------------------------------------
    🔎 Validation minimale
    --------------------------------------------------------------------- */

    const session_id = typeof input.session_id === "string" ? input.session_id.trim() : "";
    const thread_id = typeof input.thread_id === "string" ? input.thread_id.trim() : "";
    const chapter_quest_id =
        typeof input.chapter_quest_id === "string" ? input.chapter_quest_id.trim() : "";
    const content = typeof input.content === "string" ? input.content.trim() : "";

    if (!session_id) throw new Error("Missing session_id");
    if (!thread_id) throw new Error("Missing thread_id");
    if (!chapter_quest_id) throw new Error("Missing chapter_quest_id");
    if (!input.role) throw new Error("Missing role");
    if (input.role === "user") {
        throw new Error("Role 'user' is not allowed yet (RLS)");
    }
    if (!input.kind) throw new Error("Missing kind");
    if (!content) throw new Error("Missing content");

    /* ---------------------------------------------------------------------
    📦 Payload
    --------------------------------------------------------------------- */

    const payload = {
        session_id,
        thread_id,
        chapter_quest_id,

        role: input.role,
        kind: input.kind,

        content,
        title: input.title ?? null,
        meta: input.meta ?? null,
        photo_id: input.photo_id ?? null,
    };

    /* ---------------------------------------------------------------------
    🚀 Insert
    --------------------------------------------------------------------- */

    const { data, error } = await supabase
        .from("quest_messages")
        .insert(payload)
        .select(
            "id, thread_id, chapter_quest_id, role, kind, title, content, meta, photo_id, created_at"
        )
        .maybeSingle();

    if (error) {
        throw new Error(`QuestMessage insert failed: ${error.message}`);
    }

    return data;
}
