import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// ✅ System logs + request context
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

/* ============================================================================
GET /api/player
============================================================================ */
export async function GET(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/player";
    const method = "GET";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("GET /api/player", {
                source: "app/api/player/route.ts",
            });

            try {
                Log.info("player.GET.start", {
                    metadata: {
                        url: req.nextUrl?.toString?.() ?? null,
                    },
                });

                const supabase = await supabaseServer();

                /* ------------------------------------------------------------------
                 * Auth
                 * ------------------------------------------------------------------ */
                const a0 = Date.now();
                const { data: auth, error: authErr } = await supabase.auth.getUser();

                if (authErr || !auth?.user?.id) {
                    Log.warning("player.GET.auth.failed", {
                        status_code: 401,
                        metadata: { ms: msSince(a0) },
                    });
                    t.endError("GET /api/player.unauthorized", authErr, {
                        status_code: 401,
                    });
                    return jsonError("Not authenticated", 401);
                }

                const user_id = auth.user.id;
                const email = auth.user.email ?? null;
                patchRequestContext({ user_id });

                Log.debug("player.GET.auth.ok", {
                    metadata: { ms: msSince(a0), user_id },
                });

                /* ------------------------------------------------------------------
                 * user_profiles
                 * ------------------------------------------------------------------ */
                const qProfile = Date.now();
                const { data: profile, error: profileErr } = await supabase
                    .from("user_profiles")
                    .select("first_name,last_name,avatar_url,locale,onboarding_done,created_at")
                    .eq("user_id", user_id)
                    .maybeSingle();

                if (profileErr) {
                    Log.error("player.GET.user_profiles.error", profileErr, {
                        status_code: 500,
                        metadata: { ms: msSince(qProfile) },
                    });
                    t.endError("GET /api/player.user_profiles_failed", profileErr, {
                        status_code: 500,
                    });
                    return jsonError("Failed to fetch user_profiles", 500);
                }

                Log.debug("player.GET.user_profiles.ok", {
                    metadata: { ms: msSince(qProfile), found: !!profile },
                });

                /* ------------------------------------------------------------------
                 * player_profiles
                 * ------------------------------------------------------------------ */
                const qPP = Date.now();
                const { data: playerProfile, error: ppErr } = await supabase
                    .from("player_profiles")
                    .select("character_id,display_name")
                    .eq("user_id", user_id)
                    .maybeSingle();

                if (ppErr) {
                    Log.error("player.GET.player_profiles.error", ppErr, {
                        status_code: 500,
                        metadata: { ms: msSince(qPP) },
                    });
                    t.endError("GET /api/player.player_profiles_failed", ppErr, {
                        status_code: 500,
                    });
                    return jsonError("Failed to fetch player_profiles", 500);
                }

                Log.debug("player.GET.player_profiles.ok", {
                    metadata: { ms: msSince(qPP), has_character: !!playerProfile?.character_id },
                });

                /* ------------------------------------------------------------------
                 * player_profile_details
                 * ------------------------------------------------------------------ */
                const qPPD = Date.now();
                const { data: details, error: ppdErr } = await supabase
                    .from("player_profile_details")
                    .select(
                        `
                            gender,
                            birth_date,
                            locale,
                            country_code,
                            main_goal,
                            wants,
                            avoids,
                            life_rhythm,
                            energy_peak,
                            daily_time_budget,
                            effort_style,
                            challenge_preference,
                            motivation_primary,
                            failure_response,
                            values,
                            authority_relation,
                            archetype,
                            symbolism_relation,
                            resonant_elements,
                            extra,
                            created_at,
                            updated_at
                        `
                    )
                    .eq("user_id", user_id)
                    .maybeSingle();

                if (ppdErr) {
                    Log.error("player.GET.player_profile_details.error", ppdErr, {
                        status_code: 500,
                        metadata: { ms: msSince(qPPD) },
                    });
                    t.endError("GET /api/player.player_profile_details_failed", ppdErr, {
                        status_code: 500,
                    });
                    return jsonError("Failed to fetch player_profile_details", 500);
                }

                Log.debug("player.GET.player_profile_details.ok", {
                    metadata: { ms: msSince(qPPD), found: !!details },
                });

                /* ------------------------------------------------------------------
                 * character
                 * ------------------------------------------------------------------ */
                let character: any = null;

                if (playerProfile?.character_id) {
                    const qChar = Date.now();
                    const { data: ch, error: chErr } = await supabase
                        .from("characters")
                        .select("id,code,name,emoji,kind,archetype,vibe,motto,ai_style")
                        .eq("id", playerProfile.character_id)
                        .maybeSingle();

                    if (chErr) {
                        Log.error("player.GET.character.error", chErr, {
                            status_code: 500,
                            metadata: {
                                ms: msSince(qChar),
                                character_id: playerProfile.character_id,
                            },
                        });
                        t.endError("GET /api/player.character_failed", chErr, {
                            status_code: 500,
                        });
                        return jsonError("Failed to fetch character", 500);
                    }

                    character = ch
                        ? {
                              character_id: ch.id,
                              code: ch.code,
                              name: ch.name,
                              emoji: ch.emoji,
                              kind: ch.kind,
                              archetype: ch.archetype,
                              vibe: ch.vibe,
                              motto: ch.motto,
                              ai_style: ch.ai_style ?? {},
                          }
                        : null;

                    Log.debug("player.GET.character.ok", {
                        metadata: { ms: msSince(qChar), found: !!ch },
                    });
                }

                /* ------------------------------------------------------------------
                 * contexts
                 * ------------------------------------------------------------------ */
                const qCtx = Date.now();
                const { data: ctxRow, error: ctxErr } = await supabase
                    .from("user_contexts")
                    .select(
                        "context_self,context_family,context_home,context_routine,context_challenges"
                    )
                    .eq("user_id", user_id)
                    .maybeSingle();

                if (ctxErr) {
                    Log.error("player.GET.contexts.error", ctxErr, {
                        status_code: 500,
                        metadata: { ms: msSince(qCtx) },
                    });
                    t.endError("GET /api/player.contexts_failed", ctxErr, {
                        status_code: 500,
                    });
                    return jsonError("Failed to fetch user_contexts", 500);
                }

                /* ------------------------------------------------------------------
                 * active session
                 * ------------------------------------------------------------------ */
                const qSession = Date.now();
                const { data: activeSession, error: sErr } = await supabase
                    .from("game_sessions")
                    .select("id,title,is_active")
                    .eq("user_id", user_id)
                    .eq("is_active", true)
                    .maybeSingle();

                if (sErr) {
                    Log.error("player.GET.active_session.error", sErr, {
                        status_code: 500,
                        metadata: { ms: msSince(qSession) },
                    });
                    t.endError("GET /api/player.session_failed", sErr, {
                        status_code: 500,
                    });
                    return jsonError("Failed to fetch active session", 500);
                }

                if (activeSession?.id) {
                    patchRequestContext({ session_id: activeSession.id });
                }

                /* ------------------------------------------------------------------
                 * renown
                 * ------------------------------------------------------------------ */
                let renown: any = null;

                if (activeSession?.id) {
                    const qRenown = Date.now();
                    const { data: pr, error: rErr } = await supabase
                        .from("player_renown")
                        .select("value,level,updated_at")
                        .eq("user_id", user_id)
                        .eq("session_id", activeSession.id)
                        .maybeSingle();

                    if (rErr) {
                        Log.error("player.GET.renown.error", rErr, {
                            status_code: 500,
                            metadata: { ms: msSince(qRenown) },
                        });
                        t.endError("GET /api/player.renown_failed", rErr, {
                            status_code: 500,
                        });
                        return jsonError("Failed to fetch renown", 500);
                    }

                    if (pr?.level) {
                        const { data: lvl } = await supabase
                            .from("renown_levels_catalog")
                            .select("level,tier,tier_title,level_suffix,full_title,is_milestone")
                            .eq("level", pr.level)
                            .maybeSingle();

                        renown = {
                            value: Number(pr.value ?? 0),
                            updated_at: pr.updated_at ?? null,
                            level: lvl
                                ? {
                                      number: lvl.level,
                                      title: lvl.full_title,
                                      tier: lvl.tier,
                                      tier_title: lvl.tier_title,
                                      level_suffix: lvl.level_suffix,
                                      is_milestone: !!lvl.is_milestone,
                                  }
                                : null,
                        };
                    }
                }

                /* ------------------------------------------------------------------
                 * badges
                 * ------------------------------------------------------------------ */
                const qBadges = Date.now();
                const { data: badgeRows, error: bErr } = await supabase
                    .from("player_badges")
                    .select(
                        `
                        unlocked_at,
                        source,
                        metadata,
                        achievement_badges_catalog:badge_id (
                            code,title,emoji,description
                        )
                    `
                    )
                    .eq("user_id", user_id)
                    .order("unlocked_at", { ascending: false });

                if (bErr) {
                    Log.error("player.GET.badges.error", bErr, {
                        status_code: 500,
                        metadata: { ms: msSince(qBadges) },
                    });
                    t.endError("GET /api/player.badges_failed", bErr, {
                        status_code: 500,
                    });
                    return jsonError("Failed to fetch badges", 500);
                }

                const badges =
                    badgeRows?.map((row: any) => ({
                        code: row.achievement_badges_catalog.code,
                        title: row.achievement_badges_catalog.title,
                        emoji: row.achievement_badges_catalog.emoji,
                        description: row.achievement_badges_catalog.description,
                        unlocked_at: row.unlocked_at,
                        source: row.source,
                        metadata: row.metadata,
                    })) ?? [];

                /* ------------------------------------------------------------------
                 * photos (player_photos) + signed urls
                 * ------------------------------------------------------------------ */
                const qPhotos = Date.now();

                const { data: photoRows, error: photosErr } = await supabase
                    .from("player_photos")
                    .select(
                        "id, kind, bucket, storage_path, mime_type, width, height, is_active, avatar_style, avatar_variant, avatar_format, ai_job_id, ai_model, alt_text, caption, created_at"
                    )
                    .eq("user_id", user_id)
                    .order("created_at", { ascending: false });

                if (photosErr) {
                    Log.error("player.GET.player_photos.error", photosErr, {
                        status_code: 500,
                        metadata: { ms: msSince(qPhotos) },
                    });
                    t.endError("GET /api/player.player_photos_failed", photosErr, {
                        status_code: 500,
                    });
                    return jsonError("Failed to fetch player_photos", 500);
                }

                // Build signed urls (best effort)
                const signedTtlSeconds = 60 * 10; // 10 min (ajuste si tu veux)
                const photos =
                    (photoRows ?? []).map((p: any) => ({
                        id: p.id,
                        kind: p.kind,

                        bucket: p.bucket ?? null,
                        storage_path: p.storage_path ?? null,
                        mime_type: p.mime_type ?? null,

                        width: p.width ?? null,
                        height: p.height ?? null,

                        url: null as string | null,

                        is_active: !!p.is_active,
                        avatar_style: p.avatar_style ?? null,
                        avatar_variant: p.avatar_variant ?? null,
                        avatar_format: p.avatar_format ?? null,

                        ai_job_id: p.ai_job_id ?? null,
                        ai_model: p.ai_model ?? null,

                        alt_text: p.alt_text ?? null,
                        caption: p.caption ?? null,
                        created_at: p.created_at ?? null,
                    })) ?? [];

                for (const ph of photos) {
                    const bucket = ph.bucket || "player-photos";
                    const path = ph.storage_path;

                    if (!path) continue;

                    // 🔐 Portrait source → signed URL
                    if (ph.kind === "portrait_source") {
                        const { data: signed, error: signErr } = await supabase.storage
                            .from(bucket)
                            .createSignedUrl(path, signedTtlSeconds);

                        if (signErr) {
                            Log.warning("player.GET.player_photos.sign_failed", {
                                status_code: 200,
                                metadata: { photo_id: ph.id, bucket, path, error: signErr.message },
                            });
                            continue;
                        }

                        ph.url = signed?.signedUrl ?? null;
                    }

                    // 🌍 Avatar généré → public URL
                    else if (ph.kind === "avatar_generated") {
                        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
                        ph.url = data?.publicUrl ?? null;
                    }
                }

                Log.debug("player.GET.player_photos.ok", {
                    metadata: { ms: msSince(qPhotos), count: photos.length },
                });

                /* ------------------------------------------------------------------
                 * SUCCESS
                 * ------------------------------------------------------------------ */
                Log.success("player.GET.ok", {
                    status_code: 200,
                    metadata: {
                        duration_ms: msSince(startedAt),
                        badges: badges.length,
                        has_character: !!character,
                        has_renown: !!renown,
                    },
                });

                t.endSuccess("GET /api/player.success", { status_code: 200 });

                return NextResponse.json({
                    user_id,
                    email,

                    first_name: profile?.first_name ?? null,
                    last_name: profile?.last_name ?? null,
                    avatar_url: profile?.avatar_url ?? null,
                    locale: profile?.locale ?? null,
                    onboarding_done: !!profile?.onboarding_done,
                    created_at: profile?.created_at ?? null,

                    display_name: playerProfile?.display_name ?? null,

                    details: details ?? null,

                    character,

                    contexts: ctxRow ?? null,
                    renown,
                    badges,

                    photos,

                    active_session: activeSession ?? null,
                });
            } catch (e) {
                Log.error("player.GET.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                t.endError("GET /api/player.fatal", e, { status_code: 500 });
                return jsonError("Server error", 500);
            }
        }
    );
}
