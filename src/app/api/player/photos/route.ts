// src/app/api/player/photos/route.ts
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

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function safeKind(x: unknown): "portrait_source" | "avatar_generated" {
    const v = safeTrim(x);
    if (v === "avatar_generated") return "avatar_generated";
    return "portrait_source";
}

function safeBool(x: unknown): boolean {
    if (x === true) return true;
    if (x === false) return false;
    const v = safeTrim(x).toLowerCase();
    return v === "true" || v === "1" || v === "yes";
}

function extFromMime(mime?: string | null) {
    if (!mime) return "bin";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    return "bin";
}

function nowPathSegment() {
    const d = new Date();
    const yyyy = String(d.getUTCFullYear());
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
}

/* ============================================================================
POST /api/player/photos
- multipart/form-data
- fields:
    - file: File (required)
    - kind: 'portrait_source' | 'avatar_generated' (optional, default portrait_source)
    - caption: string (optional)
    - alt_text: string (optional)
    - set_active: boolean (optional; if true + kind=avatar_generated => mark active + update user_profiles.avatar_url later)
============================================================================ */
export async function POST(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/player/photos";
    const method = "POST";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("POST /api/player/photos", {
                source: "app/api/player/photos/route.ts",
            });

            try {
                Log.info("player_photos.upload.start");

                const supabase = await supabaseServer();

                /* ------------------------------------------------------------
                 1) Auth
                ------------------------------------------------------------ */
                const { data: authData, error: authErr } = await supabase.auth.getUser();

                if (authErr || !authData?.user?.id) {
                    Log.warning("player_photos.upload.unauthorized", { status_code: 401 });
                    t.endError("player_photos.upload.unauthorized", authErr, { status_code: 401 });
                    return jsonError("Unauthorized", 401);
                }

                const user_id = authData.user.id;
                patchRequestContext({ user_id });

                /* ------------------------------------------------------------
                 2) Parse multipart/form-data
                ------------------------------------------------------------ */
                let form: FormData;
                try {
                    form = await req.formData();
                } catch (e: any) {
                    Log.warning("player_photos.upload.invalid_formdata", { status_code: 400 });
                    t.endError("player_photos.upload.invalid_formdata", e, { status_code: 400 });
                    return jsonError("Invalid form-data body", 400);
                }

                const file = form.get("file");
                if (!(file instanceof File)) {
                    Log.warning("player_photos.upload.missing_file", { status_code: 400 });
                    t.endError("player_photos.upload.missing_file", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Missing file", 400);
                }

                const kind = safeKind(form.get("kind"));
                const caption = safeTrim(form.get("caption"));
                const alt_text = safeTrim(form.get("alt_text"));
                const set_active = safeBool(form.get("set_active"));

                // Basic validation
                const mime = file.type || "application/octet-stream";
                if (!mime.startsWith("image/")) {
                    Log.warning("player_photos.upload.bad_mime", {
                        status_code: 400,
                        metadata: { mime },
                    });
                    t.endError("player_photos.upload.bad_mime", undefined, { status_code: 400 });
                    return jsonError("File must be an image", 400);
                }

                const size = file.size ?? 0;
                const maxBytes = 10 * 1024 * 1024; // 10MB (ajuste)
                if (size > maxBytes) {
                    Log.warning("player_photos.upload.too_large", {
                        status_code: 400,
                        metadata: { size },
                    });
                    t.endError("player_photos.upload.too_large", undefined, { status_code: 400 });
                    return jsonError("File too large (max 10MB)", 400);
                }

                /* ------------------------------------------------------------
                 3) Upload to Supabase Storage
                ------------------------------------------------------------ */
                const bucket = "player-photos";
                const ext = extFromMime(mime);
                const filename = `${crypto.randomUUID()}.${ext}`;
                const storage_path = `${user_id}/${nowPathSegment()}/${filename}`;

                const arrayBuffer = await file.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);

                const up0 = Date.now();
                const { error: upErr } = await supabase.storage
                    .from(bucket)
                    .upload(storage_path, bytes, {
                        contentType: mime,
                        upsert: false,
                    });

                if (upErr) {
                    Log.error("player_photos.upload.storage_error", upErr, {
                        status_code: 500,
                        metadata: { bucket, storage_path },
                    });
                    t.endError("player_photos.upload.storage_error", upErr, { status_code: 500 });
                    return jsonError(upErr.message || "Storage upload failed", 500);
                }

                Log.success("player_photos.upload.storage_ok", {
                    status_code: 200,
                    metadata: { ms: Date.now() - up0, bucket, storage_path },
                });

                /* ------------------------------------------------------------
                 4) Insert DB row (player_photos)
                ------------------------------------------------------------ */
                const ins0 = Date.now();
                const { data: created, error: insErr } = await supabase
                    .from("player_photos")
                    .insert({
                        user_id,
                        kind,
                        bucket,
                        storage_path,
                        mime_type: mime,
                        size,
                        caption: caption.trim() ? caption.trim() : null,
                        alt_text: alt_text.trim() ? alt_text.trim() : null,

                        // Pour l'instant, on ne set pas active ici sauf si tu le veux
                        // (utile si tu uploade un avatar généré depuis le worker)
                        is_active: kind === "avatar_generated" ? set_active : false,
                    })
                    .select("*")
                    .single();

                if (insErr) {
                    Log.error("player_photos.upload.db_error", insErr, {
                        status_code: 500,
                        metadata: { storage_path },
                    });
                    t.endError("player_photos.upload.db_error", insErr, { status_code: 500 });

                    // best-effort cleanup storage (évite les orphelins)
                    try {
                        await supabase.storage.from(bucket).remove([storage_path]);
                    } catch {}

                    return jsonError(insErr.message || "DB insert failed", 500);
                }

                Log.success("player_photos.upload.created", {
                    status_code: 201,
                    metadata: { ms: Date.now() - ins0, photo_id: created.id, kind },
                });

                /* ------------------------------------------------------------
                 5) (Optionnel) si avatar_generated + set_active, tu pourras:
                    - désactiver les autres
                    - générer une URL publique/signed
                    - update user_profiles.avatar_url
                 Pour l’instant: on ne le fait pas ici (tu l’avais demandé plus tard côté worker).
                ------------------------------------------------------------ */

                t.endSuccess("player_photos.upload.success", { status_code: 201 });

                return NextResponse.json(
                    {
                        ok: true,
                        photo: created,
                    },
                    { status: 201 }
                );
            } catch (e: any) {
                Log.error("player_photos.upload.fatal", e, { status_code: 500 });
                t.endError("player_photos.upload.fatal", e, { status_code: 500 });
                return jsonError(e?.message ?? "Server error", 500);
            }
        }
    );
}
