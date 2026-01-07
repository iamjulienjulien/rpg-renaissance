import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await supabaseServer();

    // ------------------------------------------------------------------
    // Auth
    // ------------------------------------------------------------------
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = auth.user.id;

    // ------------------------------------------------------------------
    // Fetch profile details
    // ------------------------------------------------------------------
    const { data, error } = await supabase
        .from("player_profile_details")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ------------------------------------------------------------------
    // Auto-create row if missing (UX friendly)
    // ------------------------------------------------------------------
    if (!data) {
        const { data: created, error: insertErr } = await supabase
            .from("player_profile_details")
            .insert({ user_id: userId })
            .select("*")
            .single();

        if (insertErr) {
            return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }

        return NextResponse.json({ details: created });
    }

    return NextResponse.json({ details: data });
}
