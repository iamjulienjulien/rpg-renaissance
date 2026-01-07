import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type PatchMePayload = {
    /* ============================================================================
    1) user_profiles
    ============================================================================ */
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    locale?: string | null;
    onboarding_done?: boolean;

    /* ============================================================================
    2) player_profiles
    ============================================================================ */
    display_name?: string | null;

    /* ============================================================================
    3) player_profile_details
    ============================================================================ */
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

    /* ============================================================================
    4) user_contexts ✅ NEW
    ============================================================================ */
    context_self?: string | null;
    context_family?: string | null;
    context_home?: string | null;
    context_routine?: string | null;
    context_challenges?: string | null;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function hasAnyKey(obj: Record<string, any>) {
    return Object.keys(obj).length > 0;
}

type UserContextRow = {
    context_self: string | null;
    context_family: string | null;
    context_home: string | null;
    context_routine: string | null;
    context_challenges: string | null;
};

const USER_CONTEXT_KEYS: Array<keyof UserContextRow> = [
    "context_self",
    "context_family",
    "context_home",
    "context_routine",
    "context_challenges",
];

function pickUserContexts(payload: any): Partial<UserContextRow> {
    const out: Partial<UserContextRow> = {};

    for (const key of USER_CONTEXT_KEYS) {
        if (!(key in (payload ?? {}))) continue;

        const v = payload[key];

        if (v === null) {
            out[key] = null;
            continue;
        }

        if (typeof v === "string") {
            const trimmed = v.trim();
            out[key] = trimmed.length ? trimmed : null;
            continue;
        }
    }

    return out;
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
🧰 PATCH /api/me
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
    let payload: PatchMePayload & Partial<UserContextRow>;
    try {
        payload = (await req.json()) as any;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    /* ============================================================================
    1) user_profiles
    ============================================================================ */
    const userProfilesPatch: Record<string, any> = {};

    if ("first_name" in payload) userProfilesPatch.first_name = (payload as any).first_name ?? null;
    if ("last_name" in payload) userProfilesPatch.last_name = (payload as any).last_name ?? null;
    if ("avatar_url" in payload) userProfilesPatch.avatar_url = (payload as any).avatar_url ?? null;
    if ("locale" in payload) userProfilesPatch.locale = (payload as any).locale ?? null;
    if ("onboarding_done" in payload)
        userProfilesPatch.onboarding_done = (payload as any).onboarding_done;

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
            .update({ display_name: (payload as any).display_name ?? null })
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
    4) user_contexts  ✅ NEW
    ============================================================================ */
    const contextsPatch = pickUserContexts(payload);

    if (hasAnyKey(contextsPatch as any)) {
        const { error } = await supabase.from("user_contexts").upsert(
            {
                user_id: userId,
                ...contextsPatch,
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
