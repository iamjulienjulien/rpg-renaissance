// src/lib/admin/adminStore.ts
"use client";

import { create } from "zustand";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type AiGenerationStatus = "success" | "error";

export type AiGenerationRow = {
    id: string;
    created_at: string;
    session_id: string;
    user_id: string | null;

    generation_type: string;
    source: string | null;

    provider: string | null;
    model: string;

    status: AiGenerationStatus;

    duration_ms: number | null;

    error_message: string | null;
    error_code: string | null;

    chapter_quest_id: string | null;
    chapter_id: string | null;
    adventure_id: string | null;
};

export type AiGenerationFullRow = Record<string, any>;

export type AiGenerationsFilters = {
    q?: string;
    type?: string;
    status?: AiGenerationStatus | "all";
    model?: string;
    limit?: number;
    offset?: number;
};

type AdminState = {
    // List
    aiGenerations: AiGenerationRow[];
    aiGenerationsCount: number | null;
    aiGenerationsLoading: boolean;
    aiGenerationsError: string | null;
    aiGenerationsFilters: AiGenerationsFilters;

    // Drawer selection
    selectedAiGenerationId: string | null;
    selectedAiGenerationFull: AiGenerationFullRow | null;
    selectedAiGenerationLoading: boolean;
    selectedAiGenerationError: string | null;

    // Actions
    setAiGenerationsFilters: (patch: Partial<AiGenerationsFilters>) => void;
    fetchAiGenerations: (opts?: { reset?: boolean }) => Promise<void>;

    openAiGeneration: (id: string) => void;
    closeAiGeneration: () => void;
    fetchAiGenerationById: (id: string) => Promise<void>;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function toQueryString(filters: AiGenerationsFilters) {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    if (filters.type) params.set("type", filters.type);
    if (filters.model) params.set("model", filters.model);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);

    params.set("limit", String(filters.limit ?? 25));
    params.set("offset", String(filters.offset ?? 0));

    return params.toString();
}

/* ============================================================================
🗃️ STORE
============================================================================ */

export const useAdminStore = create<AdminState>((set, get) => ({
    // List
    aiGenerations: [],
    aiGenerationsCount: null,
    aiGenerationsLoading: false,
    aiGenerationsError: null,
    aiGenerationsFilters: {
        q: "",
        type: "",
        status: "all",
        model: "",
        limit: 25,
        offset: 0,
    },

    // Drawer
    selectedAiGenerationId: null,
    selectedAiGenerationFull: null,
    selectedAiGenerationLoading: false,
    selectedAiGenerationError: null,

    setAiGenerationsFilters: (patch) => {
        set((s) => ({
            aiGenerationsFilters: {
                ...s.aiGenerationsFilters,
                ...patch,
            },
        }));
    },

    fetchAiGenerations: async (opts) => {
        const reset = !!opts?.reset;

        const filters = get().aiGenerationsFilters;
        const nextFilters = reset ? { ...filters, offset: 0 } : filters;

        if (reset) set({ aiGenerationsFilters: nextFilters });

        set({ aiGenerationsLoading: true, aiGenerationsError: null });

        try {
            const qs = toQueryString(nextFilters);
            const res = await fetch(`/api/admin/ai-generations?${qs}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);

            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            set({
                aiGenerations: Array.isArray(json?.rows) ? json.rows : [],
                aiGenerationsCount: typeof json?.count === "number" ? json.count : null,
                aiGenerationsLoading: false,
                aiGenerationsError: null,
            });
        } catch (e: any) {
            set({
                aiGenerationsLoading: false,
                aiGenerationsError: e?.message || "Failed to fetch ai_generations",
            });
        }
    },

    openAiGeneration: (id) => {
        set({
            selectedAiGenerationId: id,
            selectedAiGenerationFull: null,
            selectedAiGenerationLoading: true,
            selectedAiGenerationError: null,
        });

        void get().fetchAiGenerationById(id);
    },

    closeAiGeneration: () => {
        set({
            selectedAiGenerationId: null,
            selectedAiGenerationFull: null,
            selectedAiGenerationLoading: false,
            selectedAiGenerationError: null,
        });
    },

    fetchAiGenerationById: async (id) => {
        set({ selectedAiGenerationLoading: true, selectedAiGenerationError: null });

        try {
            const res = await fetch(`/api/admin/ai-generations?id=${encodeURIComponent(id)}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);

            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            set({
                selectedAiGenerationFull: json?.row ?? null,
                selectedAiGenerationLoading: false,
                selectedAiGenerationError: null,
            });
        } catch (e: any) {
            set({
                selectedAiGenerationLoading: false,
                selectedAiGenerationError: e?.message || "Failed to fetch ai_generation row",
            });
        }
    },
}));
