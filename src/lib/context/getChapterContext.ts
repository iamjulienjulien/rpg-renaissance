import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

/* ============================================================================
🧰 MAIN
============================================================================ */

export async function getChapterContext(chapterId: string) {
    const supabase = await supabaseServer();

    const id = typeof chapterId === "string" ? chapterId.trim() : "";
    if (!id) return null;

    // ✅ session active (auth + patch context auto)
    const session = await getActiveSessionOrThrow();

    // ✅ chapitre appartenant à la session
    const { data, error } = await supabase
        .from("chapters")
        .select("context_text")
        .eq("id", id)
        .eq("session_id", session.id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
        text: data.context_text ?? null,
    };
}
