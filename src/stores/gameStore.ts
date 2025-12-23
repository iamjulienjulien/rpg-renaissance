// src/stores/gameStore.ts
import { create } from "zustand";
import { useToastStore } from "@/stores/toastStore";
import { useJournalStore } from "@/stores/journalStore";
import { useSessionStore, type GameSession } from "@/stores/sessionStore";

/* ============================================================================
🧱 TYPES (données métier)
============================================================================ */

/** 🧭 Aventure (carte globale) */
export type Adventure = {
    id: string;
    code: string;
    title: string;
    type?: string | null;
};

/** 📌 Quête “source” (table: adventure_quests) */
export type AdventureQuest = {
    id: string;
    title: string;
    description: string | null;
    room_code: string | null;
    difficulty: number;
    estimate_min: number | null;
};

/** 🧩 Quête du chapitre enrichie (table: chapter_quests + join adventure_quests) */
export type ChapterQuestFull = {
    id: string;
    chapter_id: string;
    adventure_quest_id: string;
    status: "todo" | "doing" | "done";
    room_code: string | null;
    created_at: string;
    adventure_quests: AdventureQuest | AdventureQuest[] | null;
    room_title?: string | null;
};

/** 🗺️ Chapitre */
export type Chapter = {
    id: string;
    adventure_id: string | null;
    adventure_code?: string | null;
    title: string;
    pace: "calme" | "standard" | "intense";
    status: "draft" | "active" | "done";
    created_at: string;
};

/** 🎭 Style IA (voix) */
export type AiStyle = {
    tone: string;
    style: string;
    verbosity: "short" | "normal" | "rich";
};

/** 🧙 Personnage */
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

/** 👤 Profil joueur (player_profiles + personnage lié) */
export type Profile = {
    user_id: string;
    display_name: string | null;
    character_id: string | null;
    character: Character | null;
} | null;

/** 🎯 Quête “lite” (utile toast/journal) */
export type QuestLite = {
    id: string;
    title: string;
    room_code?: string | null;
    difficulty?: number | null;
};

/** ⭐ Renommée */
export type Renown = { value: number; level: number };

export type RenownGainEvent = {
    delta: number;
    before: Renown | null;
    after: Renown;
    createdAt: number;
    reason?: string;
};

/** 💬 Encouragement MJ (cache store, non BDD) */
export type Encouragement = {
    title: string;
    message: string;
    createdAt: number;
    meta?: {
        model?: string;
        tone?: string;
        style?: string;
        verbosity?: string;
        character_name?: string | null;
        character_emoji?: string | null;
    };
};

/* ============================================================================
🧰 HELPERS (logiques locales, sans état)
============================================================================ */

function safeJson(res: Response) {
    return res.json().catch(() => null);
}

/** 🔧 Contenu journal lisible (optionnellement avec la pièce) */
function questLine(quest?: QuestLite | null) {
    if (!quest?.title) return null;
    return `${quest.title}${quest.room_code ? ` (🚪 ${quest.room_code})` : ""}`;
}

/** 🧾 Helper: toast + journal pour un événement de quête */
function logQuestEvent(input: {
    tone: "success" | "error" | "info" | "warning";
    toastTitle: string;
    toastMessage?: string;
    journalKind: any; // JournalKind (si tu veux: import type JournalKind et remplace any)
    journalTitle: string;
    journalContent: string;
    questId?: string | null;
}) {
    const toast = useToastStore.getState();
    const journal = useJournalStore.getState();

    toast.push({
        tone: input.tone,
        title: input.toastTitle,
        message: input.toastMessage,
    });

    void journal.create({
        kind: input.journalKind,
        title: input.journalTitle,
        content: input.journalContent,
        quest_id: input.questId ?? null,
    });
}

function renownDeltaForDifficulty(d?: number | null) {
    if (d == null) return 10;
    if (d <= 1) return 10; // 🟢
    if (d === 2) return 20; // 🟡
    return 35; // 🔴
}

/* ============================================================================
🏪 STORE (état + actions)
============================================================================ */

