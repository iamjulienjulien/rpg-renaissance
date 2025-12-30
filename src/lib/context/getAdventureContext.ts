import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

/* ============================================================================
🧰 MAIN
============================================================================ */

export async function getAdventureContext() {
    const supabase = await supabaseServer();

    // ✅ session active (auth + patch context auto)
    const session = await getActiveSessionOrThrow();

    // ✅ aventure liée directement à la session
    const { data, error } = await supabase
        .from("adventures")
        .select("context_text")
        .eq("session_id", session.id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
        text: data.context_text ?? null,
    };
}
