import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type PatchMePayload = {
    // user_profiles
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    locale?: string | null;
    onboarding_done?: boolean;

    // player_profiles
    display_name?: string | null;

    // player_profile_details
    gender?: string | null;
    birth_date?: string | null;
    country_code?: string | null;
    main_goal?: string | null;

    wants?: string[];
    avoids?: string[];

    life_rhythm?: string | null;
    energy_peak?: string | null;
    daily_time_budget?: string | null;

    effort_style?: string | null;
    challenge_preference?: string | null;
    motivation_primary?: string | null;
    failure_response?: string | null;

    values?: string[];
    authority_relation?: string | null;

    archetype?: string | null;
    symbolism_relation?: string | null;
    resonant_elements?: string[];

    extra?: Record<string, any>;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function hasAnyKey(obj: Record<string, any>) {
    return Object.keys(obj).length > 0;
}

/* ============================================================================
GET /api/me
============================================================================ */

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

/* ============================================================================
PATCH /api/me
============================================================================ */

export async function PATCH(req: Request) {
    const supabase = await supabaseServer();

    // ------------------------------------------------------------
    // Auth
    // ------------------------------------------------------------
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = auth.user.id;

    // ------------------------------------------------------------
    // Body
    // ------------------------------------------------------------
    let payload: PatchMePayload;
    try {
        payload = (await req.json()) as PatchMePayload;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    /* ============================================================================
    1) user_profiles
    ============================================================================ */
    const userProfilesPatch: Record<string, any> = {};

    if ("first_name" in payload) userProfilesPatch.first_name = payload.first_name ?? null;
    if ("last_name" in payload) userProfilesPatch.last_name = payload.last_name ?? null;
    if ("avatar_url" in payload) userProfilesPatch.avatar_url = payload.avatar_url ?? null;
    if ("locale" in payload) userProfilesPatch.locale = payload.locale ?? null;
    if ("onboarding_done" in payload) userProfilesPatch.onboarding_done = payload.onboarding_done;

    if (hasAnyKey(userProfilesPatch)) {
        const { error } = await supabase
            .from("user_profiles")
            .update(userProfilesPatch)
            .eq("user_id", userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    /* ============================================================================
    2) player_profiles (display_name)
    ============================================================================ */
    if ("display_name" in payload) {
        const { error } = await supabase
            .from("player_profiles")
            .update({ display_name: payload.display_name ?? null })
            .eq("user_id", userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    /* ============================================================================
    3) player_profile_details
    ============================================================================ */
    const detailsPatch: Record<string, any> = {};

    const detailKeys: Array<keyof PatchMePayload> = [
        "gender",
        "birth_date",
        "country_code",
        "main_goal",
        "wants",
        "avoids",
        "life_rhythm",
        "energy_peak",
        "daily_time_budget",
        "effort_style",
        "challenge_preference",
        "motivation_primary",
        "failure_response",
        "values",
        "authority_relation",
        "archetype",
        "symbolism_relation",
        "resonant_elements",
        "extra",
    ];

    for (const key of detailKeys) {
        if (key in payload) {
            detailsPatch[key] = (payload as any)[key] ?? null;
        }
    }

    if (hasAnyKey(detailsPatch)) {
        // upsert pour gérer le cas où la ligne n'existe pas encore
        const { error } = await supabase.from("player_profile_details").upsert(
            {
                user_id: userId,
                ...detailsPatch,
            },
            { onConflict: "user_id" }
        );

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    /* ============================================================================
    DONE
    ============================================================================ */
    return NextResponse.json({ status: "ok" });
}
