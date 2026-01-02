// src/lib/inventory/plants/plantsRepo.ts
import { supabaseServer } from "@/lib/supabase/server";
import { Log } from "@/lib/systemLog/Log";

import type { PlantDraftV1 } from "@/lib/inventory/schemas/plants/v1";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

/* ============================================================================
📦 REPO
============================================================================ */

/**
 * Tables prévues (à créer au moment du SQL):
 * - inventory_collections (id, user_id, kind, title, schema_version, created_at, updated_at)
 * - inventory_items (id, user_id, collection_id, title, ai_description, data jsonb, created_at, updated_at)
 * - inventory_item_photos (id, user_id, item_id, photo_id, created_at)
 */
export async function ensurePlantsCollectionForUser(userId: string): Promise<string> {
    const t0 = Date.now();
    const supabase = await supabaseServer();

    // 1) Try select
    const { data: existing, error: selErr } = await supabase
        .from("inventory_collections")
        .select("id")
        .eq("user_id", userId)
        .eq("kind", "plants")
        .maybeSingle();

    if (selErr) {
        Log.warning("plants.repo.collection.select.error", {
            metadata: { ms: msSince(t0), error: selErr.message },
        });
    }

    if (existing?.id) return existing.id as string;

    // 2) Insert
    const id = crypto.randomUUID();
    const { error: insErr } = await supabase.from("inventory_collections").insert({
        id,
        user_id: userId,
        kind: "plants",
        title: "Mes plantes",
        schema_version: "plants.v1",
    });

    if (insErr) {
        Log.error("plants.repo.collection.insert.error", insErr, {
            metadata: { ms: msSince(t0), user_id: userId, id },
        });
        throw new Error(insErr.message);
    }

    Log.success("plants.repo.collection.insert.ok", {
        metadata: { ms: msSince(t0), id, user_id: userId },
    });

    return id;
}

export async function createPlantItem(input: {
    user_id: string;
    photo_id: string;
    draft: PlantDraftV1;
}): Promise<{ item_id: string; collection_id: string }> {
    const t0 = Date.now();
    const supabase = await supabaseServer();

    const userId = safeTrim(input.user_id);
    const photoId = safeTrim(input.photo_id);
    if (!userId || !photoId) throw new Error("Missing user_id or photo_id");

    const collectionId = await ensurePlantsCollectionForUser(userId);

    const itemId = crypto.randomUUID();

    const { error: insErr } = await supabase.from("inventory_items").insert({
        id: itemId,
        user_id: userId,
        collection_id: collectionId,

        title: safeTrim(input.draft.title) || "Plante",
        ai_description: safeTrim(input.draft.ai_description) || null,
        data: input.draft.data ?? {},
        schema_version: input.draft.schema_version,
    });

    if (insErr) {
        Log.error("plants.repo.item.insert.error", insErr, {
            metadata: { ms: msSince(t0), item_id: itemId },
        });
        throw new Error(insErr.message);
    }

    const linkId = crypto.randomUUID();
    const { error: linkErr } = await supabase.from("inventory_item_photos").insert({
        id: linkId,
        user_id: userId,
        item_id: itemId,
        photo_id: photoId,
    });

    if (linkErr) {
        // best-effort: item created but photo link failed
        Log.warning("plants.repo.item.photo_link.error", {
            metadata: {
                ms: msSince(t0),
                error: linkErr.message,
                item_id: itemId,
                photo_id: photoId,
            },
        });
    }

    Log.success("plants.repo.item.insert.ok", {
        metadata: { ms: msSince(t0), item_id: itemId, collection_id: collectionId },
    });

    return { item_id: itemId, collection_id: collectionId };
}

export async function listPlants(input: {
    user_id: string;
    q?: string | null;
    limit?: number;
    offset?: number;
}) {
    const supabase = await supabaseServer();

    const limit = Math.min(Math.max(input.limit ?? 24, 1), 60);
    const offset = Math.max(input.offset ?? 0, 0);
    const q = safeTrim(input.q ?? "") || null;

    // 1) resolve schema version id from code
    const { data: sv, error: svErr } = await supabase
        .from("inventory_schema_versions")
        .select("id")
        .eq("code", "plants.v1")
        .maybeSingle();

    if (svErr) throw svErr;
    if (!sv?.id) throw new Error("Schema version plants.v1 not found");

    // 2) list items
    let query = supabase
        .from("inventory_items")
        .select("id, title, ai_description, created_at, data, collection_id")
        .eq("user_id", input.user_id)
        .eq("schema_version", "plants.v1")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (q) {
        query = query.ilike("title", `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { items: data ?? [], limit, offset };
}

export async function getPlantById(input: { user_id: string; id: string }) {
    const supabase = await supabaseServer();

    const { data: item, error } = await supabase
        .from("inventory_items")
        .select("id, title, ai_description, created_at, data, collection_id, schema_version")
        .eq("user_id", input.user_id)
        .eq("id", input.id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!item) return { item: null, photos: [] as any[] };

    const { data: links, error: linkErr } = await supabase
        .from("inventory_item_photos")
        .select("photo_id, photos:photo_id (id, bucket, path, caption, created_at)")
        .eq("user_id", input.user_id)
        .eq("item_id", input.id);

    if (linkErr) throw new Error(linkErr.message);

    const photos = (links ?? []).map((l: any) => l.photos).filter(Boolean);

    return { item, photos };
}

export async function patchPlantItem(input: {
    user_id: string;
    id: string;
    title?: string | null;
    ai_description?: string | null;
    data?: any;
}) {
    const supabase = await supabaseServer();

    const patch: Record<string, any> = {};
    if (input.title != null) patch.title = safeTrim(input.title) || "Plante";
    if (input.ai_description != null) patch.ai_description = safeTrim(input.ai_description) || null;
    if (input.data != null) patch.data = input.data;

    const { error } = await supabase
        .from("inventory_items")
        .update(patch)
        .eq("user_id", input.user_id)
        .eq("id", input.id);

    if (error) throw new Error(error.message);

    return true;
}
