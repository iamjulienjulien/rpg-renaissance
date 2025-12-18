import { create } from "zustand";

type Chapter = {
    id: string;
    adventure_id: string | null;
    adventure_code?: string | null;
    title: string;
    pace: "calme" | "standard" | "intense";
    status: "draft" | "active" | "done";
    created_at: string;
};

type Character = {
    id: string;
    code: string;
    name: string;
    emoji: string;
    archetype: string;
    kind: string;
    vibe: string;
    motto: string;
};

type GameStore = {
    chapter: Chapter | null;
    chapterLoading: boolean;

    character: Character | null;
    characterLoading: boolean;

    loadLatestChapter: () => Promise<void>;
    setChapter: (chapter: Chapter | null) => void;

    loadActiveCharacter: (deviceId: string) => Promise<void>;
    setCharacter: (character: Character | null) => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
    chapter: null,
    chapterLoading: false,

    character: null,
    characterLoading: false,

    setChapter: (chapter) => set({ chapter }),
    setCharacter: (character) => set({ character }),

    loadLatestChapter: async () => {
        set({ chapterLoading: true });
        try {
            const res = await fetch("/api/chapters?latest=1", { cache: "no-store" });
            const json = await res.json();
            set({ chapter: json.chapter ?? null });
        } catch (e) {
            console.error(e);
            set({ chapter: null });
        } finally {
            set({ chapterLoading: false });
        }
    },

    loadActiveCharacter: async (deviceId: string) => {
        set({ characterLoading: true });
        try {
            const res = await fetch(
                `/api/profile/character?deviceId=${encodeURIComponent(deviceId)}`,
                { cache: "no-store" }
            );
            const json = await res.json();
            const character = json?.profile?.character ?? null;
            set({ character });
        } catch (e) {
            console.error(e);
            set({ character: null });
        } finally {
            set({ characterLoading: false });
        }
    },
}));
