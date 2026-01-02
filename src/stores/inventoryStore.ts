// src/stores/inventoryStore.ts
"use client";

import { create } from "zustand";

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

/* ============================================================================
🧱 TYPES (v1)
============================================================================ */

export type InventoryKind = "plants" | "books" | "vinyls";

export type InventoryCollection = {
    id: string;
    kind: InventoryKind;
    title: string;
    schema_version: string;
};

export type PlantFieldTypeV1 = "string" | "number" | "boolean" | "enum" | "date" | "text";

export type PlantDraftV1 = {
    schema_version: "plants.v1";
    title: string;
    ai_description: string;
    data: Record<string, { type: PlantFieldTypeV1; value: any }>;
};

export type PlantItem = {
    id: string;
    title: string;
    ai_description: string | null;
    created_at: string;
    data: PlantDraftV1["data"];
    collection_id: string;
    cover_photo_url: string;
};

export type InventoryPhoto = {
    id: string;
    bucket: string;
    path: string;
    caption: string | null;
    created_at: string;
    // Optionnel: URL signée côté UI
    signed_url?: string | null;
};

type PrefillResponse = {
    draft: PlantDraftV1;
    meta?: Record<string, unknown>;
};

/* ============================================================================
🧰 API CLIENT HELPERS
============================================================================ */

async function apiJson<T>(url: string, init?: RequestInit & { json?: any }): Promise<T> {
    const headers: Record<string, string> = {
        ...(init?.headers ? (init.headers as Record<string, string>) : {}),
    };

    let body: BodyInit | null | undefined = init?.body;

    if (init && "json" in init) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify((init as any).json);
    }

    const res = await fetch(url, { ...init, headers, body });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : `Request failed (${res.status})`;
        const err: any = new Error(msg);
        err.status = res.status;
        err.details = data?.details ?? null;
        throw err;
    }

    return data as T;
}

/* ============================================================================
🏪 STORE
============================================================================ */