type GameStore = {
    /* --------------------------- 🎮 SNAPSHOT JEU -------------------------- */
    currentAdventure: Adventure | null;
    currentChapter: Chapter | null;
    currentQuests: ChapterQuestFull[];

    /* ----------------------------- 🗺️ CHAPTER ---------------------------- */
    chapter: Chapter | null;
    chapterLoading: boolean;
    setChapter: (chapter: Chapter | null) => void;
    loadLatestChapter: () => Promise<void>;

    /* --------------------------- 🧙 CHARACTERS --------------------------- */
    characters: Character[];
    profile: Profile;

    // états UI
    loading: boolean;
    saving: boolean;
    characterLoading: boolean;
    error: string | null;

    // sélection UI
    selectedId: string | null;
    getSelected: () => Character | null;

    // actions
    bootstrap: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    activateCharacter: (characterId: string) => Promise<void>;
    loadActiveCharacter: () => Promise<void>;

    /* ---------------------------- ⚔️ QUESTS ----------------------------- */
    startQuest: (chapterQuestId: string, quest?: QuestLite | null) => Promise<any | null>;
    finishQuest: (chapterQuestId: string, quest?: QuestLite | null) => Promise<any | null>;

    // ✅ NEW: Affecter une quête (adventure_quests) au chapitre courant (crée chapter_quests)
    assignQuestToCurrentChapter: (adventureQuestId: string) => Promise<boolean>;

    /* ---------------------------- ⭐ RENOMMÉE ---------------------------- */
    renown: Renown | null;
    renownLoading: boolean;
    addRenown: (amount: number, reason?: string) => Promise<Renown | null>;
    lastRenownGain: RenownGainEvent | null;
    clearLastRenownGain: () => void;

    /* -------------------------- 💬 ENCOURAGEMENT ------------------------- */
    encouragementByChapterQuestId: Record<string, Encouragement | undefined>;
    encouragementLoading: boolean;

    askEncouragement: (
        chapterQuestId: string,
        input: {
            quest_title: string;
            room_code?: string | null;
            difficulty?: number | null;
            mission_md?: string | null;
        }
    ) => Promise<Encouragement | null>;

    clearEncouragement: (chapterQuestId: string) => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
    /* =========================================================================
    🎮 SNAPSHOT JEU
    ========================================================================= */

    currentAdventure: null,
    currentChapter: null,
    currentQuests: [],

    /* =========================================================================
    🗺️ CHAPTER
    ========================================================================= */

    chapter: null,
    chapterLoading: false,

    setChapter: (chapter) => set({ chapter }),

    loadLatestChapter: async () => {
        set({ chapterLoading: true });
        try {
            const res = await fetch("/api/chapters?latest=1", { cache: "no-store" });
            const json = await safeJson(res);

            if (!res.ok) {
                console.error("loadLatestChapter failed:", json?.error ?? res.statusText);
                set({ chapter: null });
                return;
            }

            set({ chapter: json?.chapter ?? null });
        } catch (e) {
            console.error(e);
            set({ chapter: null });
        } finally {
            set({ chapterLoading: false });
        }
    },

    /* =========================================================================
    🧙 CHARACTERS / 👤 PROFILE
    ========================================================================= */

    characters: [],
    profile: null,

    loading: false,
    saving: false,
    characterLoading: false,
    error: null,

    selectedId: null,

    getSelected: () => {
        const { selectedId, characters, profile } = get();
        if (!selectedId) return profile?.character ?? null;
        return characters.find((c) => c.id === selectedId) ?? profile?.character ?? null;
    },

    bootstrap: async () => {
        set({
            loading: true,
            characterLoading: true,
            renownLoading: true,
            error: null,
        });

        const res = await fetch("/api/session/active", { cache: "no-store" });
        const json = await safeJson(res);

        if (!res.ok) {
            set({ error: json?.error ?? "Failed to load active session" });
            return;
        }

        const session = (json?.session ?? null) as GameSession | null;
        const sessionId = session?.id ?? null;

        try {
            const [charsRes, profRes, chapterRes, renownRes] = await Promise.allSettled([
                fetch("/api/characters", { cache: "no-store" }),
                fetch("/api/profile/character", { cache: "no-store" }),
                fetch("/api/chapters?latest=1", { cache: "no-store" }),
                fetch("/api/renown?session_id=" + sessionId, { cache: "no-store" }),
            ]);

            // Characters (critique)
            if (charsRes.status !== "fulfilled") throw new Error("Failed to load characters");
            const charsJson = await safeJson(charsRes.value);
            if (!charsRes.value.ok)
                throw new Error(charsJson?.error ?? "Failed to load characters");
            const characters = (charsJson?.characters ?? []) as Character[];

            // Profile (optionnel)
            let profile: Profile = null;
            let selectedId: string | null = null;

            if (profRes.status === "fulfilled") {
                const profJson = await safeJson(profRes.value);
                if (profRes.value.ok) {
                    profile = (profJson?.profile ?? null) as Profile;
                    selectedId = (profile?.character_id ?? null) as string | null;
                }
            }

            // Chapter (optionnel)
            let chapter: Chapter | null = null;
            if (chapterRes.status === "fulfilled") {
                const chapterJson = await safeJson(chapterRes.value);
                if (chapterRes.value.ok) chapter = (chapterJson?.chapter ?? null) as Chapter | null;
            }

            // Renown (optionnel)
            let renown: Renown | null = null;
            if (renownRes.status === "fulfilled") {
                const renownJson = await safeJson(renownRes.value);
                if (renownRes.value.ok) renown = (renownJson?.renown ?? null) as Renown | null;
            }

            // Dépend du chapitre (best-effort)
            let currentAdventure: Adventure | null = null;
            let currentQuests: ChapterQuestFull[] = [];

            if (chapter?.id) {
                const [advRes, questsRes] = await Promise.allSettled([
                    chapter.adventure_id
                        ? fetch(`/api/adventures?id=${encodeURIComponent(chapter.adventure_id)}`, {
                              cache: "no-store",
                          })
                        : Promise.resolve(null as any),
                    fetch(
                        `/api/chapter-quests?status=doing&chapterId=${encodeURIComponent(chapter.id)}`,
                        {
                            cache: "no-store",
                        }
                    ),
                ]);

                if (advRes.status === "fulfilled" && advRes.value) {
                    const advJson = await safeJson(advRes.value);
                    if (advRes.value.ok)
                        currentAdventure = (advJson?.adventure ?? null) as Adventure | null;
                }

                if (questsRes.status === "fulfilled") {
                    const qJson = await safeJson(questsRes.value);
                    if (questsRes.value.ok)
                        currentQuests = (qJson?.items ?? []) as ChapterQuestFull[];
                }
            }

            set({
                characters,
                profile,
                selectedId,
                chapter,
                renown,
                currentChapter: chapter,
                currentAdventure,
                currentQuests,
            });
        } catch (e) {
            set({
                characters: [],
                profile: null,
                selectedId: null,
                chapter: null,
                renown: null,
                currentChapter: null,
                currentAdventure: null,
                currentQuests: [],
                error: e instanceof Error ? e.message : "Bootstrap failed",
            });
        } finally {
            set({
                loading: false,
                characterLoading: false,
                renownLoading: false,
            });
        }
    },

    refreshProfile: async () => {
        set({ loading: true, characterLoading: true, error: null });
        try {
            const res = await fetch("/api/profile/character", { cache: "no-store" });
            const json = await safeJson(res);

            if (!res.ok) throw new Error(json?.error ?? "Failed to load profile");

            const profile = (json?.profile ?? null) as Profile;

            set({
                profile,
                selectedId: (profile?.character_id ?? null) as string | null,
            });
        } catch (e) {
            set({
                profile: null,
                selectedId: null,
                error: e instanceof Error ? e.message : "refreshProfile failed",
            });
        } finally {
            set({ loading: false, characterLoading: false });
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

            const json = await safeJson(res);
            if (!res.ok) throw new Error(json?.error ?? "Save failed");

            const profile = (json?.profile ?? null) as Profile;
            const selected = get().characters.find((c) => c.id === characterId) ?? null;

            set({
                selectedId: characterId,
                profile: profile
                    ? { ...profile, character: selected ?? profile.character ?? null }
                    : {
                          user_id: "me",
                          display_name: null,
                          character_id: characterId,
                          character: selected,
                      },
            });

            useToastStore
                .getState()
                .success(
                    "Personnage activé",
                    selected ? `${selected.emoji} ${selected.name}` : undefined
                );
        } catch (e) {
            set({ error: e instanceof Error ? e.message : "activateCharacter failed" });
            useToastStore.getState().error("Échec", "Activation du personnage impossible");
        } finally {
            set({ saving: false });
        }
    },

    loadActiveCharacter: async () => {
        await get().refreshProfile();
    },

    /* =========================================================================
    ⚔️ QUESTS (start/finish + journal + renown)
    ========================================================================= */

    startQuest: async (chapterQuestId, quest) => {
        try {
            const res = await fetch(`/api/chapter-quests/${chapterQuestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "doing" }),
            });

            const json = await safeJson(res);

            if (!res.ok) {
                const msg = json?.error ?? "Impossible de démarrer la quête";
                logQuestEvent({
                    tone: "error",
                    toastTitle: "Échec",
                    toastMessage: msg,
                    journalKind: "note",
                    journalTitle: "⚠️ Démarrage de quête échoué",
                    journalContent: msg,
                    questId: quest?.id ?? null,
                });
                return null;
            }

            const cq = json?.chapterQuest ?? null;
            const line = questLine(quest);

            logQuestEvent({
                tone: "success",
                toastTitle: "Quête démarrée",
                toastMessage: line ? `▶️ ${line}` : undefined,
                journalKind: "quest_started",
                journalTitle: "▶️ Quête démarrée",
                journalContent: line ? `Tu démarres: ${line}.` : "Tu démarres une quête.",
                questId: quest?.id ?? null,
            });

            return cq;
        } catch (e) {
            console.error(e);
            logQuestEvent({
                tone: "error",
                toastTitle: "Échec",
                toastMessage: "Erreur réseau",
                journalKind: "note",
                journalTitle: "⚠️ Démarrage de quête échoué",
                journalContent: "Erreur réseau lors du démarrage de la quête.",
                questId: quest?.id ?? null,
            });
            return null;
        }
    },

    finishQuest: async (chapterQuestId, quest) => {
        try {
            const res = await fetch(`/api/chapter-quests/${chapterQuestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "done" }),
            });

            const json = await safeJson(res);

            if (!res.ok) {
                const msg = json?.error ?? "Impossible de terminer la quête";
                logQuestEvent({
                    tone: "error",
                    toastTitle: "Échec",
                    toastMessage: msg,
                    journalKind: "note",
                    journalTitle: "⚠️ Fin de quête échouée",
                    journalContent: msg,
                    questId: quest?.id ?? null,
                });
                return null;
            }

            const cq = json?.chapterQuest ?? null;
            const line = questLine(quest);

            logQuestEvent({
                tone: "success",
                toastTitle: "Quête terminée",
                toastMessage: line ? `✅ ${line}` : undefined,
                journalKind: "quest_done",
                journalTitle: "✅ Quête terminée",
                journalContent: line ? `Victoire: ${line}.` : "Une quête a été terminée.",
                questId: quest?.id ?? null,
            });

            const delta = renownDeltaForDifficulty(quest?.difficulty ?? null);
            void get().addRenown(delta, line ? `Quête: ${line}` : "Quête terminée");

            return cq;
        } catch (e) {
            console.error(e);
            logQuestEvent({
                tone: "error",
                toastTitle: "Échec",
                toastMessage: "Erreur réseau",
                journalKind: "note",
                journalTitle: "⚠️ Fin de quête échouée",
                journalContent: "Erreur réseau lors de la fin de la quête.",
                questId: quest?.id ?? null,
            });
            return null;
        }
    },

    /* =========================================================================
    ✅ NEW: AFFECTATION (backlog -> chapter)
    ========================================================================= */

    assignQuestToCurrentChapter: async (adventureQuestId: string) => {
        const toast = useToastStore.getState();
        const journal = useJournalStore.getState();

        // 1) Trouver un chapitre “courant”
        let chapterId = get().chapter?.id ?? get().currentChapter?.id ?? null;

        if (!chapterId) {
            await get().loadLatestChapter();
            chapterId = get().chapter?.id ?? null;
        }

        if (!chapterId) {
            toast.error("Affectation impossible", "Aucun chapitre actif.");
            return false;
        }

        // 2) Appeler l’API qui crée les chapter_quests
        try {
            const res = await fetch("/api/chapter-quests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chapter_id: chapterId,
                    adventure_quest_ids: [adventureQuestId],
                }),
            });

            const json = await safeJson(res);

            if (!res.ok) {
                toast.error("Affectation impossible", json?.error ?? "Erreur serveur");
                return false;
            }

            toast.success("Quête affectée", "Ajoutée au chapitre courant.");

            void journal.create({
                kind: "note",
                title: "➕ Quête affectée au chapitre",
                content: `Une quête du backlog a été ajoutée au chapitre en cours.`,
                quest_id: adventureQuestId,
            });

            return true;
        } catch (e) {
            console.error(e);
            toast.error("Affectation impossible", "Erreur réseau");
            return false;
        }
    },

    /* =========================================================================
    🏆 RENOWN / LEVEL
    ========================================================================= */

    renown: null,
    renownLoading: false,

    lastRenownGain: null,
    clearLastRenownGain: () => set({ lastRenownGain: null }),

    addRenown: async (amount, reason) => {
        const sessionId = useSessionStore.getState().activeSessionId;
        if (!sessionId) return null;

        const before = get().renown ?? null;

        try {
            set({ renownLoading: true });

            const res = await fetch("/api/renown", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: sessionId, amount }),
            });

            const json = await safeJson(res);

            if (!res.ok) {
                const msg = json?.error ?? "Impossible d’ajouter de la renommée";
                useToastStore.getState().error("Renommée", msg);
                return null;
            }

            const after = (json?.renown ?? null) as Renown | null;
            if (!after) return null;

            set({
                renown: after,
                lastRenownGain: {
                    delta: amount,
                    before,
                    after,
                    createdAt: Date.now(),
                    reason,
                },
            });

            return after;
        } catch (e) {
            console.error(e);
            useToastStore.getState().error("Renommée", "Erreur réseau");
            return null;
        } finally {
            set({ renownLoading: false });
        }
    },

    /* =========================================================================
    💬 ENCOURAGEMENT (MJ)
    ========================================================================= */

    encouragementByChapterQuestId: {},
    encouragementLoading: false,

    clearEncouragement: (chapterQuestId) =>
        set((s) => {
            const next = { ...s.encouragementByChapterQuestId };
            delete next[chapterQuestId];
            return { encouragementByChapterQuestId: next };
        }),

    askEncouragement: async (chapterQuestId, input) => {
        try {
            set({ encouragementLoading: true });

            const res = await fetch("/api/encouragement", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });

            const json = await safeJson(res);

            if (!res.ok) {
                const msg = json?.error ?? "Impossible de générer un encouragement";
                useToastStore.getState().error("Maître du jeu", msg);
                return null;
            }

            const e = json?.encouragement;
            if (!e?.message) return null;

            const encouragement: Encouragement = {
                title: e.title ?? "Encouragement",
                message: e.message,
                createdAt: Date.now(),
                meta: json?.meta ?? undefined,
            };

            set((s) => ({
                encouragementByChapterQuestId: {
                    ...s.encouragementByChapterQuestId,
                    [chapterQuestId]: encouragement,
                },
            }));

            return encouragement;
        } catch (err) {
            console.error(err);
            useToastStore.getState().error("Maître du jeu", "Erreur réseau");
            return null;
        } finally {
            set({ encouragementLoading: false });
        }
    },
}));
