// app/api/photos/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";
import { type PhotoCategory } from "@/types/game";
import { generatePhotoQuestMessageForQuest } from "@/lib/questMessages/generatePhotoQuestMessage";

// ✅ System logs + request context
import { Log } from "@/lib/systemLog/Log";
import { withRequestContext, patchRequestContext } from "@/lib/systemLog/requestContext";

/* ============================================================================
🧰 HELPERS
============================================================================ */

const BUCKET = "photos";
const ALLOWED_CATEGORIES = new Set(["initial", "final", "other"]);

function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function toInt(v: string | null, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function toBool(v: any, fallback = false) {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return ["true", "1", "yes", "on"].includes(v.toLowerCase());
    return fallback;
}

function pickExt(filename: string, mime: string | null) {
    const m = filename.toLowerCase().match(/\.([a-z0-9]{2,6})$/);
    const extFromName = m?.[1];

    const mimeMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/heic": "heic",
        "image/heif": "heif",
    };

    const extFromMime = mime ? mimeMap[mime.toLowerCase()] : undefined;
    return extFromName || extFromMime || "jpg";
}

async function getUserIdOrThrow(supabase: any) {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    const uid = data?.user?.id;
    if (!uid) throw new Error("Unauthorized");
    return uid;
}

function categoryEmoji(c: PhotoCategory) {
    if (c === "initial") return "🌅";
    if (c === "final") return "🏁";
    return "✨";
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function safeFileMeta(file: File) {
    return {
        file_name: file?.name ?? null,
        file_type: file?.type ?? null,
        file_size: typeof file?.size === "number" ? file.size : null,
    };
}

/* ============================================================================
GET /api/photos?chapterQuestId=uuid
============================================================================ */
export async function GET(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/photos";
    const method = "GET";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("GET /api/photos", { source: "app/api/photos/route.ts" });

            try {
                Log.info("photos.GET.start", {
                    metadata: {
                        url: req.nextUrl?.toString?.() ?? null,
                        search: Object.fromEntries(req.nextUrl.searchParams.entries()),
                    },
                });

                const supabase = await supabaseServer();

                const session = await getActiveSessionOrThrow();
                patchRequestContext({ session_id: session.id });

                Log.debug("photos.GET.session.ok", {
                    metadata: { session_id: session.id },
                });

                const sp = req.nextUrl.searchParams;
                const chapterQuestId = (sp.get("chapterQuestId") ?? "").trim();
                if (!chapterQuestId) {
                    Log.warning("photos.GET.missing.chapterQuestId", {
                        status_code: 400,
                        metadata: { request_id },
                    });
                    t.endError("GET /api/photos.bad_request", undefined, { status_code: 400 });
                    return jsonError("Missing chapterQuestId", 400);
                }

                patchRequestContext({ chapter_quest_id: chapterQuestId });

                // Vérifie la CQ dans la session active
                const q0 = Date.now();
                const { data: cq, error: cqErr } = await supabase
                    .from("chapter_quests")
                    .select("id, session_id")
                    .eq("id", chapterQuestId)
                    .eq("session_id", session.id)
                    .maybeSingle();

                if (cqErr) {
                    Log.error("photos.GET.cq.check.error", cqErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q0), chapterQuestId, session_id: session.id },
                    });
                    t.endError("GET /api/photos.cq_check_failed", cqErr, { status_code: 500 });
                    return jsonError(cqErr.message, 500);
                }

                if (!cq) {
                    Log.warning("photos.GET.cq.not_found", {
                        status_code: 404,
                        metadata: { ms: msSince(q0), chapterQuestId, session_id: session.id },
                    });
                    t.endError("GET /api/photos.cq_not_found", undefined, { status_code: 404 });
                    return jsonError("Not found", 404);
                }

                const limit = Math.max(6, toInt(sp.get("limit"), 200));

                const q1 = Date.now();
                const { data: rows, error } = await supabase
                    .from("photos")
                    .select(
                        "id,created_at,category,bucket,path,mime_type,size,width,height,caption,is_cover,sort,chapter_quest_id,adventure_quest_id,session_id,user_id,ai_description"
                    )
                    .eq("chapter_quest_id", chapterQuestId)
                    .eq("session_id", session.id)
                    .order("created_at", { ascending: false })
                    .limit(limit);

                if (error) {
                    Log.error("photos.GET.photos.select.error", error, {
                        status_code: 500,
                        metadata: { ms: msSince(q1), chapterQuestId, limit },
                    });
                    t.endError("GET /api/photos.select_failed", error, { status_code: 500 });
                    return jsonError(error.message, 500);
                }

                Log.debug("photos.GET.photos.select.ok", {
                    metadata: { ms: msSince(q1), count: (rows ?? []).length, limit },
                });

                // Signed URLs (30 min)
                const q2 = Date.now();
                const enriched = await Promise.all(
                    (rows ?? []).map(async (p: any) => {
                        const path = p?.path;
                        if (!path) return { ...p, signed_url: null };

                        const { data: signed, error: sErr } = await supabase.storage
                            .from(BUCKET)
                            .createSignedUrl(path, 60 * 30);

                        if (sErr) {
                            Log.warning("photos.GET.signed_url.error", {
                                metadata: {
                                    photo_id: p?.id ?? null,
                                    path,
                                    error: sErr.message ?? String(sErr),
                                },
                            });
                        }

                        return {
                            ...p,
                            signed_url: sErr ? null : (signed?.signedUrl ?? null),
                        };
                    })
                );

                Log.success("photos.GET.ok", {
                    status_code: 200,
                    metadata: { ms: msSince(q2), signed_for: enriched.length },
                });

                t.endSuccess("GET /api/photos.success", { status_code: 200 });

                return NextResponse.json({ rows: enriched });
            } catch (e) {
                Log.error("photos.GET.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                t.endError("GET /api/photos.fatal", e, { status_code: 500 });
                return jsonError("Server error", 500);
            }
        }
    );
}

