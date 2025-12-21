// src/stores/journalStore.ts
import { create } from "zustand";
import { useSessionStore } from "@/stores/sessionStore";

export type JournalKind =
    | "adventure_created"
    | "quests_seeded"
    | "chapter_created"
    | "chapter_started"
    | "quest_started"
    | "quest_done"
    | "quest_reopened"
    | "note";

export type JournalEntry = {
    id: string;
    kind: string;
    title: string;
    content: string | null;
    chapter_id: string | null;
    quest_id: string | null;
    adventure_quest_id?: string | null;
    session_id?: string | null;
    created_at: string;
};

type CreateInput = {
    kind: JournalKind;
    title: string;
    content?: string | null;
    chapter_id?: string | null;
    quest_id?: string | null;
    session_id?: string | null;
    adventure_quest_id?: string | null;
};

type JournalStore = {
    entries: JournalEntry[];
    loading: boolean;
    creating: boolean;
    error: string | null;

    load: (limit?: number) => Promise<void>;
    create: (input: CreateInput) => Promise<boolean>;
    clearError: () => void;
};

async function ensureActiveSessionId(): Promise<string | null> {
    const s = useSessionStore.getState();

    if (s.activeSessionId) return s.activeSessionId;

    // tente bootstrap si pas chargé
    await s.bootstrap();

    return useSessionStore.getState().activeSessionId ?? null;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
    entries: [],
    loading: false,
    creating: false,
    error: null,

    clearError: () => set({ error: null }),

    load: async (limit = 80) => {
        set({ loading: true, error: null });
        try {
            // (Optionnel) s’assure d’avoir une session, sinon l’API va throw
            await ensureActiveSessionId();

            const res = await fetch(`/api/journal?limit=${encodeURIComponent(limit)}`, {
                cache: "no-store",
            });
            const json = await res.json().catch(() => null);

            if (!res.ok) {
                set({ error: json?.error ?? "Failed to load journal", entries: [] });
                return;
            }

            set({ entries: (json?.entries ?? []) as JournalEntry[] });
        } catch (e) {
            set({ error: e instanceof Error ? e.message : "Failed to load journal" });
        } finally {
            set({ loading: false });
        }
    },

    create: async (input) => {
        set({ creating: true, error: null });

        try {
            const sessionId = await ensureActiveSessionId();
            if (!sessionId) {
                set({ error: "No active session" });
                return false;
            }

            const res = await fetch("/api/journal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...input,
                    session_id: sessionId, // ✅ auto
                }),
            });

            const json = await res.json().catch(() => null);

            if (!res.ok) {
                const msg = json?.error ?? json?.message ?? "Failed to create journal entry";
                const details = json?.details ? ` (${json.details})` : "";
                set({ error: `${msg}${details}` });
                return false;
            }

            await get().load();
            return true;
        } catch (e) {
            set({ error: e instanceof Error ? e.message : "Failed to create journal entry" });
            return false;
        } finally {
            set({ creating: false });
        }
    },
}));
