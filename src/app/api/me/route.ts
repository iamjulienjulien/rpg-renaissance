import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type PatchMePayload = {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    locale?: string | null;
    onboarding_done?: boolean;
};

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

export async function PATCH(req: Request) {
    const supabase = await supabaseServer();

    // Auth
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Body
    let payload: PatchMePayload;
    try {
        payload = (await req.json()) as PatchMePayload;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Build patch (only provided fields)
    const patch: PatchMePayload = {};

    if ("first_name" in payload) patch.first_name = payload.first_name ?? null;
    if ("last_name" in payload) patch.last_name = payload.last_name ?? null;
    if ("avatar_url" in payload) patch.avatar_url = payload.avatar_url ?? null;
    if ("locale" in payload) patch.locale = payload.locale ?? null;
    if ("onboarding_done" in payload) patch.onboarding_done = payload.onboarding_done;

    if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Update
    const { data: profile, error } = await supabase
        .from("user_profiles")
        .update(patch)
        .eq("user_id", auth.user.id)
        .select("user_id,first_name,last_name,avatar_url,locale,onboarding_done,updated_at")
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: profile ?? null });
}
