import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = { id: auth.user.id, email: auth.user.email ?? null };

    const { data: profile } = await supabase
        .from("player_profiles")
        .select("user_id,display_name,character_id")
        .eq("user_id", user.id)
        .maybeSingle();

    const { data: session } = await supabase
        .from("game_sessions")
        .select("id,title,is_active,status,created_at,updated_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

    return NextResponse.json({ user, profile: profile ?? null, session: session ?? null });
}
