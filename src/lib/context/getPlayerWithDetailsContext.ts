// src/lib/ai/context/getPlayerWithDetailsContext.ts
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ✅ logs
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

export type PlayerContextMode = "authenticated" | "server";

/** Représentation enrichie d'une option (label/emoji) */
export type PlayerDetailOption = {
    key: string; // value_key
    label: string;
    emoji: string | null;
    description: string | null;
    context_fragment: string | null;
};

export type PlayerDetailsContext = {
    // bruts (value_key)
    gender: string | null;
    birth_date: string | null;
    locale: string | null;
    country_code: string | null;
    main_goal: string | null;

    wants: string[];
    avoids: string[];
    values: string[];
    resonant_elements: string[];

    life_rhythm: string | null;
    energy_peak: string | null;
    daily_time_budget: string | null;

    effort_style: string | null;
    challenge_preference: string | null;
    motivation_primary: string | null;

    failure_response: string | null;
    authority_relation: string | null;
    symbolism_relation: string | null;

    archetype: string | null;
    extra: Record<string, any>;

    // enrichis (label/emoji) pour affichage ou prompt plus tard
    resolved?: {
        gender?: PlayerDetailOption | null;
        life_rhythm?: PlayerDetailOption | null;
        energy_peak?: PlayerDetailOption | null;
        daily_time_budget?: PlayerDetailOption | null;

        effort_style?: PlayerDetailOption | null;
        challenge_preference?: PlayerDetailOption | null;
        motivation_primary?: PlayerDetailOption | null;

        failure_response?: PlayerDetailOption | null;
        authority_relation?: PlayerDetailOption | null;
        symbolism_relation?: PlayerDetailOption | null;

        archetype?: PlayerDetailOption | null;

        wants?: PlayerDetailOption[];
        avoids?: PlayerDetailOption[];
        values?: PlayerDetailOption[];
        resonant_elements?: PlayerDetailOption[];
    };

    // fragments “prêts” à assembler plus tard (optionnels)
    fragments?: {
        headline?: string | null;
        playstyle?: string | null;
        motivators?: string | null;
        blockers?: string | null;
        symbolism?: string | null;
    };
};

export type PlayerWithDetailsContextResult = {
    player_display_name: string | null;

    // free-text contexts
    player_context_self: string | null;
    player_context_family: string | null;
    player_context_home: string | null;
    player_context_routine: string | null;
    player_context_challenges: string | null;

    // structured details
    player_details: PlayerDetailsContext | null;
} | null;

type AuthenticatedArgs = {
    mode: "authenticated";
    /** optionnel: forcer un user_id (utile admin UI). Sinon => auth.user.id */
    user_id?: string | null;
    /** résout labels/emojis depuis profile_option_refs */
    resolve_options?: boolean;
};

type ServerArgs = {
    mode: "server";
    /** requis en mode server */
    user_id: string;
    /** résout labels/emojis depuis profile_option_refs */
    resolve_options?: boolean;
};

export type GetPlayerWithDetailsContextArgs = AuthenticatedArgs | ServerArgs;

/* ============================================================================
🧠 INTERNAL: option resolving (profile_option_refs)
============================================================================ */

type OptionRow = {
    field_key: string;
    value_key: string;
    label: string;
    emoji: string;
    description: string | null;
    context_fragment: string | null;
};

function resolveOne(
    map: Record<string, Record<string, OptionRow>>,
    field: string,
    key: string | null
): PlayerDetailOption | null {
    if (!key) return null;

    const row = map[field]?.[key];

    if (!row) {
        return {
            key,
            label: key,
            emoji: null,
            description: null,
            context_fragment: null,
        };
    }

    return {
        key: row.value_key,
        label: row.label,
        emoji: row.emoji ?? null,
        description: row.description ?? null,
        context_fragment: row.context_fragment ?? null,
    };
}

function resolveMany(
    map: Record<string, Record<string, OptionRow>>,
    field: string,
    keys: string[]
): PlayerDetailOption[] {
    return (keys ?? [])
        .filter(Boolean)
        .map((k) => resolveOne(map, field, k))
        .filter((x): x is PlayerDetailOption => !!x);
}

