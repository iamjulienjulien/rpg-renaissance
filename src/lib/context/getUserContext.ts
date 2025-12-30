import { supabaseServer } from "@/lib/supabase/server";

/* ============================================================================
🧰 MAIN
============================================================================ */

export async function getUserContext() {
    const supabase = await supabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user ?? null;

    if (!user?.id) return null;

    const { data } = await supabase
        .from("user_contexts")
        .select("context_self, context_family, context_home, context_routine, context_challenges")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!data) return null;

    return {
        self: data.context_self ?? null,
        family: data.context_family ?? null,
        home: data.context_home ?? null,
        routine: data.context_routine ?? null,
        challenges: data.context_challenges ?? null,
    };
}
