"use client";

import { create } from "zustand";

export type GameSession = {
    id: string;
    title: string;
    is_active: boolean;
    status: string;
    created_at: string;
    updated_at: string;
};

type SessionState = {
    activeSessionId: string | null;
    activeSession: GameSession | null;
    loading: boolean;
    error: string | null;

    // core
    bootstrap: () => Promise<void>;
    createAndActivate: (title?: string) => Promise<string | null>;
    setActive: (sessionId: string) => Promise<boolean>;
    clear: () => void;

    // ✅ new helpers
    ensureActive: (titleIfCreate?: string) => Promise<string | null>;
    getRequiredActiveSessionId: () => string;
};

export const useSessionStore = create<SessionState>((set, get) => ({
    activeSessionId: null,
    activeSession: null,
    loading: false,
    error: null,

    bootstrap: async () => {
        set({ loading: true, error: null });
        try {
            const res = await fetch("/api/session/active", { cache: "no-store" });
            const json = await res.json().catch(() => null);

            if (!res.ok) {
                set({ error: json?.error ?? "Failed to load active session" });
                return;
            }

            const session = (json?.session ?? null) as GameSession | null;
            set({
                activeSession: session,
                activeSessionId: session?.id ?? null,
            });
        } catch (e) {
            set({
                error: e instanceof Error ? e.message : "Failed to load active session",
            });
        } finally {
            set({ loading: false });
        }
    },

    createAndActivate: async (title?: string) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch("/api/session/active", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create",
                    title: (title ?? "Ma partie").trim() || "Ma partie",
                }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                set({ error: json?.error ?? "Failed to create session" });
                return null;
            }

            const session = (json?.session ?? null) as GameSession | null;
            set({
                activeSession: session,
                activeSessionId: session?.id ?? null,
            });

            return session?.id ?? null;
        } catch (e) {
            set({ error: e instanceof Error ? e.message : "Failed to create session" });
            return null;
        } finally {
            set({ loading: false });
        }
    },

    setActive: async (sessionId: string) => {
        if (!sessionId) {
            set({ error: "Missing sessionId" });
            return false;
        }

        set({ loading: true, error: null });
        try {
            const res = await fetch("/api/session/active", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "activate", sessionId }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                set({ error: json?.error ?? "Failed to activate session" });
                return false;
            }

            const session = (json?.session ?? null) as GameSession | null;
            set({
                activeSession: session,
                activeSessionId: session?.id ?? null,
            });

            return true;
        } catch (e) {
            set({ error: e instanceof Error ? e.message : "Failed to activate session" });
            return false;
        } finally {
            set({ loading: false });
        }
    },

    clear: () => set({ activeSessionId: null, activeSession: null, error: null }),

    // ✅ NEW: garantit qu’une session active existe
    ensureActive: async (titleIfCreate?: string) => {
        const { activeSessionId } = get();
        if (activeSessionId) return activeSessionId;

        // 1) tenter de récupérer la session active côté serveur
        await get().bootstrap();

        const afterBootstrap = get().activeSessionId;
        if (afterBootstrap) return afterBootstrap;

        // 2) sinon, créer une nouvelle session active
        return await get().createAndActivate(titleIfCreate ?? "Ma partie");
    },

    // ✅ NEW: pratique pour les autres stores (journalStore)
    getRequiredActiveSessionId: () => {
        const id = get().activeSessionId;
        if (!id) {
            throw new Error("No active session (call ensureActive()/bootstrap() first).");
        }
        return id;
    },
}));