function pickFragment(opt?: PlayerDetailOption | null, fallback?: string | null) {
    return opt?.context_fragment?.trim()
        ? opt.context_fragment.trim()
        : fallback?.trim()
          ? fallback.trim()
          : null;
}

function pickManyFragments(opts?: PlayerDetailOption[] | null, fallback?: string[]) {
    const frags =
        (opts ?? [])
            .map((o) => o.context_fragment?.trim())
            .filter((x): x is string => !!x && !!x.trim()) ?? [];

    if (frags.length) return frags;

    // fallback "keys" si pas de fragments en base
    const fb = (fallback ?? []).filter(Boolean);
    return fb.length ? fb : null;
}

function makeFragments(details: PlayerDetailsContext): PlayerDetailsContext["fragments"] {
    const r = details.resolved;

    const partsHeadline: string[] = [];
    const archetypeFrag = pickFragment(r?.archetype ?? null, details.archetype);
    const goal = details.main_goal?.trim() ? `Objectif: ${details.main_goal.trim()}` : null;

    if (archetypeFrag) partsHeadline.push(archetypeFrag);
    if (goal) partsHeadline.push(goal);

    const partsPlaystyle: string[] = [];
    const lr = pickFragment(r?.life_rhythm ?? null, details.life_rhythm);
    const ep = pickFragment(r?.energy_peak ?? null, details.energy_peak);
    const dt = pickFragment(r?.daily_time_budget ?? null, details.daily_time_budget);
    const es = pickFragment(r?.effort_style ?? null, details.effort_style);
    const cp = pickFragment(r?.challenge_preference ?? null, details.challenge_preference);

    if (lr) partsPlaystyle.push(lr);
    if (ep) partsPlaystyle.push(ep);
    if (dt) partsPlaystyle.push(dt);
    if (es) partsPlaystyle.push(es);
    if (cp) partsPlaystyle.push(cp);

    const partsMotivators: string[] = [];
    const mp = pickFragment(r?.motivation_primary ?? null, details.motivation_primary);
    if (mp) partsMotivators.push(mp);

    const valuesFrags = pickManyFragments(r?.values ?? null, details.values);
    if (valuesFrags?.length) partsMotivators.push(`Valeurs: ${valuesFrags.join(" · ")}`);

    const wantsFrags = pickManyFragments(r?.wants ?? null, details.wants);
    if (wantsFrags?.length) partsMotivators.push(`Recherche: ${wantsFrags.join(" · ")}`);

    const partsBlockers: string[] = [];
    const fr = pickFragment(r?.failure_response ?? null, details.failure_response);
    const ar = pickFragment(r?.authority_relation ?? null, details.authority_relation);
    if (fr) partsBlockers.push(fr);
    if (ar) partsBlockers.push(ar);

    const avoidsFrags = pickManyFragments(r?.avoids ?? null, details.avoids);
    if (avoidsFrags?.length) partsBlockers.push(`Évite: ${avoidsFrags.join(" · ")}`);

    const partsSymbolism: string[] = [];
    const sr = pickFragment(r?.symbolism_relation ?? null, details.symbolism_relation);
    if (sr) partsSymbolism.push(sr);

    const reFrags = pickManyFragments(r?.resonant_elements ?? null, details.resonant_elements);
    if (reFrags?.length) partsSymbolism.push(`Résonances: ${reFrags.join(" · ")}`);

    return {
        headline: partsHeadline.length ? partsHeadline.join(" • ") : null,
        playstyle: partsPlaystyle.length ? partsPlaystyle.join(" • ") : null,
        motivators: partsMotivators.length ? partsMotivators.join(" • ") : null,
        blockers: partsBlockers.length ? partsBlockers.join(" • ") : null,
        symbolism: partsSymbolism.length ? partsSymbolism.join(" • ") : null,
    };
}

/* ============================================================================
🧠 MAIN
============================================================================ */

