"use client";

import * as React from "react";
import type { ApiResult } from "@/stores/gameStore";
import { apiPatch } from "@/stores/gameStore";
import { type PatchMePayload } from "@/stores/gameStore";

export type PlayerProfileDetailsRow = {
    user_id: string;

    gender: string | null;
    birth_date: string | null;
    locale: string | null;
    country_code: string | null;

    main_goal: string | null;
    wants: string[];
    avoids: string[];

    life_rhythm: string | null;
    energy_peak: string | null;
    daily_time_budget: string | null;

    effort_style: string | null;
    challenge_preference: string | null;
    motivation_primary: string | null;
    failure_response: string | null;

    values: string[];
    authority_relation: string | null;

    archetype: string | null;
    symbolism_relation: string | null;
    resonant_elements: string[];

    extra: Record<string, any>;

    created_at: string;
    updated_at: string;
};

type GetMeDetailsResponse = {
    details: PlayerProfileDetailsRow | null;
};

type PatchMeResponse = {
    // selon ce que tu renvoies depuis /api/me : adapte si besoin
    profile?: any | null; // user_profiles
    player_profile?: any | null; // player_profiles
    details?: PlayerProfileDetailsRow | null; // player_profile_details
};

export type PlayerProfileDetailsPatch = Partial<
    Pick<
        PlayerProfileDetailsRow,
        | "gender"
        | "birth_date"
        | "locale"
        | "country_code"
        | "main_goal"
        | "wants"
        | "avoids"
        | "life_rhythm"
        | "energy_peak"
        | "daily_time_budget"
        | "effort_style"
        | "challenge_preference"
        | "motivation_primary"
        | "failure_response"
        | "values"
        | "authority_relation"
        | "archetype"
        | "symbolism_relation"
        | "resonant_elements"
        | "extra"
    >
>;

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

const contextKeys: Array<keyof PatchMePayload> = [
    "context_self",
    "context_family",
    "context_home",
    "context_routine",
    "context_challenges",
];

type UsePlayerProfileDetailsState = {
    details: PlayerProfileDetailsRow | null;
    loading: boolean;
    error: string | null;

    refetch: () => Promise<PlayerProfileDetailsRow | null>;
    update: (patch: PatchMePayload) => Promise<boolean>;
};

async function safeJson(res: Response) {
    return res.json().catch(() => null);
}

function asErrorMessage(payload: any, fallback: string) {
    if (!payload) return fallback;
    if (typeof payload === "string") return payload;
    if (typeof payload?.error === "string") return payload.error;
    if (typeof payload?.message === "string") return payload.message;
    return fallback;
}

export function usePlayerProfileDetails(opts?: { auto?: boolean }) {
    const auto = opts?.auto ?? true;

    const [details, setDetails] = React.useState<PlayerProfileDetailsRow | null>(null);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const refetch = React.useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/me/details", {
                method: "GET",
                headers: { Accept: "application/json" },
                cache: "no-store",
            });

            const json = (await safeJson(res)) as GetMeDetailsResponse | null;

            if (!res.ok) {
                setDetails(null);
                setError(asErrorMessage(json, `Failed to fetch details (${res.status})`));
                return null;
            }

            const next = json?.details ?? null;
            setDetails(next);
            return next;
        } catch (e) {
            setDetails(null);
            setError(e instanceof Error ? e.message : "Network error");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const update = React.useCallback(async (patch: PatchMePayload) => {
        const payload: Record<string, any> = {};

        /* ------------------------------------------------------------
     user_profiles
    ------------------------------------------------------------ */
        if ("first_name" in patch) payload.first_name = patch.first_name ?? null;
        if ("last_name" in patch) payload.last_name = patch.last_name ?? null;
        if ("avatar_url" in patch) payload.avatar_url = patch.avatar_url ?? null;
        if ("locale" in patch) payload.locale = patch.locale ?? null;
        if ("onboarding_done" in patch) payload.onboarding_done = !!patch.onboarding_done;

        /* ------------------------------------------------------------
     player_profiles
    ------------------------------------------------------------ */
        if ("display_name" in patch) payload.display_name = patch.display_name ?? null;

        /* ------------------------------------------------------------
     player_profile_details (flat)
    ------------------------------------------------------------ */
        for (const k of detailKeys) {
            if (k in patch) {
                (payload as any)[k] = (patch as any)[k] ?? null;
            }
        }

        /* ------------------------------------------------------------
     user_contexts ✅ NEW (flat)
    ------------------------------------------------------------ */
        for (const k of contextKeys) {
            if (k in patch) {
                const v = (patch as any)[k];

                // même logique que ta route /api/user-context :
                // - null => null
                // - string => trim, vide => null
                if (v === null) {
                    (payload as any)[k] = null;
                } else if (typeof v === "string") {
                    const trimmed = v.trim();
                    (payload as any)[k] = trimmed.length ? trimmed : null;
                }
            }
        }

        if (Object.keys(payload).length === 0) {
            setError("No fields to update");
            return false;
        }

        try {
            setLoading(true);
            setError(null);

            const res: ApiResult<PatchMeResponse> = await apiPatch<PatchMeResponse>(
                "/api/me",
                payload
            );

            if (!res.ok) {
                setError(res.error ?? "Update failed");
                return false;
            }

            /* ------------------------------------------------------------
         Sync local state (details)
        ------------------------------------------------------------ */
            const nextDetails = (res.data as any)?.details ?? null;

            if (nextDetails) {
                setDetails(nextDetails);
            } else {
                // fallback optimiste
                const optimistic: Partial<PlayerProfileDetailsRow> = {};

                for (const k of detailKeys) {
                    if (k in payload) {
                        (optimistic as any)[k] = (payload as any)[k];
                    }
                }

                if (Object.keys(optimistic).length > 0) {
                    setDetails((prev) => (prev ? { ...prev, ...optimistic } : prev));
                }
            }

            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : "Network error");
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (!auto) return;
        void refetch();
    }, [auto, refetch]);

    return {
        details,
        loading,
        error,
        refetch,
        update,
    } satisfies UsePlayerProfileDetailsState;
}
