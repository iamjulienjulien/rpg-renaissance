import { create } from "zustand";

/* ============================================================================
🧠 TYPES
============================================================================ */

type GenerateQuestMessageArgs = {
    chapter_quest_id: string;
    user_id: string;
    force?: boolean;
};

type GenerateQuestMessageResult = {
    jobId: string;
    status: "queued";
};

type AiStore = {
    questMessageLoading: boolean;
    generateQuestMessage: (
        args: GenerateQuestMessageArgs
    ) => Promise<GenerateQuestMessageResult | null>;
};

/* ============================================================================
🗺️ STORE
============================================================================ */

export const useAiStore = create<AiStore>((set) => ({
    questMessageLoading: false,

    async generateQuestMessage({ chapter_quest_id, user_id, force }) {
        if (!chapter_quest_id || !user_id) {
            console.warn("[aiStore] Missing chapter_quest_id or user_id");
            return null;
        }

        set({ questMessageLoading: true });

        try {
            const res = await fetch("/api/ai/quest-message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chapter_quest_id,
                    user_id,
                    force: !!force,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null);
                console.error("[aiStore] quest-message failed", err);
                return null;
            }

            const data = (await res.json()) as GenerateQuestMessageResult;
            return data;
        } catch (err) {
            console.error("[aiStore] quest-message error", err);
            return null;
        } finally {
            set({ questMessageLoading: false });
        }
    },
}));