export async function getPlayerWithDetailsContext(
    args: GetPlayerWithDetailsContextArgs
): Promise<PlayerWithDetailsContextResult> {
    const startedAt = Date.now();
    const t = Log.timer("getPlayerWithDetailsContext", {
        source: "lib/ai/context/getPlayerWithDetailsContext.ts",
    });

    const resolveOptions = args.resolve_options ?? true;

    try {
        Log.debug("player_with_details_context.start", {
            metadata: {
                mode: args.mode,
                user_id: "user_id" in args ? args.user_id : null,
                resolve_options: resolveOptions,
            },
        });

        // ------------------------------------------------------------
        // SERVER MODE (admin): user_id requis
        // ------------------------------------------------------------
        if (args.mode === "server") {
            const userId = (args.user_id ?? "").trim();
            if (!userId) {
                Log.warning("player_with_details_context.server.missing_user_id", {
                    status_code: 400,
                });
                t.endError("getPlayerWithDetailsContext.server.bad_request", undefined, {
                    status_code: 400,
                });
                throw new Error("getPlayerWithDetailsContext(server): user_id is required");
            }

            patchRequestContext({ user_id: userId });

            const supabase = supabaseAdmin();

            // 1) user_contexts
            const q0 = Date.now();
            const { data: ctx, error: ctxErr } = await supabase
                .from("user_contexts")
                .select(
                    "context_self,context_family,context_home,context_routine,context_challenges"
                )
                .eq("user_id", userId)
                .maybeSingle();

            if (ctxErr) {
                Log.error("player_with_details_context.server.user_contexts.select.error", ctxErr, {
                    status_code: 500,
                    metadata: { ms: msSince(q0), user_id: userId },
                });
                t.endError("getPlayerWithDetailsContext.server.user_contexts_failed", ctxErr, {
                    status_code: 500,
                });
                throw new Error(ctxErr.message);
            }

            // 2) player_profiles.display_name
            const q1 = Date.now();
            const { data: pp, error: ppErr } = await supabase
                .from("player_profiles")
                .select("display_name")
                .eq("user_id", userId)
                .maybeSingle();

            if (ppErr) {
                Log.error(
                    "player_with_details_context.server.player_profiles.select.error",
                    ppErr,
                    {
                        status_code: 500,
                        metadata: { ms: msSince(q1), user_id: userId },
                    }
                );
                t.endError("getPlayerWithDetailsContext.server.player_profiles_failed", ppErr, {
                    status_code: 500,
                });
                throw new Error(ppErr.message);
            }

            // 3) player_profile_details
            const q2 = Date.now();
            const { data: det, error: detErr } = await supabase
                .from("player_profile_details")
                .select(
                    [
                        "gender",
                        "birth_date",
                        "locale",
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
                    ].join(",")
                )
                .eq("user_id", userId)
                .maybeSingle();

            if (detErr) {
                Log.error(
                    "player_with_details_context.server.player_profile_details.select.error",
                    detErr,
                    {
                        status_code: 500,
                        metadata: { ms: msSince(q2), user_id: userId },
                    }
                );
                t.endError(
                    "getPlayerWithDetailsContext.server.player_profile_details_failed",
                    detErr,
                    { status_code: 500 }
                );
                throw new Error(detErr.message);
            }

            // 4) profile_option_refs (optional resolve)
            let optionMap: Record<string, Record<string, OptionRow>> | null = null;

            if (resolveOptions) {
                const q3 = Date.now();
                const { data: opts, error: optsErr } = await supabase
                    .from("profile_option_refs")
                    .select("field_key,value_key,label,emoji,description,context_fragment")
                    .eq("is_active", true);

                if (optsErr) {
                    Log.error(
                        "player_with_details_context.server.profile_option_refs.select.error",
                        optsErr,
                        { status_code: 500, metadata: { ms: msSince(q3), user_id: userId } }
                    );
                    // non bloquant: on continue sans resolve
                    optionMap = null;
                } else {
                    const m: Record<string, Record<string, OptionRow>> = {};
                    for (const r of (opts ?? []) as OptionRow[]) {
                        if (!m[r.field_key]) m[r.field_key] = {};
                        m[r.field_key]![r.value_key] = r;
                    }
                    optionMap = m;
                }
            }

            if (!ctx && !pp && !det) {
                Log.warning("player_with_details_context.server.not_found", {
                    status_code: 404,
                    metadata: { user_id: userId, ms: msSince(q0) },
                });
                t.endSuccess("getPlayerWithDetailsContext.server.not_found", { status_code: 200 });
                return null;
            }

            const details: PlayerDetailsContext | null = det
                ? {
                      gender: (det as any).gender ?? null,
                      birth_date: (det as any).birth_date ?? null,
                      locale: (det as any).locale ?? null,
                      country_code: (det as any).country_code ?? null,
                      main_goal: (det as any).main_goal ?? null,

                      wants: ((det as any).wants ?? []) as string[],
                      avoids: ((det as any).avoids ?? []) as string[],
                      values: ((det as any).values ?? []) as string[],
                      resonant_elements: ((det as any).resonant_elements ?? []) as string[],

                      life_rhythm: (det as any).life_rhythm ?? null,
                      energy_peak: (det as any).energy_peak ?? null,
                      daily_time_budget: (det as any).daily_time_budget ?? null,

                      effort_style: (det as any).effort_style ?? null,
                      challenge_preference: (det as any).challenge_preference ?? null,
                      motivation_primary: (det as any).motivation_primary ?? null,

                      failure_response: (det as any).failure_response ?? null,
                      authority_relation: (det as any).authority_relation ?? null,
                      symbolism_relation: (det as any).symbolism_relation ?? null,

                      archetype: (det as any).archetype ?? null,
                      extra: ((det as any).extra ?? {}) as Record<string, any>,
                  }
                : null;

            if (details && optionMap) {
                details.resolved = {
                    gender: resolveOne(optionMap, "gender", details.gender),
                    life_rhythm: resolveOne(optionMap, "life_rhythm", details.life_rhythm),
                    energy_peak: resolveOne(optionMap, "energy_peak", details.energy_peak),
                    daily_time_budget: resolveOne(
                        optionMap,
                        "daily_time_budget",
                        details.daily_time_budget
                    ),

                    effort_style: resolveOne(optionMap, "effort_style", details.effort_style),
                    challenge_preference: resolveOne(
                        optionMap,
                        "challenge_preference",
                        details.challenge_preference
                    ),
                    motivation_primary: resolveOne(
                        optionMap,
                        "motivation_primary",
                        details.motivation_primary
                    ),

                    failure_response: resolveOne(
                        optionMap,
                        "failure_response",
                        details.failure_response
                    ),
                    authority_relation: resolveOne(
                        optionMap,
                        "authority_relation",
                        details.authority_relation
                    ),
                    symbolism_relation: resolveOne(
                        optionMap,
                        "symbolism_relation",
                        details.symbolism_relation
                    ),

                    archetype: resolveOne(optionMap, "archetype", details.archetype),

                    wants: resolveMany(optionMap, "wants", details.wants),
                    avoids: resolveMany(optionMap, "avoids", details.avoids),
                    values: resolveMany(optionMap, "values", details.values),
                    resonant_elements: resolveMany(
                        optionMap,
                        "resonant_elements",
                        details.resonant_elements
                    ),
                };

                details.fragments = makeFragments(details);
            } else if (details) {
                details.fragments = makeFragments(details);
            }

            Log.success("player_with_details_context.server.ok", {
                status_code: 200,
                metadata: {
                    user_id: userId,
                    ms_user_contexts: msSince(q0),
                    ms_player_profiles: msSince(q1),
                    ms_player_profile_details: msSince(q2),
                    has_contexts: !!ctx,
                    has_display_name: !!pp?.display_name,
                    has_details: !!det,
                    resolved_options: !!optionMap,
                },
            });

            t.endSuccess("getPlayerWithDetailsContext.server.success", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });

            return {
                player_display_name: (pp?.display_name ?? null) as string | null,
                player_context_self: (ctx?.context_self ?? null) as string | null,
                player_context_family: (ctx?.context_family ?? null) as string | null,
                player_context_home: (ctx?.context_home ?? null) as string | null,
                player_context_routine: (ctx?.context_routine ?? null) as string | null,
                player_context_challenges: (ctx?.context_challenges ?? null) as string | null,
                player_details: details,
            };
        }

        // ------------------------------------------------------------
        // AUTHENTICATED MODE
        // ------------------------------------------------------------
        const supabase = await supabaseServer();

        let userId = (args.user_id ?? "").trim();

        if (!userId) {
            const { data: auth, error: authErr } = await supabase.auth.getUser();

            if (authErr) {
                Log.warning("player_with_details_context.auth.auth_error", {
                    status_code: 401,
                    metadata: { detail: authErr.message },
                });
                t.endError("getPlayerWithDetailsContext.auth.not_authenticated", authErr, {
                    status_code: 401,
                });
                return null;
            }

            userId = auth?.user?.id ?? "";
        }

        if (!userId) {
            Log.warning("player_with_details_context.auth.no_user", { status_code: 401 });
            t.endError("getPlayerWithDetailsContext.auth.no_user", undefined, { status_code: 401 });
            return null;
        }

        patchRequestContext({ user_id: userId });

        // 1) user_contexts
        const q0 = Date.now();
        const { data: ctx, error: ctxErr } = await supabase
            .from("user_contexts")
            .select("context_self,context_family,context_home,context_routine,context_challenges")
            .eq("user_id", userId)
            .maybeSingle();

        if (ctxErr) {
            Log.error("player_with_details_context.auth.user_contexts.select.error", ctxErr, {
                status_code: 500,
                metadata: { ms: msSince(q0), user_id: userId },
            });
            t.endError("getPlayerWithDetailsContext.auth.user_contexts_failed", ctxErr, {
                status_code: 500,
            });
            throw new Error(ctxErr.message);
        }

        // 2) player_profiles.display_name
        const q1 = Date.now();
        const { data: pp, error: ppErr } = await supabase
            .from("player_profiles")
            .select("display_name")
            .eq("user_id", userId)
            .maybeSingle();

        if (ppErr) {
            Log.error("player_with_details_context.auth.player_profiles.select.error", ppErr, {
                status_code: 500,
                metadata: { ms: msSince(q1), user_id: userId },
            });
            t.endError("getPlayerWithDetailsContext.auth.player_profiles_failed", ppErr, {
                status_code: 500,
            });
            throw new Error(ppErr.message);
        }

        // 3) player_profile_details
        const q2 = Date.now();
        const { data: det, error: detErr } = await supabase
            .from("player_profile_details")
            .select(
                [
                    "gender",
                    "birth_date",
                    "locale",
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
                ].join(",")
            )
            .eq("user_id", userId)
            .maybeSingle();

        if (detErr) {
            Log.error(
                "player_with_details_context.auth.player_profile_details.select.error",
                detErr,
                { status_code: 500, metadata: { ms: msSince(q2), user_id: userId } }
            );
            t.endError("getPlayerWithDetailsContext.auth.player_profile_details_failed", detErr, {
                status_code: 500,
            });
            throw new Error(detErr.message);
        }

        // 4) profile_option_refs (optional resolve)
        let optionMap: Record<string, Record<string, OptionRow>> | null = null;

        if (resolveOptions) {
            const q3 = Date.now();
            const { data: opts, error: optsErr } = await supabase
                .from("profile_option_refs")
                .select("field_key,value_key,label,emoji,description")
                .eq("is_active", true);

            if (optsErr) {
                Log.error(
                    "player_with_details_context.auth.profile_option_refs.select.error",
                    optsErr,
                    {
                        status_code: 500,
                        metadata: { ms: msSince(q3), user_id: userId },
                    }
                );
                // non bloquant
                optionMap = null;
            } else {
                const m: Record<string, Record<string, OptionRow>> = {};
                for (const r of (opts ?? []) as OptionRow[]) {
                    if (!m[r.field_key]) m[r.field_key] = {};
                    m[r.field_key]![r.value_key] = r;
                }
                optionMap = m;
            }
        }

        if (!ctx && !pp && !det) {
            Log.warning("player_with_details_context.auth.not_found", {
                status_code: 404,
                metadata: { user_id: userId, ms: msSince(q0) },
            });
            t.endSuccess("getPlayerWithDetailsContext.auth.not_found", { status_code: 200 });
            return null;
        }

        const details: PlayerDetailsContext | null = det
            ? {
                  gender: (det as any).gender ?? null,
                  birth_date: (det as any).birth_date ?? null,
                  locale: (det as any).locale ?? null,
                  country_code: (det as any).country_code ?? null,
                  main_goal: (det as any).main_goal ?? null,

                  wants: ((det as any).wants ?? []) as string[],
                  avoids: ((det as any).avoids ?? []) as string[],
                  values: ((det as any).values ?? []) as string[],
                  resonant_elements: ((det as any).resonant_elements ?? []) as string[],

                  life_rhythm: (det as any).life_rhythm ?? null,
                  energy_peak: (det as any).energy_peak ?? null,
                  daily_time_budget: (det as any).daily_time_budget ?? null,

                  effort_style: (det as any).effort_style ?? null,
                  challenge_preference: (det as any).challenge_preference ?? null,
                  motivation_primary: (det as any).motivation_primary ?? null,

                  failure_response: (det as any).failure_response ?? null,
                  authority_relation: (det as any).authority_relation ?? null,
                  symbolism_relation: (det as any).symbolism_relation ?? null,

                  archetype: (det as any).archetype ?? null,
                  extra: ((det as any).extra ?? {}) as Record<string, any>,
              }
            : null;

        if (details && optionMap) {
            details.resolved = {
                gender: resolveOne(optionMap, "gender", details.gender),
                life_rhythm: resolveOne(optionMap, "life_rhythm", details.life_rhythm),
                energy_peak: resolveOne(optionMap, "energy_peak", details.energy_peak),
                daily_time_budget: resolveOne(
                    optionMap,
                    "daily_time_budget",
                    details.daily_time_budget
                ),

                effort_style: resolveOne(optionMap, "effort_style", details.effort_style),
                challenge_preference: resolveOne(
                    optionMap,
                    "challenge_preference",
                    details.challenge_preference
                ),
                motivation_primary: resolveOne(
                    optionMap,
                    "motivation_primary",
                    details.motivation_primary
                ),

                failure_response: resolveOne(
                    optionMap,
                    "failure_response",
                    details.failure_response
                ),
                authority_relation: resolveOne(
                    optionMap,
                    "authority_relation",
                    details.authority_relation
                ),
                symbolism_relation: resolveOne(
                    optionMap,
                    "symbolism_relation",
                    details.symbolism_relation
                ),

                archetype: resolveOne(optionMap, "archetype", details.archetype),

                wants: resolveMany(optionMap, "wants", details.wants),
                avoids: resolveMany(optionMap, "avoids", details.avoids),
                values: resolveMany(optionMap, "values", details.values),
                resonant_elements: resolveMany(
                    optionMap,
                    "resonant_elements",
                    details.resonant_elements
                ),
            };

            details.fragments = makeFragments(details);
        } else if (details) {
            details.fragments = makeFragments(details);
        }

        Log.success("player_with_details_context.auth.ok", {
            status_code: 200,
            metadata: {
                user_id: userId,
                ms_user_contexts: msSince(q0),
                ms_player_profiles: msSince(q1),
                ms_player_profile_details: msSince(q2),
                has_contexts: !!ctx,
                has_display_name: !!pp?.display_name,
                has_details: !!det,
                resolved_options: !!optionMap,
            },
        });

        t.endSuccess("getPlayerWithDetailsContext.auth.success", {
            status_code: 200,
            metadata: { duration_ms: msSince(startedAt) },
        });

        return {
            player_display_name: (pp?.display_name ?? null) as string | null,
            player_context_self: (ctx?.context_self ?? null) as string | null,
            player_context_family: (ctx?.context_family ?? null) as string | null,
            player_context_home: (ctx?.context_home ?? null) as string | null,
            player_context_routine: (ctx?.context_routine ?? null) as string | null,
            player_context_challenges: (ctx?.context_challenges ?? null) as string | null,
            player_details: details,
        };
    } catch (e) {
        Log.error("player_with_details_context.fatal", e, {
            status_code: 500,
            metadata: { duration_ms: msSince(startedAt) },
        });
        t.endError("getPlayerWithDetailsContext.fatal", e, { status_code: 500 });
        throw e;
    }
}
