// src/lib/sessions/getActiveSession.ts
import { supabaseServer } from "@/lib/supabase/server";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

export type ActiveSession = {
    id: string;
    title: string;
    is_active: boolean;
    status: string;
};

export async function getActiveSessionOrThrow(): Promise<ActiveSession> {
    const supabase = await supabaseServer();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(authErr.message);

    const user = authData?.user ?? null;
    if (!user) throw new Error("Not authenticated");

    // ✅ Auto-context (best-effort): user_id déjà patché par supabaseServer(), mais on sécurise.
    patchRequestContext({ user_id: user.id });

    // 1) session active existante
    const { data: existing, error: sessErr } = await supabase
        .from("game_sessions")
        .select("id,title,is_active,status")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (sessErr) throw new Error(sessErr.message);

    if (existing) {
        // ✅ Auto-context
        patchRequestContext({ session_id: (existing as any)?.id ?? null });
        return existing as ActiveSession;
    }

    // 2) sinon on crée une session ET on garantit l’unicité
    const { error: offErr } = await supabase
        .from("game_sessions")
        .update({ is_active: false })
        .eq("user_id", user.id);

    if (offErr) throw new Error(offErr.message);

    const { data: created, error: createErr } = await supabase
        .from("game_sessions")
        .insert({
            user_id: user.id,
            title: "Ma partie",
            is_active: true,
            status: "active",
        })
        .select("id,title,is_active,status")
        .single();

    if (createErr) throw new Error(createErr.message);

    // ✅ Auto-context
    patchRequestContext({ session_id: (created as any)?.id ?? null });

    return created as ActiveSession;
}