type InventoryState = {
    // Global
    loading: boolean;
    saving: boolean;
    error: string | null;

    // Catalog (future-proof, même si v1 = plantes uniquement)
    collections: InventoryCollection[];
    collectionsLoaded: boolean;

    // Plants list
    plants: PlantItem[];
    plantsTotal: number | null; // v1: API ne renvoie pas le total, on garde null
    plantsQuery: string;
    plantsLimit: number;
    plantsOffset: number;
    plantsLoaded: boolean;

    // Current plant detail
    currentPlantId: string | null;
    currentPlant: PlantItem | null;
    currentPlantPhotos: InventoryPhoto[];
    currentPlantLoaded: boolean;

    // Prefill pipeline (add flow)
    prefillLoading: boolean;
    prefillError: string | null;
    plantPrefill: PlantDraftV1 | null;

    // Actions: global
    clearError: () => void;

    // Actions: collections
    setCollections: (cols: InventoryCollection[]) => void;

    // Actions: plants list
    resetPlantsList: () => void;
    setPlantsQuery: (q: string) => void;
    fetchPlants: (opts?: { q?: string; limit?: number; offset?: number }) => Promise<void>;

    // Actions: plant detail
    fetchPlantById: (id: string) => Promise<void>;
    clearCurrentPlant: () => void;

    // Actions: prefill + create
    generatePlantPrefill: (input: {
        photo_id: string;
        photo_signed_url: string;
        photo_caption?: string | null;
    }) => Promise<PlantDraftV1 | null>;

    patchPlantPrefill: (patch: Partial<PlantDraftV1>) => void;
    resetPlantPrefill: () => void;

    createPlantFromPrefill: (input: {
        photo_id: string;
        draft?: PlantDraftV1; // optionnel, sinon utilise plantPrefill
    }) => Promise<{ item_id: string; collection_id: string } | null>;

    updatePlant: (input: {
        id: string;
        title?: string | null;
        ai_description?: string | null;
        data?: any;
    }) => Promise<boolean>;

    setError: (message: string | null) => void;
    setPrefillError: (message: string | null) => void;
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
    // Global
    loading: false,
    saving: false,
    error: null,

    // Collections
    collections: [],
    collectionsLoaded: false,

    // Plants list
    plants: [],
    plantsTotal: null,
    plantsQuery: "",
    plantsLimit: 24,
    plantsOffset: 0,
    plantsLoaded: false,

    // Detail
    currentPlantId: null,
    currentPlant: null,
    currentPlantPhotos: [],
    currentPlantLoaded: false,

    // Prefill
    prefillLoading: false,
    prefillError: null,
    plantPrefill: null,

    clearError: () => set({ error: null }),

    /* ============================================================================
    📚 COLLECTIONS (v1 simple, mais prêt)
    ============================================================================ */

    setCollections: (cols) =>
        set({
            collections: cols,
            collectionsLoaded: true,
        }),

    /* ============================================================================
    🌿 PLANTS LIST
    ============================================================================ */

    resetPlantsList: () =>
        set({
            plants: [],
            plantsTotal: null,
            plantsOffset: 0,
            plantsLoaded: false,
        }),

    setPlantsQuery: (q) =>
        set({
            plantsQuery: q,
            plantsOffset: 0,
            plantsLoaded: false,
        }),

    fetchPlants: async (opts) => {
        const t0 = Date.now();

        const q = safeTrim(opts?.q ?? get().plantsQuery);
        const limit = opts?.limit ?? get().plantsLimit;
        const offset = opts?.offset ?? get().plantsOffset;

        set({ loading: true, error: null });

        try {
            const url = new URL("/api/inventory/plants", window.location.origin);
            if (q) url.searchParams.set("q", q);
            url.searchParams.set("limit", String(limit));
            url.searchParams.set("offset", String(offset));

            const data = await apiJson<{ items: PlantItem[]; limit: number; offset: number }>(
                url.toString(),
                { method: "GET" }
            );

            set({
                plants: data.items ?? [],
                plantsLimit: data.limit ?? limit,
                plantsOffset: data.offset ?? offset,
                plantsLoaded: true,
                loading: false,
            });
        } catch (e: any) {
            set({
                loading: false,
                error: e?.message ? String(e.message) : "Impossible de charger les plantes",
            });
        } finally {
            // noop, utile pour debug si besoin
            void msSince(t0);
        }
    },

    /* ============================================================================
    🌱 PLANT DETAIL
    ============================================================================ */

    clearCurrentPlant: () =>
        set({
            currentPlantId: null,
            currentPlant: null,
            currentPlantPhotos: [],
            currentPlantLoaded: false,
        }),

    fetchPlantById: async (id) => {
        const itemId = safeTrim(id);
        if (!itemId) return;

        set({
            loading: true,
            error: null,
            currentPlantId: itemId,
            currentPlantLoaded: false,
        });

        try {
            const data = await apiJson<{ item: PlantItem; photos: InventoryPhoto[] }>(
                `/api/inventory/plants/${itemId}`,
                { method: "GET" }
            );

            set({
                currentPlant: data.item ?? null,
                currentPlantPhotos: data.photos ?? [],
                currentPlantLoaded: true,
                loading: false,
            });
        } catch (e: any) {
            set({
                loading: false,
                currentPlantLoaded: false,
                error: e?.message ? String(e.message) : "Impossible de charger la plante",
            });
        }
    },

    /* ============================================================================
    🧠 PREFILL + CREATE
    ============================================================================ */

    resetPlantPrefill: () =>
        set({
            plantPrefill: null,
            prefillLoading: false,
            prefillError: null,
        }),

    patchPlantPrefill: (patch) => {
        const current = get().plantPrefill;
        if (!current) {
            // si aucun prefill, on ignore
            return;
        }

        set({
            plantPrefill: {
                ...current,
                ...patch,
                data: patch.data
                    ? { ...(current.data ?? {}), ...(patch.data ?? {}) }
                    : current.data,
            },
        });
    },

    generatePlantPrefill: async (input) => {
        const photo_id = safeTrim(input.photo_id);
        const photo_signed_url = safeTrim(input.photo_signed_url);
        const photo_caption = input.photo_caption ?? null;

        if (!photo_id || !photo_signed_url) {
            set({ prefillError: "Photo manquante (id ou URL)" });
            return null;
        }

        set({
            prefillLoading: true,
            prefillError: null,
            plantPrefill: null,
        });

        try {
            const data = await apiJson<PrefillResponse>("/api/inventory/plants/prefill", {
                method: "POST",
                json: { photo_id, photo_signed_url, photo_caption },
            });

            set({
                prefillLoading: false,
                plantPrefill: data.draft ?? null,
            });

            return data.draft ?? null;
        } catch (e: any) {
            set({
                prefillLoading: false,
                prefillError: e?.message ? String(e.message) : "Échec de génération du brouillon",
            });
            return null;
        }
    },

    createPlantFromPrefill: async (input) => {
        const photo_id = safeTrim(input.photo_id);
        const draft = input.draft ?? get().plantPrefill;

        if (!photo_id || !draft) {
            set({ error: "Il manque la photo ou le brouillon à enregistrer." });
            return null;
        }

        set({ saving: true, error: null });

        try {
            const created = await apiJson<{ item_id: string; collection_id: string }>(
                "/api/inventory/plants",
                {
                    method: "POST",
                    json: { photo_id, draft },
                }
            );

            set({ saving: false });

            // UX: on injecte en haut de liste si elle est déjà chargée
            const plants = get().plantsLoaded
                ? [
                      /* placeholder */
                  ]
                : null;
            if (plants) {
                // on ne connait pas l'item complet, on laisse la liste se recharger plus tard
            }

            // Optionnel: reset prefill après création
            set({ plantPrefill: null, prefillError: null });

            return created ?? null;
        } catch (e: any) {
            set({
                saving: false,
                error: e?.message ? String(e.message) : "Échec de création de la plante",
            });
            return null;
        }
    },

    updatePlant: async (input) => {
        const id = safeTrim(input.id);
        if (!id) return false;

        set({ saving: true, error: null });

        try {
            await apiJson<{ ok: true }>(`/api/inventory/plants/${id}`, {
                method: "PATCH",
                json: {
                    title: input.title ?? undefined,
                    ai_description: input.ai_description ?? undefined,
                    data: input.data ?? undefined,
                },
            });

            set({ saving: false });

            // Sync local currentPlant
            const current = get().currentPlant;
            if (current?.id === id) {
                set({
                    currentPlant: {
                        ...current,
                        title:
                            input.title != null
                                ? safeTrim(input.title) || current.title
                                : current.title,
                        ai_description:
                            input.ai_description != null
                                ? safeTrim(input.ai_description) || null
                                : current.ai_description,
                        data: input.data != null ? input.data : current.data,
                    },
                });
            }

            // Optionnel: sync list
            const list = get().plants;
            if (list.length) {
                set({
                    plants: list.map((p) =>
                        p.id === id
                            ? {
                                  ...p,
                                  title:
                                      input.title != null
                                          ? safeTrim(input.title) || p.title
                                          : p.title,
                                  ai_description:
                                      input.ai_description != null
                                          ? safeTrim(input.ai_description) || null
                                          : p.ai_description,
                                  data: input.data != null ? input.data : p.data,
                              }
                            : p
                    ),
                });
            }

            return true;
        } catch (e: any) {
            set({
                saving: false,
                error: e?.message ? String(e.message) : "Échec de mise à jour",
            });
            return false;
        }
    },

    setError: (message) => set({ error: message }),
    setPrefillError: (message) => set({ prefillError: message }),
}));
