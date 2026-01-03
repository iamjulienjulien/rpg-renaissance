// src/lib/ai/context/getAdventureContext.ts
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

// ✅ logs
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

export type AdventureContextMode = "authenticated" | "server";

export type AdventureContextResult = {
    adventure_title: string;
    adventure_description: string | null;
    adventure_context: string | null;
} | null;

type AuthenticatedArgs = {
    mode: "authenticated";
    adventure_id?: string | null;
};

type ServerArgs = {
    mode: "server";
    adventure_id: string;
};

export type GetAdventureContextArgs = AuthenticatedArgs | ServerArgs;

/* ============================================================================
🧠 MAIN
============================================================================ */

export async function getAdventureContext(
    args: GetAdventureContextArgs
): Promise<AdventureContextResult> {
    const startedAt = Date.now();
    const t = Log.timer("getAdventureContext", {
        source: "lib/ai/context/getAdventureContext.ts",
    });

    try {
        Log.debug("adventure_context.start", {
            metadata: {
                mode: args.mode,
                adventure_id: "adventure_id" in args ? args.adventure_id : null,
            },
        });

        // ------------------------------------------------------------
        // SERVER MODE (admin): adventure_id requis
        // ------------------------------------------------------------
        if (args.mode === "server") {
            const adventureId = (args.adventure_id ?? "").trim();
            if (!adventureId) {
                Log.warning("adventure_context.server.missing_adventure_id", {
                    status_code: 400,
                });
                t.endError("getAdventureContext.server.bad_request", undefined, {
                    status_code: 400,
                });
                throw new Error("getAdventureContext(server): adventure_id is required");
            }

            const supabase = supabaseAdmin();

            const q0 = Date.now();
            const { data, error } = await supabase
                .from("adventures")
                .select("id,title,description,context_text,session_id")
                .eq("id", adventureId)
                .maybeSingle();

            if (error) {
                Log.error("adventure_context.server.select.error", error, {
                    status_code: 500,
                    metadata: { ms: msSince(q0), adventure_id: adventureId },
                });
                t.endError("getAdventureContext.server.select_failed", error, {
                    status_code: 500,
                });
                throw new Error(error.message);
            }

            if (!data?.id) {
                Log.warning("adventure_context.server.not_found", {
                    status_code: 404,
                    metadata: { ms: msSince(q0), adventure_id: adventureId },
                });
                t.endSuccess("getAdventureContext.server.not_found", { status_code: 200 });
                return null;
            }

            // (optionnel) utile côté logs: rattacher session
            if (data.session_id) patchRequestContext({ session_id: data.session_id });

            Log.success("adventure_context.server.ok", {
                status_code: 200,
                metadata: { ms: msSince(q0), adventure_id: data.id },
            });

            t.endSuccess("getAdventureContext.server.success", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });

            return {
                adventure_title: data.title,
                adventure_description: data.description ?? null,
                adventure_context: data.context_text ?? null,
            };
        }

        // ------------------------------------------------------------
        // AUTHENTICATED MODE (server client): session active requise
        // ------------------------------------------------------------
        const supabase = await supabaseServer();

        // ✅ session active (auth + patch context auto)
        const session = await getActiveSessionOrThrow();
        patchRequestContext({ session_id: session.id });

        const forcedId = (args.adventure_id ?? "").trim();
        const q0 = Date.now();

        // 1) si on force adventure_id -> fetch par id
        if (forcedId) {
            const { data, error } = await supabase
                .from("adventures")
                .select("id,title,description,context_text,session_id")
                .eq("id", forcedId)
                .maybeSingle();

            if (error) {
                Log.error("adventure_context.auth.select_by_id.error", error, {
                    status_code: 500,
                    metadata: { ms: msSince(q0), adventure_id: forcedId },
                });
                t.endError("getAdventureContext.auth.select_by_id_failed", error, {
                    status_code: 500,
                });
                throw new Error(error.message);
            }

            if (!data?.id) {
                Log.warning("adventure_context.auth.select_by_id.not_found", {
                    status_code: 404,
                    metadata: { ms: msSince(q0), adventure_id: forcedId },
                });
                t.endSuccess("getAdventureContext.auth.not_found", { status_code: 200 });
                return null;
            }

            // 🔒 sécurité: l'aventure forcée doit appartenir à la session active
            if (data.session_id !== session.id) {
                Log.warning("adventure_context.auth.forbidden.session_mismatch", {
                    status_code: 403,
                    metadata: {
                        ms: msSince(q0),
                        adventure_id: data.id,
                        session_id: session.id,
                        adventure_session_id: data.session_id,
                    },
                });
                t.endError("getAdventureContext.auth.forbidden", undefined, {
                    status_code: 403,
                });
                throw new Error("Forbidden: adventure does not belong to active session");
            }

            Log.success("adventure_context.auth.ok_forced", {
                status_code: 200,
                metadata: { ms: msSince(q0), adventure_id: data.id },
            });

            t.endSuccess("getAdventureContext.auth.success", {
                status_code: 200,
                metadata: { duration_ms: msSince(startedAt) },
            });

            return {
                adventure_title: data.title,
                adventure_description: data.description ?? null,
                adventure_context: data.context_text ?? null,
            };
        }

        // 2) sinon: fetch via session_id (comportement actuel, mais enrichi)
        const { data, error } = await supabase
            .from("adventures")
            .select("id,title,description,context_text")
            .eq("session_id", session.id)
            .maybeSingle();

        if (error) {
            Log.error("adventure_context.auth.select_by_session.error", error, {
                status_code: 500,
                metadata: { ms: msSince(q0), session_id: session.id },
            });
            t.endError("getAdventureContext.auth.select_by_session_failed", error, {
                status_code: 500,
            });
            throw new Error(error.message);
        }

        if (!data?.id) {
            Log.warning("adventure_context.auth.select_by_session.not_found", {
                status_code: 404,
                metadata: { ms: msSince(q0), session_id: session.id },
            });
            t.endSuccess("getAdventureContext.auth.not_found", { status_code: 200 });
            return null;
        }

        Log.success("adventure_context.auth.ok", {
            status_code: 200,
            metadata: { ms: msSince(q0), adventure_id: data.id },
        });

        t.endSuccess("getAdventureContext.auth.success", {
            status_code: 200,
            metadata: { duration_ms: msSince(startedAt) },
        });

        return {
            adventure_title: data.title,
            adventure_description: data.description ?? null,
            adventure_context: data.context_text ?? null,
        };
    } catch (e) {
        Log.error("adventure_context.fatal", e, {
            status_code: 500,
            metadata: { duration_ms: msSince(startedAt) },
        });
        t.endError("getAdventureContext.fatal", e, { status_code: 500 });
        throw e;
    }
}
