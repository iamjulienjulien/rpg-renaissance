import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";
import { type PhotoCategory } from "@/types/game";

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

/* ============================================================================
GET /api/photos?chapterQuestId=uuid
- Liste les photos liées à chapter_quest_id + signed_url
============================================================================ */
export async function GET(req: NextRequest) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const sp = req.nextUrl.searchParams;
    const chapterQuestId = (sp.get("chapterQuestId") ?? "").trim();
    if (!chapterQuestId) return jsonError("Missing chapterQuestId", 400);

    // (Optionnel mais utile) vérifie que la cq appartient à la session active (RLS + sécurité)
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id, session_id")
        .eq("id", chapterQuestId)
        .eq("session_id", session.id)
        .maybeSingle();

    if (cqErr) return jsonError(cqErr.message, 500);
    if (!cq) return jsonError("Not found", 404);

    const limit = Math.max(6, toInt(sp.get("limit"), 200));

    const { data: rows, error } = await supabase
        .from("photos")
        .select(
            "id,created_at,category,bucket,path,mime_type,size,width,height,caption,is_cover,sort,chapter_quest_id,adventure_quest_id,session_id,user_id"
        )
        .eq("chapter_quest_id", chapterQuestId)
        .eq("session_id", session.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) return jsonError(error.message, 500);

    // Signed URLs (30 min)
    const enriched = await Promise.all(
        (rows ?? []).map(async (p: any) => {
            const path = p?.path;
            if (!path) return { ...p, signed_url: null };

            const { data: signed, error: sErr } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(path, 60 * 30);

            return {
                ...p,
                signed_url: sErr ? null : (signed?.signedUrl ?? null),
            };
        })
    );

    return NextResponse.json({ rows: enriched });
}

/* ============================================================================
POST /api/photos
multipart/form-data:
- chapter_quest_id (uuid) REQUIRED
- category (initial|final|other) OPTIONAL (default other)
- caption OPTIONAL
- sort OPTIONAL
- is_cover OPTIONAL
- width / height OPTIONAL (si tu veux les passer depuis le client)
- file REQUIRED (image)
============================================================================ */
export async function POST(req: NextRequest) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const userId = await getUserIdOrThrow(supabase).catch(() => null);
    if (!userId) return jsonError("Unauthorized", 401);

    let form: FormData;
    try {
        form = await req.formData();
    } catch {
        return jsonError("Invalid form-data", 400);
    }

    const chapterQuestId = String(form.get("chapter_quest_id") ?? "").trim();
    const category = String(form.get("category") ?? "other").trim();
    const caption = String(form.get("caption") ?? "").trim() || null;

    const sort = toInt(String(form.get("sort") ?? ""), 0);
    const isCover = toBool(form.get("is_cover"), false);

    const width = form.get("width") != null ? toInt(String(form.get("width")), 0) : null;
    const height = form.get("height") != null ? toInt(String(form.get("height")), 0) : null;

    const file = form.get("file");

    if (!chapterQuestId) return jsonError("Missing chapter_quest_id", 400);
    if (!ALLOWED_CATEGORIES.has(category)) return jsonError("Invalid category", 400);
    if (!(file instanceof File)) return jsonError("Missing file", 400);
    if (!file.type?.startsWith("image/")) return jsonError("File must be an image", 400);

    // 1) Récupère les infos de la CQ (et verrouille sur la session active)
    // + récupère adventure_quest_id (parent canonique pour la contrainte single_parent)
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select("id,session_id,adventure_quest_id,chapter_id")
        .eq("id", chapterQuestId)
        .eq("session_id", session.id)
        .maybeSingle();

    if (cqErr) return jsonError(cqErr.message, 500);
    if (!cq) return jsonError("Not found", 404);

    const sessionId = cq.session_id;
    const adventureQuestId = cq.adventure_quest_id;

    // 2) Path
    const photoId = crypto.randomUUID();
    const ext = pickExt(file.name, file.type || null);
    const objectPath = `${sessionId}/quests/${chapterQuestId}/${category}/${photoId}.${ext}`;

    // 3) Insert DB d'abord (avec parent unique: adventure_quest_id)
    const { error: insErr } = await supabase.from("photos").insert({
        id: photoId,
        user_id: userId,
        session_id: sessionId,
        chapter_quest_id: chapterQuestId,

        // ⚠️ important: un seul parent dans {adventure_id, chapter_id, adventure_quest_id, journal_entry_id}
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

    if (insErr) return jsonError(insErr.message, 500);

    // 4) Upload storage
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
    });

    if (upErr) {
        // rollback DB best-effort
        await supabase.from("photos").delete().eq("id", photoId);
        return jsonError(upErr.message, 500);
    }

    // 5) Signed url
    const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(objectPath, 60 * 30);

    await createJournalEntry({
        session_id: sessionId,
        kind: "quest_photo_added",
        title: `${categoryEmoji(category as any)} Preuve ajoutée`,
        content: caption ? `🗒️ ${caption}` : null,
        chapter_id: cq.chapter_id ?? null,
        adventure_quest_id: adventureQuestId ?? null,
        meta: {
            photo_id: photoId,
            photo_category: category, // "initial" | "final" | "other"
            chapter_quest_id: chapterQuestId,
        },
    });

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
        signed_url: signed?.signedUrl ?? null,
    });
}

/* ============================================================================
DELETE /api/photos?id=uuid
- delete storage object + delete row
============================================================================ */
export async function DELETE(req: NextRequest) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const sp = req.nextUrl.searchParams;
    const id = (sp.get("id") ?? "").trim();
    if (!id) return jsonError("Missing id", 400);

    // Charge la row (RLS fait le filtrage, mais on ajoute session_id pour être cohérent)
    const { data: row, error: rErr } = await supabase
        .from("photos")
        .select("id,bucket,path,session_id")
        .eq("id", id)
        .eq("session_id", session.id)
        .maybeSingle();

    if (rErr) return jsonError(rErr.message, 500);
    if (!row) return jsonError("Not found", 404);

    // Delete storage (best-effort)
    if (row.path) {
        await supabase.storage.from(BUCKET).remove([row.path]);
    }

    // Delete DB
    const { error: dErr } = await supabase
        .from("photos")
        .delete()
        .eq("id", id)
        .eq("session_id", session.id);

    if (dErr) return jsonError(dErr.message, 500);

    return NextResponse.json({ ok: true });
}