/* ============================================================================
POST /api/photos
============================================================================ */
export async function POST(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/photos";
    const method = "POST";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("POST /api/photos", { source: "app/api/photos/route.ts" });

            let photoId: string | null = null;
            let objectPath: string | null = null;

            try {
                Log.info("photos.POST.start", {
                    metadata: {
                        url: req.nextUrl?.toString?.() ?? null,
                        content_type: req.headers.get("content-type"),
                    },
                });

                const supabase = await supabaseServer();

                // session active (et patch ctx dans getActiveSession)
                const session = await getActiveSessionOrThrow();
                patchRequestContext({ session_id: session.id });

                Log.debug("photos.POST.session.ok", {
                    metadata: { session_id: session.id, session_title: session.title },
                });

                const userId = await getUserIdOrThrow(supabase).catch((e) => {
                    Log.warning("photos.POST.auth.missing", {
                        status_code: 401,
                        metadata: { error: e instanceof Error ? e.message : String(e) },
                    });
                    return null;
                });

                if (!userId) {
                    t.endError("POST /api/photos.unauthorized", undefined, { status_code: 401 });
                    return jsonError("Unauthorized", 401);
                }

                patchRequestContext({ user_id: userId });

                let form: FormData;
                try {
                    const f0 = Date.now();
                    form = await req.formData();
                    Log.debug("photos.POST.formData.ok", {
                        metadata: { ms: msSince(f0) },
                    });
                } catch (e) {
                    Log.error("photos.POST.formData.invalid", e, {
                        status_code: 400,
                    });
                    t.endError("POST /api/photos.invalid_form", e, { status_code: 400 });
                    return jsonError("Invalid form-data", 400);
                }

                const chapterQuestId = String(form.get("chapter_quest_id") ?? "").trim();
                const category = String(form.get("category") ?? "other").trim();
                const caption = String(form.get("caption") ?? "").trim() || null;

                const sort = toInt(String(form.get("sort") ?? ""), 0);
                const isCover = toBool(form.get("is_cover"), false);

                const width =
                    form.get("width") != null ? toInt(String(form.get("width")), 0) : null;
                const height =
                    form.get("height") != null ? toInt(String(form.get("height")), 0) : null;

                const file = form.get("file");

                Log.debug("photos.POST.input.parsed", {
                    metadata: {
                        chapter_quest_id: chapterQuestId || null,
                        category,
                        caption_present: !!caption,
                        sort,
                        is_cover: isCover,
                        width,
                        height,
                        file_kind: file instanceof File ? "File" : typeof file,
                        ...(file instanceof File ? safeFileMeta(file) : {}),
                    },
                });

                if (!chapterQuestId) {
                    Log.warning("photos.POST.missing.chapter_quest_id", { status_code: 400 });
                    t.endError("POST /api/photos.bad_request", undefined, { status_code: 400 });
                    return jsonError("Missing chapter_quest_id", 400);
                }

                patchRequestContext({ chapter_quest_id: chapterQuestId });

                if (!ALLOWED_CATEGORIES.has(category)) {
                    Log.warning("photos.POST.invalid.category", {
                        status_code: 400,
                        metadata: { category },
                    });
                    t.endError("POST /api/photos.invalid_category", undefined, {
                        status_code: 400,
                    });
                    return jsonError("Invalid category", 400);
                }

                if (!(file instanceof File)) {
                    Log.warning("photos.POST.missing.file", { status_code: 400 });
                    t.endError("POST /api/photos.missing_file", undefined, { status_code: 400 });
                    return jsonError("Missing file", 400);
                }

                if (!file.type?.startsWith("image/")) {
                    Log.warning("photos.POST.invalid.file_type", {
                        status_code: 400,
                        metadata: { file_type: file.type ?? null },
                    });
                    t.endError("POST /api/photos.file_not_image", undefined, { status_code: 400 });
                    return jsonError("File must be an image", 400);
                }

                // 1) Charger CQ verrouillée session
                const q0 = Date.now();
                const { data: cq, error: cqErr } = await supabase
                    .from("chapter_quests")
                    .select("id,session_id,adventure_quest_id,chapter_id")
                    .eq("id", chapterQuestId)
                    .eq("session_id", session.id)
                    .maybeSingle();

                if (cqErr) {
                    Log.error("photos.POST.cq.select.error", cqErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q0), chapterQuestId, session_id: session.id },
                    });
                    t.endError("POST /api/photos.cq_select_failed", cqErr, { status_code: 500 });
                    return jsonError(cqErr.message, 500);
                }

                if (!cq) {
                    Log.warning("photos.POST.cq.not_found", {
                        status_code: 404,
                        metadata: { ms: msSince(q0), chapterQuestId, session_id: session.id },
                    });
                    t.endError("POST /api/photos.cq_not_found", undefined, { status_code: 404 });
                    return jsonError("Not found", 404);
                }

                const sessionId = cq.session_id;
                const adventureQuestId = cq.adventure_quest_id;

                patchRequestContext({
                    session_id: sessionId,
                    chapter_id: cq.chapter_id ?? null,
                    adventure_quest_id: adventureQuestId ?? null,
                });

                Log.debug("photos.POST.cq.ok", {
                    metadata: {
                        ms: msSince(q0),
                        session_id: sessionId,
                        chapter_id: cq.chapter_id ?? null,
                        adventure_quest_id: adventureQuestId ?? null,
                    },
                });

                // 2) Path
                photoId = crypto.randomUUID();
                const ext = pickExt(file.name, file.type || null);
                objectPath = `${sessionId}/quests/${chapterQuestId}/${category}/${photoId}.${ext}`;

                Log.debug("photos.POST.storage.path", {
                    metadata: { photo_id: photoId, object_path: objectPath, ext },
                });

                // 3) Insert DB d'abord
                const q1 = Date.now();
                const { error: insErr } = await supabase.from("photos").insert({
                    id: photoId,
                    user_id: userId,
                    session_id: sessionId,
                    chapter_quest_id: chapterQuestId,

                    adventure_quest_id: adventureQuestId ?? null,
                    adventure_id: null,
                    chapter_id: null,
                    journal_entry_id: null,

                    bucket: BUCKET,
                    path: objectPath,

                    mime_type: file.type ?? null,
                    size: file.size ?? null,

                    width: width && width > 0 ? width : null,
                    height: height && height > 0 ? height : null,

                    caption,
                    is_cover: isCover,
                    sort: Number.isFinite(sort) ? sort : 0,

                    category,
                });

                if (insErr) {
                    Log.error("photos.POST.db.insert.error", insErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q1), photo_id: photoId, chapterQuestId, category },
                    });
                    t.endError("POST /api/photos.db_insert_failed", insErr, { status_code: 500 });
                    return jsonError(insErr.message, 500);
                }

                Log.success("photos.POST.db.insert.ok", {
                    metadata: { ms: msSince(q1), photo_id: photoId },
                });

                // 4) Upload storage
                const q2 = Date.now();
                const bytes = new Uint8Array(await file.arrayBuffer());

                const { error: upErr } = await supabase.storage
                    .from(BUCKET)
                    .upload(objectPath, bytes, {
                        contentType: file.type || "application/octet-stream",
                        upsert: true,
                    });

                if (upErr) {
                    Log.error("photos.POST.storage.upload.error", upErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q2), photo_id: photoId, object_path: objectPath },
                    });

                    // rollback DB best-effort
                    const rb0 = Date.now();
                    const { error: rbErr } = await supabase
                        .from("photos")
                        .delete()
                        .eq("id", photoId);
                    if (rbErr) {
                        Log.warning("photos.POST.rollback.db.delete.error", {
                            metadata: {
                                ms: msSince(rb0),
                                photo_id: photoId,
                                error: rbErr.message ?? String(rbErr),
                            },
                        });
                    } else {
                        Log.info("photos.POST.rollback.db.delete.ok", {
                            metadata: { ms: msSince(rb0), photo_id: photoId },
                        });
                    }

                    t.endError("POST /api/photos.upload_failed", upErr, { status_code: 500 });
                    return jsonError(upErr.message, 500);
                }

                Log.success("photos.POST.storage.upload.ok", {
                    metadata: { ms: msSince(q2), photo_id: photoId, object_path: objectPath },
                });

                // 5) Signed url
                const q3 = Date.now();
                const { data: signed, error: signErr } = await supabase.storage
                    .from(BUCKET)
                    .createSignedUrl(objectPath, 60 * 30);

                if (signErr) {
                    Log.warning("photos.POST.signed_url.error", {
                        metadata: {
                            ms: msSince(q3),
                            photo_id: photoId,
                            object_path: objectPath,
                            error: signErr.message ?? String(signErr),
                        },
                    });
                } else {
                    Log.debug("photos.POST.signed_url.ok", {
                        metadata: {
                            ms: msSince(q3),
                            photo_id: photoId,
                            has_url: !!signed?.signedUrl,
                        },
                    });
                }

                const signedUrl = signed?.signedUrl ?? null;

                // Journal entry (preuve ajoutée)
                const j0 = Date.now();
                await createJournalEntry({
                    session_id: sessionId,
                    kind: "quest_photo_added",
                    title: `${categoryEmoji(category as any)} Preuve ajoutée`,
                    content: caption ? `🗒️ ${caption}` : null,
                    chapter_id: cq.chapter_id ?? null,
                    adventure_quest_id: adventureQuestId ?? null,
                    meta: {
                        photo_id: photoId,
                        photo_category: category,
                        chapter_quest_id: chapterQuestId,
                    },
                });

                Log.info("photos.POST.journal.created", {
                    metadata: {
                        ms: msSince(j0),
                        photo_id: photoId,
                        category,
                        caption_present: !!caption,
                    },
                });

                // ✅ MJ: analyser la photo et poster un message (best-effort)
                if (signedUrl) {
                    const ai0 = Date.now();
                    Log.info("photos.POST.mj.generate.start", {
                        metadata: {
                            ms_since_start: msSince(startedAt),
                            photo_id: photoId,
                            photo_category: category,
                            caption_present: !!caption,
                        },
                    });

                    const settled = await Promise.allSettled([
                        generatePhotoQuestMessageForQuest({
                            chapter_quest_id: chapterQuestId,
                            photo_id: photoId,
                            photo_category: category as any,
                            photo_caption: caption,
                            photo_signed_url: signedUrl,
                        }),
                    ]);

                    const r = settled[0];
                    if (r.status === "fulfilled") {
                        Log.success("photos.POST.mj.generate.ok", {
                            metadata: { ms: msSince(ai0), photo_id: photoId },
                        });
                    } else {
                        Log.warning("photos.POST.mj.generate.failed", {
                            metadata: {
                                ms: msSince(ai0),
                                photo_id: photoId,
                                reason:
                                    r.reason instanceof Error ? r.reason.message : String(r.reason),
                            },
                        });
                    }
                } else {
                    Log.warning("photos.POST.mj.skipped.no_signed_url", {
                        metadata: { photo_id: photoId, object_path: objectPath },
                    });
                }

                Log.success("photos.POST.ok", {
                    status_code: 200,
                    metadata: {
                        duration_ms: msSince(startedAt),
                        photo_id: photoId,
                        chapter_quest_id: chapterQuestId,
                        category,
                    },
                });

                t.endSuccess("POST /api/photos.success", { status_code: 200 });

                return NextResponse.json({
                    photo: {
                        id: photoId,
                        user_id: userId,
                        session_id: sessionId,
                        chapter_quest_id: chapterQuestId,
                        adventure_quest_id: adventureQuestId ?? null,
                        bucket: BUCKET,
                        path: objectPath,
                        mime_type: file.type ?? null,
                        size: file.size ?? null,
                        width: width && width > 0 ? width : null,
                        height: height && height > 0 ? height : null,
                        caption,
                        is_cover: isCover,
                        sort: Number.isFinite(sort) ? sort : 0,
                        category,
                    },
                    signed_url: signedUrl,
                });
            } catch (e) {
                Log.error("photos.POST.fatal", e, {
                    status_code: 500,
                    metadata: {
                        duration_ms: msSince(startedAt),
                        photo_id: photoId,
                        object_path: objectPath,
                    },
                });
                t.endError("POST /api/photos.fatal", e, { status_code: 500 });
                return jsonError("Server error", 500);
            }
        }
    );
}

