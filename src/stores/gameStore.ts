// src/stores/gameStore.ts
import { create } from "zustand";
import { useToastStore } from "@/stores/toastStore";
import { useJournalStore } from "@/stores/journalStore";
import { useSessionStore, type GameSession } from "@/stores/sessionStore";

/* ============================================================================
🧱 TYPES
============================================================================ */

/** 🧭 Aventure (carte globale) */
export type Adventure = {
    id: string;
    code: string;
    title: string;
    type?: string | null;
};

/** 📌 Quête “source” (adventure_quests) */
export type AdventureQuest = {
    id: string;
    title: string;
    description: string | null;
    room_code: string | null;
    difficulty: number;
    estimate_min: number | null;
};

/** 🧩 Quête du chapitre enrichie (join adventure_quests) */
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

/** 🗺️ Chapitre (session/adventure) */
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

/** 👤 Profil (player_profiles + personnage lié) */
export type Profile = {
    user_id: string;
    display_name: string | null;
    character_id: string | null;
    character: Character | null;
} | null;

/** 🎯 Quête dans un chapitre */
export type ChapterQuest = {
    id: string;
    quest_id: string;
    chapter_id: string;
    status: "todo" | "doing" | "done";
};

/** 🧩 Infos minimales sur une quête (utile pour toast/journal) */
export type QuestLite = {
    id: string;
    title: string;
    room_code?: string | null;
    difficulty?: number | null;
};

/** ⭐ Renommée (ex: progression globale) */
export type Renown = { value: number; level: number };

export type RenownGainEvent = {
    delta: number;
    before: Renown | null;
    after: Renown;
    createdAt: number;
    reason?: string;
};

/* ============================================================================
🏪 FONCTIONS
============================================================================ */

/** 🔧 Construit un contenu journal lisible (optionnellement avec la pièce) */
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

    // 🍞 Toast
    toast.push({
        tone: input.tone,
        title: input.toastTitle,
        message: input.toastMessage,
    });

    // 📓 Journal (async fire-and-forget)
    void journal.create({
        kind: input.journalKind,
        title: input.journalTitle,
        content: input.journalContent,
        quest_id: input.questId ?? null,
    });
}

function renownDeltaForDifficulty(d?: number | null) {
    // ajuste comme tu veux 🧪
    if (d == null) return 10;
    if (d <= 1) return 10; // 🟢
    if (d === 2) return 20; // 🟡
    return 35; // 🔴
}

