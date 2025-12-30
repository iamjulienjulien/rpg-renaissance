import { supabaseServer } from "@/lib/supabase/server";
import { type QuestThread } from "@/types/game";

/* ============================================================================
🧙‍♂️ QUEST THREADS — Get or Create (aligned with v0.3.9 migration)

Schema assumptions (from your SQL):
- public.quest_threads:
    id, session_id, chapter_quest_id, created_at, updated_at
    UNIQUE(chapter_quest_id)

Notes:
- 1 thread canonique par chapter_quest_id.
- session_id est stocké pour le contrôle RLS + cohérence, mais l'unicité est portée
  uniquement par chapter_quest_id (car une CQ appartient déjà à une session).
============================================================================ */

export async function getOrCreateQuestThread(input: {
    session_id: string;
    chapter_quest_id: string;
}): Promise<QuestThread> {
    const supabase = await supabaseServer();

    const session_id = typeof input.session_id === "string" ? input.session_id.trim() : "";
    const chapter_quest_id =
        typeof input.chapter_quest_id === "string" ? input.chapter_quest_id.trim() : "";

    if (!session_id) throw new Error("Missing session_id");
    if (!chapter_quest_id) throw new Error("Missing chapter_quest_id");

    /* ---------------------------------------------------------------------
    🔎 1) Cherche le thread existant (canonique) par chapter_quest_id
    --------------------------------------------------------------------- */
    const { data: existing, error: findErr } = await supabase
        .from("quest_threads")
        .select("id, session_id, chapter_quest_id, created_at, updated_at")
        .eq("chapter_quest_id", chapter_quest_id)
        .maybeSingle();

    if (findErr) {
        throw new Error(`QuestThread select failed: ${findErr.message}`);
    }

    // garde-fou cohérence: un thread ne doit jamais être “dans une autre session”
    if (existing) {
        if (existing.session_id !== session_id) {
            throw new Error("QuestThread session mismatch");
        }
        return existing as QuestThread;
    }

    /* ---------------------------------------------------------------------
    🧪 2) Crée le thread
    --------------------------------------------------------------------- */
    const payload = { session_id, chapter_quest_id };

    const { data: created, error: insErr } = await supabase
        .from("quest_threads")
        .insert(payload)
        .select("id, session_id, chapter_quest_id, created_at, updated_at")
        .maybeSingle();

    if (!insErr && created) return created as QuestThread;

    /* ---------------------------------------------------------------------
    🧯 3) Concurrence (double insert)
    - Avec UNIQUE(chapter_quest_id), deux requêtes simultanées peuvent se marcher dessus.
    - On re-fetch et on retourne le canonique si présent.
    --------------------------------------------------------------------- */
    const { data: retry, error: retryErr } = await supabase
        .from("quest_threads")
        .select("id, session_id, chapter_quest_id, created_at, updated_at")
        .eq("chapter_quest_id", chapter_quest_id)
        .maybeSingle();

    if (retryErr) {
        throw new Error(`QuestThread insert failed: ${insErr?.message ?? "unknown error"}`);
    }

    if (!retry) {
        throw new Error(`QuestThread insert failed: ${insErr?.message ?? "unknown error"}`);
    }

    if (retry.session_id !== session_id) {
        throw new Error("QuestThread session mismatch");
    }

    return retry as QuestThread;
}
