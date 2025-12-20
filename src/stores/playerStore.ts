// src/stores/playerStore.ts
import { create } from "zustand";

export type PlayerUser = {
    id: string;
    email: string | null;
};

export type PlayerProfile = {
    user_id: string;
    display_name: string | null;
    character_id: string | null;
};

export type ActiveSession = {
    id: string;
    title: string;
    is_active: boolean;
    status: string;
    created_at: string;
    updated_at: string;
};

type PlayerState = {
    user: PlayerUser | null;
    profile: PlayerProfile | null;
    session: ActiveSession | null;

    loading: boolean;
    saving: boolean;
    error: string | null;

    bootstrap: () => Promise<void>;
    refresh: () => Promise<void>;

    updateDisplayName: (displayName: string) => Promise<boolean>;
    logout: () => Promise<void>;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
    user: null,
    profile: null,
    session: null,

    loading: false,
    saving: false,
    error: null,

    bootstrap: async () => {
        set({ loading: true, error: null });
        try {
            const res = await fetch("/api/me", { cache: "no-store" });
            const json = await res.json().catch(() => null);

            if (!res.ok) {
                set({ user: null, profile: null, session: null, error: json?.error ?? "Failed" });
                return;
            }

            set({
                user: json?.user ?? null,
                profile: json?.profile ?? null,
                session: json?.session ?? null,
            });
        } catch (e) {
            set({ error: e instanceof Error ? e.message : "Failed to bootstrap" });
        } finally {
            set({ loading: false });
        }
    },

    refresh: async () => {
        await get().bootstrap();
    },

    updateDisplayName: async (displayName: string) => {
        const name = (displayName ?? "").trim().slice(0, 80);
        if (!name) {
            set({ error: "Nom invalide" });
            return false;
        }

        set({ saving: true, error: null });
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ display_name: name }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                set({ error: json?.error ?? "Failed to update profile" });
                return false;
            }

            set({ profile: json?.profile ?? null });
            return true;
        } catch (e) {
            set({ error: e instanceof Error ? e.message : "Failed to update profile" });
            return false;
        } finally {
            set({ saving: false });
        }
    },

    logout: async () => {
        set({ saving: true, error: null });
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            set({ user: null, profile: null, session: null });
            window.location.href = "/login";
        } finally {
            set({ saving: false });
        }
    },
}));