/* ============================================================================
🏪 STORE
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
    loading: boolean; // bootstrap/refresh
    saving: boolean; // activation personnage
    characterLoading: boolean; // compat (si tu l’utilises)
    error: string | null;

    // sélection (utile pour UI)
    selectedId: string | null;
    getSelected: () => Character | null;

    // actions (ex characterStore)
    bootstrap: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    activateCharacter: (characterId: string) => Promise<void>;

    // compat (ex gameStore)
    loadActiveCharacter: () => Promise<void>;
    // setCharacter: (character: Character | null) => void;

    /* ---------------------------- ⚔️ QUESTS ----------------------------- */
    startQuest: (chapterQuestId: string, quest?: QuestLite | null) => Promise<ChapterQuest | null>;
    finishQuest: (chapterQuestId: string, quest?: QuestLite | null) => Promise<ChapterQuest | null>;

    /* ---------------------------- ⭐ RENOMMÉE ---------------------------- */
    renown: Renown | null;
    renownLoading: boolean;

    addRenown: (amount: number, reason?: string) => Promise<Renown | null>;

    lastRenownGain: RenownGainEvent | null;
    clearLastRenownGain: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
    currentAdventure: null,
    currentChapter: null,
    currentQuests: [],

    /** 🚀 Bootstrap: charge l’essentiel du jeu (persos + profil + chapitre + renommée) */
    /** 🚀 Bootstrap: charge l’essentiel du jeu (persos + profil + chapitre + aventure + quêtes + renommée) */
    bootstrap: async () => {
        set({
            loading: true,
            characterLoading: true,
            renownLoading: true,
            error: null,
        });

        const res = await fetch("/api/session/active", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
            set({ error: json?.error ?? "Failed to load active session" });
            return;
        }

        const session = (json?.session ?? null) as GameSession | null;

        const sessionId = session?.id ?? null;
        // console.log("sessionId", sessionId);

        try {
            // ✅ 1) Ce qui ne dépend de rien (en parallèle)
            const [charsRes, profRes, chapterRes, renownRes] = await Promise.allSettled([
                fetch("/api/characters", { cache: "no-store" }),
                fetch("/api/profile/character", { cache: "no-store" }),
                fetch("/api/chapters?latest=1", { cache: "no-store" }),
                fetch("/api/renown?session_id=" + sessionId, { cache: "no-store" }), // GET côté API renown
            ]);

            // --- 🧙 Characters (critique)
            if (charsRes.status !== "fulfilled") throw new Error("Failed to load characters");
            const charsJson = await charsRes.value.json().catch(() => null);
            if (!charsRes.value.ok)
                throw new Error(charsJson?.error ?? "Failed to load characters");
            const characters = (charsJson?.characters ?? []) as Character[];

            // --- 👤 Profile (optionnel)
            let profile: Profile = null;
            let selectedId: string | null = null;

            if (profRes.status === "fulfilled") {
                const profJson = await profRes.value.json().catch(() => null);
                if (profRes.value.ok) {
                    profile = (profJson?.profile ?? null) as Profile;
                    selectedId = (profile?.character_id ?? null) as string | null;
                }
            }

            // --- 🗺️ Chapter (optionnel)
            let chapter: Chapter | null = null;
            if (chapterRes.status === "fulfilled") {
                const chapterJson = await chapterRes.value.json().catch(() => null);
                if (chapterRes.value.ok) chapter = (chapterJson?.chapter ?? null) as Chapter | null;
            }

            // --- ⭐ Renown (optionnel)
            let renown: Renown | null = null;
            if (renownRes.status === "fulfilled") {
                const renownJson = await renownRes.value.json().catch(() => null);
                if (renownRes.value.ok) renown = (renownJson?.renown ?? null) as Renown | null;
            }

            // ✅ 2) Ce qui dépend du chapitre (en parallèle, best-effort)
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

                // Aventure
                if (advRes.status === "fulfilled" && advRes.value) {
                    const advJson = await advRes.value.json().catch(() => null);
                    if (advRes.value.ok) {
                        currentAdventure = (advJson?.adventure ?? null) as Adventure | null;
                    }
                }

                // Quêtes
                if (questsRes.status === "fulfilled") {
                    const qJson = await questsRes.value.json().catch(() => null);
                    if (questsRes.value.ok) {
                        currentQuests = (qJson?.items ?? []) as ChapterQuestFull[];
                    }
                }
            }

            console.log("currentAdventure", currentAdventure);
            console.log("currentChapter", chapter);
            console.log("currentQuests", currentQuests);

            // ✅ 3) Commit snapshot
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

    /* =========================================================================
    🗺️ CHAPTER
    ========================================================================= */

    chapter: null,
    chapterLoading: false,

    /** ✍️ Set chapter en local */
    setChapter: (chapter) => set({ chapter }),

    /** 🧭 Charge le dernier chapitre actif (API) */
    loadLatestChapter: async () => {
        set({ chapterLoading: true });
        try {
            const res = await fetch("/api/chapters?latest=1", { cache: "no-store" });
            const json = await res.json().catch(() => null);

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
    (fusion de l’ancien characterStore)
    ========================================================================= */

    characters: [],
    profile: null,

    loading: false,
    saving: false,
    characterLoading: false,
    error: null,

    selectedId: null,

    /** 🎯 Récupère le perso sélectionné (ou le perso du profil si rien) */
    getSelected: () => {
        const { selectedId, characters, profile } = get();
        if (!selectedId) return profile?.character ?? null;
        return characters.find((c) => c.id === selectedId) ?? profile?.character ?? null;
    },

    /** 🔄 Recharge uniquement le profil (perso actif + display_name) */
    refreshProfile: async () => {
        set({ loading: true, characterLoading: true, error: null });
        try {
            const res = await fetch("/api/profile/character", { cache: "no-store" });
            const json = await res.json().catch(() => null);

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

    /** ✅ Active un personnage (persisté en BDD via /api/profile/character) */
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
            const selected = get().characters.find((c) => c.id === characterId) ?? null;

            // ⚡ Mise à jour locale rapide (UX instant)
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

            // 🍞 Toast “nice”
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

    /* -------------------------------------------------------------------------
    🧩 Compat API (ancien gameStore)
    ------------------------------------------------------------------------- */

    /** 🧲 Alias: garde l’ancienne signature */
    loadActiveCharacter: async () => {
        await get().refreshProfile();
    },

    /** 🧷 Permet d’injecter un perso dans le profil (rare, mais compat) */
    // setCharacter: (character) => {
    //     set((s) => ({
    //         profile: s.profile
    //             ? { ...s.profile, character, character_id: character?.id ?? s.profile.character_id }
    //             : {
    //                   user_id: "me",
    //                   display_name: null,
    //                   character_id: character?.id ?? null,
    //                   character: character ?? null,
    //               },
    //     }));
    // },

    /* ============================================================================
⚔️ QUESTS ACTIONS (toast + journal)
============================================================================ */

    // ✅ NEW: démarre une quête (status=doing) + toast + journal
    startQuest: async (chapterQuestId, quest) => {
        try {
            const res = await fetch(`/api/chapter-quests/${chapterQuestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "doing" }),
            });

            const json = await res.json().catch(() => null);

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

            const cq = (json?.chapterQuest ?? null) as ChapterQuest | null;

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

    // ✅ NEW: termine une quête (status=done) + toast + journal
    finishQuest: async (chapterQuestId, quest) => {
        try {
            const res = await fetch(`/api/chapter-quests/${chapterQuestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "done" }),
            });

            const json = await res.json().catch(() => null);

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

            const cq = (json?.chapterQuest ?? null) as ChapterQuest | null;
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

            // ✅ Renown (non-bloquant)
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
    🏆 RENOWN / LEVEL
    ======================================================================== */

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

            const json = await res.json().catch(() => null);

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
}));