/* ============================================================================
DELETE /api/photos?id=uuid
============================================================================ */
export async function DELETE(req: NextRequest) {
    const request_id = crypto.randomUUID();
    const startedAt = Date.now();
    const route = "/api/photos";
    const method = "DELETE";

    return await withRequestContext(
        { request_id, route, method, started_at_ms: startedAt },
        async () => {
            const t = Log.timer("DELETE /api/photos", { source: "app/api/photos/route.ts" });

            try {
                Log.info("photos.DELETE.start", {
                    metadata: {
                        url: req.nextUrl?.toString?.() ?? null,
                        search: Object.fromEntries(req.nextUrl.searchParams.entries()),
                    },
                });

                const supabase = await supabaseServer();
                const session = await getActiveSessionOrThrow();
                patchRequestContext({ session_id: session.id });

                const sp = req.nextUrl.searchParams;
                const id = (sp.get("id") ?? "").trim();
                if (!id) {
                    Log.warning("photos.DELETE.missing.id", { status_code: 400 });
                    t.endError("DELETE /api/photos.bad_request", undefined, { status_code: 400 });
                    return jsonError("Missing id", 400);
                }

                // Charge la row
                const q0 = Date.now();
                const { data: row, error: rErr } = await supabase
                    .from("photos")
                    .select("id,bucket,path,session_id,chapter_quest_id,adventure_quest_id,user_id")
                    .eq("id", id)
                    .eq("session_id", session.id)
                    .maybeSingle();

                if (rErr) {
                    Log.error("photos.DELETE.row.select.error", rErr, {
                        status_code: 500,
                        metadata: { ms: msSince(q0), id, session_id: session.id },
                    });
                    t.endError("DELETE /api/photos.select_failed", rErr, { status_code: 500 });
                    return jsonError(rErr.message, 500);
                }

                if (!row) {
                    Log.warning("photos.DELETE.not_found", {
                        status_code: 404,
                        metadata: { ms: msSince(q0), id, session_id: session.id },
                    });
                    t.endError("DELETE /api/photos.not_found", undefined, { status_code: 404 });
                    return jsonError("Not found", 404);
                }

                patchRequestContext({
                    user_id: row.user_id ?? null,
                    chapter_quest_id: row.chapter_quest_id ?? null,
                    adventure_quest_id: row.adventure_quest_id ?? null,
                });

                // Delete storage (best-effort)
                if (row.path) {
                    const s0 = Date.now();
                    const { error: sErr } = await supabase.storage.from(BUCKET).remove([row.path]);
                    if (sErr) {
                        Log.warning("photos.DELETE.storage.remove.error", {
                            metadata: {
                                ms: msSince(s0),
                                id,
                                path: row.path,
                                error: sErr.message ?? String(sErr),
                            },
                        });
                    } else {
                        Log.info("photos.DELETE.storage.remove.ok", {
                            metadata: { ms: msSince(s0), id, path: row.path },
                        });
                    }
                }

                // Delete DB
                const d0 = Date.now();
                const { error: dErr } = await supabase
                    .from("photos")
                    .delete()
                    .eq("id", id)
                    .eq("session_id", session.id);

                if (dErr) {
                    Log.error("photos.DELETE.db.delete.error", dErr, {
                        status_code: 500,
                        metadata: { ms: msSince(d0), id, session_id: session.id },
                    });
                    t.endError("DELETE /api/photos.db_delete_failed", dErr, { status_code: 500 });
                    return jsonError(dErr.message, 500);
                }

                Log.success("photos.DELETE.ok", {
                    status_code: 200,
                    metadata: { duration_ms: msSince(startedAt), id },
                });

                t.endSuccess("DELETE /api/photos.success", { status_code: 200 });

                return NextResponse.json({ ok: true });
            } catch (e) {
                Log.error("photos.DELETE.fatal", e, {
                    status_code: 500,
                    metadata: { duration_ms: msSince(startedAt) },
                });
                t.endError("DELETE /api/photos.fatal", e, { status_code: 500 });
                return jsonError("Server error", 500);
            }
        }
    );
}
