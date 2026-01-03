// src/lib/ai/context/getCharacterContext.ts
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

export type CharacterContextMode = "authenticated" | "server";

export type CharacterContextResult = {
    character_name: string | null;
    character_emoji: string | null;
    character_kind: string | null;
    character_archetype: string | null;
    character_vibe: string | null;
    character_motto: string | null;
    character_tone: string | null; // ai_style.tone
    character_style: string | null; // ai_style.style
    character_verbosity: string | null; // ai_style.verbosity
} | null;

type AuthenticatedArgs = {
    mode: "authenticated";
    /** optionnel: forcer un user_id (sinon => auth.user.id) */
    user_id?: string | null;
};

type ServerArgs = {
    mode: "server";
    /** requis en mode server */
    user_id: string;
};

export type GetCharacterContextArgs = AuthenticatedArgs | ServerArgs;

/* ============================================================================
🧠 MAIN
============================================================================ */

export async function getCharacterContext(
    args: GetCharacterContextArgs
): Promise<CharacterContextResult> {
    const startedAt = Date.now();
    const t = Log.timer("getCharacterContext", {
        source: "lib/ai/context/getCharacterContext.ts",
    });

    try {
        Log.debug("character_context.start", {
            metadata: {
                mode: args.mode,
                user_id: "user_id" in args ? args.user_id : null,
            },
        });

        // ------------------------------------------------------------
        // resolve user_id
        // ------------------------------------------------------------
        let userId = "";

        if (args.mode === "server") {
            userId = (args.user_id ?? "").trim();
            if (!userId) {
                Log.warning("character_context.server.missing_user_id", {
                    status_code: 400,
                });
                t.endError("getCharacterContext.server.bad_request", undefined, {
                    status_code: 400,
                });
                throw new Error("getCharacterContext(server): user_id is required");
            }
        } else {
            userId = (args.user_id ?? "").trim();

            if (!userId) {
                const supabase = await supabaseServer();
                const { data: auth, error: authErr } = await supabase.auth.getUser();

                if (authErr) {
                    Log.warning("character_context.auth.auth_error", {
                        status_code: 401,
                        metadata: { detail: authErr.message },
                    });
                    t.endError("getCharacterContext.auth.not_authenticated", authErr, {
                        status_code: 401,
                    });
                    return null;
                }

                userId = auth?.user?.id ?? "";
            }

            if (!userId) {
                Log.warning("character_context.auth.no_user", { status_code: 401 });
                t.endError("getCharacterContext.auth.no_user", undefined, { status_code: 401 });
                return null;
            }
        }

        patchRequestContext({ user_id: userId });

        // ------------------------------------------------------------
        // choose client
        // ------------------------------------------------------------
        const supabase = args.mode === "server" ? supabaseAdmin() : await supabaseServer();

        // ------------------------------------------------------------
        // 1) player_profiles -> character_id
        // ------------------------------------------------------------
        const q0 = Date.now();
        const { data: pp, error: ppErr } = await supabase
            .from("player_profiles")
            .select("character_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (ppErr) {
            Log.error("character_context.player_profiles.select.error", ppErr, {
                status_code: 500,
                metadata: { ms: msSince(q0), user_id: userId },
            });
            t.endError("getCharacterContext.player_profiles_failed", ppErr, {
                status_code: 500,
            });
            throw new Error(ppErr.message);
        }

        const characterId = (pp?.character_id ?? "") as string;
        if (!characterId) {
            Log.warning("character_context.no_character_id", {
                status_code: 200,
                metadata: { user_id: userId, ms: msSince(q0) },
            });
            t.endSuccess("getCharacterContext.no_character", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });
            return null;
        }

        patchRequestContext({ metadata: { character_id: characterId } } as any);

        // ------------------------------------------------------------
        // 2) characters -> full context
        // ------------------------------------------------------------
        const q1 = Date.now();
        const { data: ch, error: chErr } = await supabase
            .from("characters")
            .select("name,emoji,kind,archetype,vibe,motto,ai_style")
            .eq("id", characterId)
            .maybeSingle();

        if (chErr) {
            Log.error("character_context.characters.select.error", chErr, {
                status_code: 500,
                metadata: { ms: msSince(q1), user_id: userId, character_id: characterId },
            });
            t.endError("getCharacterContext.characters_failed", chErr, {
                status_code: 500,
            });
            throw new Error(chErr.message);
        }

        if (!ch) {
            Log.warning("character_context.characters.not_found", {
                status_code: 404,
                metadata: { user_id: userId, character_id: characterId, ms: msSince(q1) },
            });
            t.endSuccess("getCharacterContext.not_found", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });
            return null;
        }

        const ai = (ch.ai_style ?? {}) as any;

        Log.success("character_context.ok", {
            status_code: 200,
            metadata: {
                user_id: userId,
                character_id: characterId,
                ms_player_profiles: msSince(q0),
                ms_characters: msSince(q1),
                has_ai_style: !!ch.ai_style,
            },
        });

        t.endSuccess("getCharacterContext.success", {
            status_code: 200,
            metadata: { duration_ms: msSince(startedAt) },
        });

        return {
            character_name: (ch.name ?? null) as string | null,
            character_emoji: (ch.emoji ?? null) as string | null,
            character_kind: (ch.kind ?? null) as string | null,
            character_archetype: (ch.archetype ?? null) as string | null,
            character_vibe: (ch.vibe ?? null) as string | null,
            character_motto: (ch.motto ?? null) as string | null,
            character_tone: typeof ai?.tone === "string" ? ai.tone : null,
            character_style: typeof ai?.style === "string" ? ai.style : null,
            character_verbosity: typeof ai?.verbosity === "string" ? ai.verbosity : null,
        };
    } catch (e) {
        Log.error("character_context.fatal", e, {
            status_code: 500,
            metadata: { duration_ms: msSince(startedAt) },
        });
        t.endError("getCharacterContext.fatal", e, { status_code: 500 });
        throw e;
    }
}
