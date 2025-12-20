// src/stores/characterStore.ts
import { create } from "zustand";

export type AiStyle = {
    tone: string;
    style: string;
    verbosity: "short" | "normal" | "rich";
};

export type Character = {
    id: string;
    code: string;
    name: string;
    emoji: string;
    kind: "history" | "fiction" | string;
    archetype: string;
    vibe: string;
    motto: string;
    ai_style: AiStyle;
    is_enabled?: boolean;
    sort?: number;
};

type Profile = {
    user_id: string;
    display_name: string | null;
    character_id: string | null;
    character: Character | null;
} | null;

type CharacterStore = {
    characters: Character[];
    profile: Profile;

    loading: boolean;
    saving: boolean;
    error: string | null;

    selectedId: string | null;
    getSelected: () => Character | null;

    bootstrap: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    activateCharacter: (characterId: string) => Promise<void>;
};

export const useCharacterStore = create<CharacterStore>((set, get) => ({
    characters: [],
    profile: null,

    loading: false,
    saving: false,
    error: null,

    selectedId: null,

    getSelected: () => {
        const { selectedId, characters, profile } = get();
        if (!selectedId) return profile?.character ?? null;
        return characters.find((c) => c.id === selectedId) ?? profile?.character ?? null;
    },

    bootstrap: async () => {
        set({ loading: true, error: null });
        try {
            const [charsRes, profRes] = await Promise.all([
                fetch("/api/characters", { cache: "no-store" }),
                fetch("/api/profile/character", { cache: "no-store" }),
            ]);

            const charsJson = await charsRes.json().catch(() => null);
            const profJson = await profRes.json().catch(() => null);

            if (!charsRes.ok) {
                throw new Error(charsJson?.error ?? "Failed to load characters");
            }

            const characters = (charsJson?.characters ?? []) as Character[];

            let profile: Profile = null;
            let selectedId: string | null = null;

            if (profRes.ok) {
                profile = (profJson?.profile ?? null) as Profile;
                selectedId = (profile?.character_id ?? null) as string | null;
            }

            set({ characters, profile, selectedId });
        } catch (e) {
            set({
                characters: [],
                profile: null,
                selectedId: null,
                error: e instanceof Error ? e.message : "Bootstrap failed",
            });
        } finally {
            set({ loading: false });
        }
    },

    refreshProfile: async () => {
        set({ loading: true, error: null });
        try {
            const res = await fetch("/api/profile/character", { cache: "no-store" });
            const json = await res.json().catch(() => null);

            if (!res.ok) throw new Error(json?.error ?? "Failed to load profile");

            const profile = (json?.profile ?? null) as Profile;
            set({ profile, selectedId: (profile?.character_id ?? null) as string | null });
        } catch (e) {
            set({
                profile: null,
                selectedId: null,
                error: e instanceof Error ? e.message : "refreshProfile failed",
            });
        } finally {
            set({ loading: false });
        }
    },

    activateCharacter: async (characterId: string) => {
        if (!characterId) return;

        set({ saving: true, error: null });
        try {
            const res = await fetch("/api/profile/character", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ characterId }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Save failed");

            const profile = (json?.profile ?? null) as Profile;

            // Mise à jour rapide locale
            const selected = get().characters.find((c) => c.id === characterId) ?? null;

            set({
                selectedId: characterId,
                profile: profile
                    ? {
                          ...profile,
                          character: selected ?? profile.character ?? null,
                      }
                    : {
                          user_id: "me",
                          display_name: null,
                          character_id: characterId,
                          character: selected,
                      },
            });
        } catch (e) {
            set({ error: e instanceof Error ? e.message : "activateCharacter failed" });
        } finally {
            set({ saving: false });
        }
    },
}));
