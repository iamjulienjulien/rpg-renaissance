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
    title: string;
    description: string | null;
    created_at: string;
    instance_code: string | null;
    type_id: string | null;
    type_code?: string | null;
    type_title?: string | null;
    context_text?: string | null;
};

/** 🧬 Type d’aventure (catalogue) */
export type AdventureType = {
    id: string;
    code: string;
    title: string;
    description: string | null;
    created_at: string;
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

type AdventureRoom = {
    id: string;
    adventure_id: string;
    code: string;
    title: string;
    emoji: string;
    sort: number;
    source: "template" | "custom";
    template_id: string | null;
};

type RoomTemplate = {
    emoji: string;
    id: string;
    code: string;
    title: string;
    icon: string | null;
    sort: number;
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
    mission_md?: string | null;
};

/** ⭐ Renommée */
export type Renown = { value: number; level: number };

export type RenownGainEvent = {
    chapterQuestId: string;
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

export type Congratulations = {
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

/** 📖 Récit de chapitre (cache + BDD via /api/chapter-story) */
export type ChapterStoryRow = {
    chapter_id: string;
    session_id: string;
    story_json: any;
    story_md: string;
    model: string;
    updated_at: string;
    created_at?: string;
};

/* ============================================================================
🧰 HELPERS (logiques locales, sans état)
============================================================================ */

async function fetchJson(res: Response) {
    return res.json().catch(() => null);
}

async function apiGet<T>(
    url: string
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
    try {
        const res = await fetch(url, { cache: "no-store" });
        const json = await fetchJson(res);

        if (!res.ok) {
            return { ok: false, error: json?.error ?? res.statusText ?? "Request failed" };
        }

        return { ok: true, data: json as T };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Network error" };
    }
}

async function apiPost<T>(
    url: string,
    body: unknown
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const json = await fetchJson(res);

        if (!res.ok) {
            return { ok: false, error: json?.error ?? res.statusText ?? "Request failed" };
        }

        return { ok: true, data: json as T };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Network error" };
    }
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
    journalKind: any;
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
        adventure_quest_id: input.questId ?? null,
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
    currentCharacter: Character | null;

    /* --------------------------- 🗺️ ADVENTURE --------------------------- */
    startingAdventure: boolean;

    startAdventure: (input: {
        type_code: string;
        title?: string; // titre instance (optionnel)
        instance_code?: string; // optionnel si tu veux forcer
        journal?: {
            emoji?: string;
            title?: string;
            content?: string;
        };
    }) => Promise<{ adventureId: string; instance_code?: string | null } | null>;

    /* --------------------- 🧭 START ADVENTURE SETUP --------------------- */
    startAdventureLoading: boolean;
    startAdventureRefreshing: boolean;

    startAdventureInstanceCode: string | null;
    startAdventureData: {
        adventure: Adventure | null;
        rooms: AdventureRoom[];
        backlog: AdventureQuest[];
        context_text: string;
    };

    bootstrapStartAdventure: (instanceCode: string) => Promise<void>;
    refreshStartAdventure: () => Promise<void>;

    setStartAdventureContextText: (text: string) => void;
    saveStartAdventureContext: () => Promise<void>;

    addBacklogQuestToStartAdventure: (input: {
        room_code: string | null;
        title: string;
        difficulty: 1 | 2 | 3;
    }) => Promise<boolean>;

    generateBacklogForStartAdventure: (input: { perRoomCount: 5 | 8 | 12 }) => Promise<number>;

    launchStartAdventureFirstChapter: () => Promise<string | null>;

    /* ------------------------ 🧬 ADVENTURE TYPES ------------------------ */
    adventureTypes: AdventureType[];
    adventureTypesLoading: boolean;
    adventureTypesError: string | null;
    getAdventureTypes: (opts?: { force?: boolean }) => Promise<AdventureType[]>;

    /* ----------------------------- 🗺️ CHAPTER ---------------------------- */
    chapter: Chapter | null;
    chapterLoading: boolean;
    setChapter: (chapter: Chapter | null) => void;
    loadLatestChapter: () => Promise<void>;

    /* --------------------- 🗡️ START CHAPTER SETUP --------------------- */
    startChapterLoading: boolean;
    startChapterStarting: boolean;

    startChapterCode: string | null;
    startChapterData: {
        chapter: Chapter | null;
        rooms: AdventureRoom[];
        backlog: AdventureQuest[];
        context_text: string;
    };

    setStartChapterContextText: (text: string) => void;
    saveStartChapterContext: () => Promise<void>;

    bootstrapStartChapter: (chapterCode: string) => Promise<void>;

    startChapterWithQuests: (input: {
        chapter_id: string;
        adventure_quest_ids: string[];
    }) => Promise<boolean>;

    /* --------------------------- 🧙 CHARACTERS --------------------------- */
    characters: Character[];
    rooms: AdventureRoom[];
    templates: RoomTemplate[];
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
    assignQuestToCurrentChapter: (adventureQuestId: string) => Promise<boolean>;

    /* ---------------------------- ⭐ RENOMMÉE ---------------------------- */
    renown: Renown | null;
    renownLoading: boolean;
    addRenown: (amount: number, reason?: string, chapterQuestId?: string) => Promise<Renown | null>;
    lastRenownGain: RenownGainEvent | null;
    clearLastRenownGain: () => void;

    /* -------------------------- 💬 ENCOURAGEMENT ------------------------- */
    encouragementByChapterQuestId: Record<string, Encouragement | undefined>;
    encouragementLoading: boolean;
    askEncouragement: (
        chapterQuestId: string,
        input: {
            chapter_quest_id: string;
            quest_title: string;
            room_code?: string | null;
            difficulty?: number | null;
            mission_md?: string | null;
        }
    ) => Promise<Encouragement | null>;
    clearEncouragement: (chapterQuestId: string) => void;

    /* ---------------------------- 🎉 CONGRATS ---------------------------- */
    congratsByChapterQuestId: Record<string, Congratulations | undefined>;
    congratsLoadingById: Record<string, boolean | undefined>;
    prefetchCongrats: (
        chapterQuestId: string,
        input: {
            quest_title: string;
            room_code?: string | null;
            difficulty?: number | null;
            mission_md?: string | null;
        }
    ) => Promise<Congratulations | null>;
    clearCongrats: (chapterQuestId: string) => void;

    /* ----------------------- 📚 CHAPTERS (par aventure) ------------------- */
    chaptersByAdventureId: Record<string, Chapter[]>;
    chaptersLoadingByAdventureId: Record<string, boolean | undefined>;
    getChaptersByAdventure: (adventureId: string) => Promise<Chapter[]>;

    /* --------------------------- 📖 CHAPTER STORY ------------------------- */
    chapterStoryByChapterId: Record<string, ChapterStoryRow | undefined>;
    chapterStoryLoadingById: Record<string, boolean | undefined>;

    getChapterStory: (chapterId: string) => Promise<ChapterStoryRow | null>;
    generateChapterStory: (chapterId: string, force?: boolean) => Promise<ChapterStoryRow | null>;
    clearChapterStory: (chapterId: string) => void;
};

export const useGameStore = create<GameStore>((set, get) => {
    async function ensureCurrentChapterId(): Promise<string | null> {
        let chapterId = get().chapter?.id ?? get().currentChapter?.id ?? null;

        if (!chapterId) {
            await get().loadLatestChapter();
            chapterId = get().chapter?.id ?? null;
        }

        return chapterId;
    }

    return {
        /* =========================================================================
        🎮 SNAPSHOT JEU
        ========================================================================= */

        currentAdventure: null,
        currentChapter: null,
        currentQuests: [],
        currentCharacter: null,

        rooms: [],
        templates: [],

        /* =========================================================================
        🗺️ ADVENTURE (start)
        ========================================================================= */

        startingAdventure: false,

        startAdventure: async (input) => {
            const type_code = typeof input?.type_code === "string" ? input.type_code.trim() : "";
            if (!type_code) return null;

            set({ startingAdventure: true });

            try {
                // 1) S’assurer d’avoir une session active
                let sessionId = useSessionStore.getState().activeSessionId;

                if (!sessionId) {
                    const sid = await useSessionStore.getState().createAndActivate("Ma partie");
                    if (!sid) return null;
                    sessionId = sid;
                }

                // 2) Créer l’instance d’aventure (BDD)
                // ⚠️ suppose que tu ajoutes POST /api/adventures
                const res = await apiPost<{
                    adventure: { id: string; instance_code?: string | null } | null;
                }>("/api/adventures", {
                    type_code,
                    title: input.title,
                    instance_code: input.instance_code,
                });

                if (!res.ok) {
                    useToastStore.getState().error("Aventure", res.error ?? "Création impossible");
                    return null;
                }

                const adventure = (res.data as any)?.adventure ?? null;
                if (!adventure?.id) {
                    useToastStore
                        .getState()
                        .error("Aventure", "Création impossible (réponse vide)");
                    return null;
                }

                // 3) Journal (best-effort)
                const j = input.journal ?? {};
                void useJournalStore.getState().create({
                    session_id: sessionId,
                    kind: "adventure_created",
                    title: j.title ?? "✨ Une aventure commence",
                    content:
                        j.content ??
                        `Tu as choisi: ${j.emoji ? `${j.emoji} ` : ""}${input.title ?? type_code}.`,
                });

                // 4) Refresh store (pratique pour que currentAdventure suive)
                void get().bootstrap();

                return {
                    adventureId: adventure.id,
                    instance_code: adventure.instance_code ?? null,
                };
            } catch (e) {
                console.error(e);
                useToastStore.getState().error("Aventure", "Erreur réseau");
                return null;
            } finally {
                set({ startingAdventure: false });
            }
        },

        startAdventureLoading: false,
        startAdventureRefreshing: false,

        startAdventureInstanceCode: null,
        startAdventureData: {
            adventure: null,
            rooms: [],
            backlog: [],
            context_text: "",
        },

        bootstrapStartAdventure: async (instanceCode: string) => {
            const code = (instanceCode || "").trim();
            if (!code) return;

            set({ startAdventureLoading: true, startAdventureInstanceCode: code });

            try {
                // 1) bootstrap global (session, profile, etc.)
                await get().bootstrap();

                // 2) charger l'aventure (instance)
                const advRes = await apiGet<{ adventure: Adventure | null }>(
                    `/api/adventures?instance_code=${encodeURIComponent(code)}`
                );
                if (!advRes.ok) {
                    set({
                        startAdventureData: {
                            adventure: null,
                            rooms: [],
                            backlog: [],
                            context_text: "",
                        },
                    });
                    return;
                }

                const adv = advRes.data?.adventure ?? null;

                if (!adv?.id) {
                    set({
                        startAdventureData: {
                            adventure: null,
                            rooms: [],
                            backlog: [],
                            context_text: "",
                        },
                    });
                    return;
                }

                // 3) rooms + backlog
                const [roomsRes, qRes] = await Promise.all([
                    apiGet<{ rooms: AdventureRoom[] }>(
                        `/api/adventure-rooms?adventureId=${encodeURIComponent(adv.id)}`
                    ),
                    apiGet<{ quests: AdventureQuest[] }>(
                        `/api/adventure-quests?adventureId=${encodeURIComponent(adv.id)}`
                    ),
                ]);

                set({
                    currentAdventure: adv, // utile pour /journal etc.
                    startAdventureData: {
                        adventure: adv,
                        rooms: roomsRes.ok ? (roomsRes.data?.rooms ?? []) : [],
                        backlog: qRes.ok ? (qRes.data?.quests ?? []) : [],
                        context_text: (adv.context_text ?? "") as string,
                    },
                });
            } finally {
                set({ startAdventureLoading: false });
            }
        },

        refreshStartAdventure: async () => {
            const adv = get().startAdventureData.adventure;
            if (!adv?.id) return;

            set({ startAdventureRefreshing: true });
            try {
                const [roomsRes, qRes, advRes] = await Promise.all([
                    apiGet<{ rooms: AdventureRoom[] }>(
                        `/api/adventure-rooms?adventureId=${encodeURIComponent(adv.id)}`
                    ),
                    apiGet<{ quests: AdventureQuest[] }>(
                        `/api/adventure-quests?adventureId=${encodeURIComponent(adv.id)}`
                    ),
                    apiGet<{ adventure: Adventure | null }>(
                        `/api/adventures?id=${encodeURIComponent(adv.id)}`
                    ),
                ]);

                const freshAdv = advRes.ok ? (advRes.data?.adventure ?? adv) : adv;

                set((s) => ({
                    startAdventureData: {
                        ...s.startAdventureData,
                        adventure: freshAdv,
                        rooms: roomsRes.ok
                            ? (roomsRes.data?.rooms ?? [])
                            : s.startAdventureData.rooms,
                        backlog: qRes.ok ? (qRes.data?.quests ?? []) : s.startAdventureData.backlog,
                        context_text: (freshAdv?.context_text ??
                            s.startAdventureData.context_text) as string,
                    },
                    currentAdventure: freshAdv ?? s.currentAdventure,
                }));
            } finally {
                set({ startAdventureRefreshing: false });
            }
        },

        setStartAdventureContextText: (text: string) =>
            set((s) => ({
                startAdventureData: { ...s.startAdventureData, context_text: text ?? "" },
            })),

        saveStartAdventureContext: async () => {
            const adv = get().startAdventureData.adventure;
            if (!adv?.id) return;

            const context_text = get().startAdventureData.context_text ?? "";

            // ⚠️ On utilise PATCH (pas apiPost)
            try {
                const patchRes = await fetch("/api/adventures", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: adv.id, context_text }),
                });
                const json = await patchRes.json().catch(() => null);

                if (!patchRes.ok) {
                    useToastStore
                        .getState()
                        .error("Contexte", json?.error ?? "Sauvegarde impossible");
                    return;
                }

                set((s) => ({
                    startAdventureData: {
                        ...s.startAdventureData,
                        adventure: s.startAdventureData.adventure
                            ? { ...s.startAdventureData.adventure, context_text }
                            : s.startAdventureData.adventure,
                    },
                }));

                useToastStore.getState().success("Contexte", "Sauvegardé");
            } catch (e) {
                useToastStore.getState().error("Contexte", "Erreur réseau");
            }
        },

        addBacklogQuestToStartAdventure: async (input) => {
            const adv = get().startAdventureData.adventure;
            if (!adv?.id) return false;

            const title = (input.title ?? "").trim();
            if (!title) return false;

            const res = await apiPost<{ quest: AdventureQuest }>("/api/adventure-quests", {
                adventure_id: adv.id,
                room_code: input.room_code ?? null,
                title,
                difficulty: input.difficulty ?? 2,
                estimate_min: null,
            });

            if (!res.ok) {
                useToastStore.getState().error("Backlog", res.error ?? "Ajout impossible");
                return false;
            }

            const quest = (res.data as any)?.quest as AdventureQuest | undefined;
            if (!quest?.id) return false;

            set((s) => ({
                startAdventureData: {
                    ...s.startAdventureData,
                    backlog: [quest, ...s.startAdventureData.backlog],
                },
            }));

            return true;
        },

        generateBacklogForStartAdventure: async (input) => {
            const adv = get().startAdventureData.adventure;
            const rooms = get().startAdventureData.rooms;
            if (!adv?.id) return 0;
            if (!rooms.length) return 0;

            const res = await apiPost<{ generated: number }>("/api/ai/backlog/generate", {
                adventureId: adv.id,
                perRoomCount: input.perRoomCount,
                allowGlobal: false,
                rooms: rooms.map((r) => ({ code: r.code, title: r.title })),
            });

            if (!res.ok) {
                useToastStore.getState().error("IA", res.error ?? "Génération impossible");
                return 0;
            }

            const generated = (res.data as any)?.generated ?? 0;

            // refresh rooms/backlog après IA
            await get().refreshStartAdventure();

            // journal best effort
            void useJournalStore.getState().create({
                kind: "quests_seeded",
                title: "🎲 Backlog généré",
                content: `Généré: ${generated} quêtes.`,
                adventure_quest_id: null,
                quest_id: null,
                chapter_id: null,
            } as any);

            return generated;
        },

        launchStartAdventureFirstChapter: async () => {
            const adv = get().startAdventureData.adventure;
            const backlog = get().startAdventureData.backlog;

            if (!adv?.id) return null;
            if (!backlog.length) return null;

            const res = await apiPost<{ chapter: { id: string } }>("/api/chapters", {
                adventure_id: adv.id,
                title: "Chapitre 1",
                pace: "standard",
            });

            if (!res.ok) {
                useToastStore.getState().error("Chapitre", res.error ?? "Création impossible");
                return null;
            }

            return (res.data as any)?.chapter?.chapter_code ?? null;
        },

        /* =========================================================================
        🧬 ADVENTURE TYPES
        ========================================================================= */

        adventureTypes: [],
        adventureTypesLoading: false,
        adventureTypesError: null,

        getAdventureTypes: async (opts) => {
            const force = !!opts?.force;

            const cached = get().adventureTypes;
            if (!force && cached?.length) return cached;

            set({ adventureTypesLoading: true, adventureTypesError: null });

            const res = await apiGet<{
                adventureTypes: AdventureType[];
                adventureType?: AdventureType | null;
            }>("/api/adventure-types");

            if (!res.ok) {
                set({
                    adventureTypesLoading: false,
                    adventureTypesError: res.error ?? "Failed to load adventure types",
                });
                return [];
            }

            const list = (res.data as any)?.adventureTypes ?? [];
            set({
                adventureTypes: Array.isArray(list) ? list : [],
                adventureTypesLoading: false,
            });

            return get().adventureTypes;
        },

        /* =========================================================================
        🗺️ CHAPTER
        ========================================================================= */

        chapter: null,
        chapterLoading: false,

        setChapter: (chapter) => set({ chapter }),

        loadLatestChapter: async () => {
            set({ chapterLoading: true });
            try {
                const result = await apiGet<{ chapter: Chapter | null }>("/api/chapters?latest=1");
                if (!result.ok) {
                    console.error("loadLatestChapter failed:", result.error);
                    set({ chapter: null });
                    return;
                }

                set({ chapter: result.data?.chapter ?? null });
            } catch (e) {
                console.error(e);
                set({ chapter: null });
            } finally {
                set({ chapterLoading: false });
            }
        },

        /* =========================================================================
        🗡️ START CHAPTER SETUP
        ========================================================================= */

        startChapterLoading: false,
        startChapterStarting: false,

        startChapterCode: null,
        startChapterData: {
            chapter: null,
            rooms: [],
            backlog: [],
            context_text: "",
        },

        bootstrapStartChapter: async (chapterCode: string) => {
            const code = (chapterCode || "").trim();
            if (!code) return;

            set({ startChapterLoading: true, startChapterCode: code });

            try {
                // optionnel mais pratique: avoir session/profile prêts
                await get().bootstrap();

                const chRes = await apiGet<{ chapter: Chapter | null }>(
                    `/api/chapters?code=${encodeURIComponent(code)}`
                );

                if (!chRes.ok) {
                    set({
                        startChapterData: {
                            chapter: null,
                            rooms: [],
                            backlog: [],
                            context_text: "",
                        },
                    });
                    useToastStore
                        .getState()
                        .error("Chapitre", chRes.error ?? "Chargement impossible");
                    return;
                }

                const chapter = chRes.data?.chapter ?? null;

                if (!chapter?.id) {
                    set({
                        startChapterData: {
                            chapter: null,
                            rooms: [],
                            backlog: [],
                            context_text: "",
                        },
                    });
                    return;
                }

                const advId = (chapter as any)?.adventure_id ?? null;
                if (!advId) {
                    set({
                        startChapterData: { chapter, rooms: [], backlog: [], context_text: "" },
                    });
                    return;
                }

                const [roomsRes, qRes] = await Promise.all([
                    apiGet<{ rooms: AdventureRoom[] }>(
                        `/api/adventure-rooms?adventureId=${encodeURIComponent(advId)}`
                    ),
                    apiGet<{ quests: AdventureQuest[] }>(
                        `/api/adventure-quests?adventureId=${encodeURIComponent(advId)}`
                    ),
                ]);

                set({
                    startChapterData: {
                        chapter,
                        rooms: roomsRes.ok ? (roomsRes.data?.rooms ?? []) : [],
                        backlog: qRes.ok ? (qRes.data?.quests ?? []) : [],
                        context_text: ((chapter as any)?.context_text ?? "") as string,
                    },
                    currentChapter: chapter,
                    chapter,
                });
            } finally {
                set({ startChapterLoading: false });
            }
        },

        setStartChapterContextText: (text: string) =>
            set((s) => ({
                startChapterData: { ...s.startChapterData, context_text: text ?? "" },
            })),

        saveStartChapterContext: async () => {
            const ch = get().startChapterData.chapter;
            if (!ch?.id) return;

            const context_text = get().startChapterData.context_text ?? "";

            try {
                const patchRes = await fetch("/api/chapters", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: ch.id, context_text }),
                });

                const json = await patchRes.json().catch(() => null);

                if (!patchRes.ok) {
                    useToastStore
                        .getState()
                        .error("Contexte", json?.error ?? "Sauvegarde impossible");
                    return;
                }

                set((s) => ({
                    startChapterData: {
                        ...s.startChapterData,
                        chapter: s.startChapterData.chapter
                            ? ({ ...s.startChapterData.chapter, context_text } as any)
                            : s.startChapterData.chapter,
                    },
                }));

                useToastStore.getState().success("Contexte", "Sauvegardé");
            } catch {
                useToastStore.getState().error("Contexte", "Erreur réseau");
            }
        },

        startChapterWithQuests: async (input) => {
            const chapter_id = (input?.chapter_id ?? "").trim();
            const adventure_quest_ids = Array.isArray(input?.adventure_quest_ids)
                ? input.adventure_quest_ids.filter(Boolean)
                : [];

            if (!chapter_id) return false;
            if (adventure_quest_ids.length === 0) return false;

            set({ startChapterStarting: true });

            try {
                const res = await apiPost<{ items?: any[]; error?: string }>(
                    "/api/chapter-quests",
                    {
                        chapter_id,
                        adventure_quest_ids,
                    }
                );

                if (!res.ok) {
                    useToastStore.getState().error("Chapitre", res.error ?? "Démarrage impossible");
                    return false;
                }

                // best-effort journal
                void useJournalStore.getState().create({
                    kind: "chapter_started",
                    title: "🗡️ Chapitre démarré",
                    content: `Quêtes ajoutées: ${adventure_quest_ids.length}.`,
                    chapter_id,
                } as any);

                // refresh global (pour /adventure, /quests, etc.)
                void get().bootstrap();

                return true;
            } finally {
                set({ startChapterStarting: false });
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
            console.info("⏳ bootstrap Start");
            set({
                loading: true,
                characterLoading: true,
                renownLoading: true,
                error: null,
            });

            const sessionRes = await apiGet<{ session: GameSession | null }>("/api/session/active");
            if (!sessionRes.ok) {
                set({
                    loading: false,
                    characterLoading: false,
                    renownLoading: false,
                    error: sessionRes.error ?? "Failed to load active session",
                });
                return;
            }

            const session = sessionRes.data?.session ?? null;
            const sessionId = session?.id ?? null;

            try {
                const [charsRes, profRes, chapterRes, renownRes, advTypesRes] =
                    await Promise.allSettled([
                        fetch("/api/characters", { cache: "no-store" }),
                        fetch("/api/profile/character", { cache: "no-store" }),
                        fetch("/api/chapters?latest=1", { cache: "no-store" }),
                        fetch("/api/renown?session_id=" + sessionId, { cache: "no-store" }),
                        fetch("/api/adventure-types", { cache: "no-store" }),
                    ]);

                // Characters (critique)
                if (charsRes.status !== "fulfilled") throw new Error("Failed to load characters");
                const charsJson = await fetchJson(charsRes.value);
                if (!charsRes.value.ok)
                    throw new Error(charsJson?.error ?? "Failed to load characters");
                const characters = (charsJson?.characters ?? []) as Character[];

                // Profile (optionnel)
                let profile: Profile = null;
                let selectedId: string | null = null;
                let currentCharacter: Character | null | undefined = null;

                if (profRes.status === "fulfilled") {
                    const profJson = await fetchJson(profRes.value);
                    if (profRes.value.ok) {
                        profile = (profJson?.profile ?? null) as Profile;
                        selectedId = (profile?.character_id ?? null) as string | null;
                        currentCharacter = characters.find((c) => c.id === selectedId);
                    }
                }

                // Chapter (optionnel)
                let chapter: Chapter | null = null;
                if (chapterRes.status === "fulfilled") {
                    const chapterJson = await fetchJson(chapterRes.value);
                    if (chapterRes.value.ok)
                        chapter = (chapterJson?.chapter ?? null) as Chapter | null;
                }

                // Renown (optionnel)
                let renown: Renown | null = null;
                if (renownRes.status === "fulfilled") {
                    const renownJson = await fetchJson(renownRes.value);
                    if (renownRes.value.ok) renown = (renownJson?.renown ?? null) as Renown | null;
                }

                // Adventure Types (optionnel)
                let adventureTypes: AdventureType[] = [];
                if (advTypesRes.status === "fulfilled") {
                    const advTypesJson = await fetchJson(advTypesRes.value);
                    if (advTypesRes.value.ok) {
                        adventureTypes = (advTypesJson?.adventureTypes ?? []) as AdventureType[];
                    }
                }

                // Dépend du chapitre (best-effort)
                let currentAdventure: Adventure | null = null;
                let currentQuests: ChapterQuestFull[] = [];
                let rooms: AdventureRoom[] = [];
                let templates: RoomTemplate[] = [];

                if (chapter?.id) {
                    const [advRes, questsRes, roomsRes, templatesRes] = await Promise.allSettled([
                        chapter.adventure_id
                            ? fetch(
                                  `/api/adventures?id=${encodeURIComponent(chapter.adventure_id)}`,
                                  { cache: "no-store" }
                              )
                            : Promise.resolve(null as any),
                        fetch(
                            `/api/chapter-quests?status=doing&chapterId=${encodeURIComponent(chapter.id)}`,
                            { cache: "no-store" }
                        ),
                        chapter.adventure_id
                            ? fetch(
                                  `/api/adventure-rooms?adventureId=${encodeURIComponent(chapter.adventure_id)}`,
                                  { cache: "no-store" }
                              )
                            : Promise.resolve(null as any),
                        fetch("/api/room-templates", { cache: "no-store" }),
                    ]);

                    if (advRes.status === "fulfilled" && advRes.value) {
                        const advJson = await fetchJson(advRes.value);
                        if (advRes.value.ok)
                            currentAdventure = (advJson?.adventure ?? null) as Adventure | null;
                    }

                    if (questsRes.status === "fulfilled") {
                        const qJson = await fetchJson(questsRes.value);
                        if (questsRes.value.ok)
                            currentQuests = (qJson?.items ?? []) as ChapterQuestFull[];
                    }

                    if (roomsRes.status === "fulfilled") {
                        const roomJson = await fetchJson(roomsRes.value);
                        if (roomsRes.value.ok) rooms = (roomJson?.rooms ?? []) as AdventureRoom[];
                    }

                    if (templatesRes.status === "fulfilled") {
                        const roomTemplatesJson = await fetchJson(templatesRes.value);
                        if (templatesRes.value.ok)
                            templates = (roomTemplatesJson?.templates ?? []) as RoomTemplate[];
                    }
                }

                set({
                    characters,
                    rooms,
                    profile,
                    selectedId,
                    currentCharacter,
                    chapter,
                    renown,
                    currentChapter: chapter,
                    currentAdventure,
                    currentQuests,
                    adventureTypes,
                    templates,
                });

                // Précharge la liste des chapitres de l’aventure (best-effort)
                if (currentAdventure?.id) {
                    void get().getChaptersByAdventure(currentAdventure.id);
                }
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
                    adventureTypes: [],
                    error: e instanceof Error ? e.message : "Bootstrap failed",
                });
            } finally {
                set({
                    loading: false,
                    characterLoading: false,
                    renownLoading: false,
                });
                console.info("🏁 bootstrap End");
            }
        },

        refreshProfile: async () => {
            set({ loading: true, characterLoading: true, error: null });
            try {
                const res = await apiGet<{ profile: Profile }>("/api/profile/character");
                if (!res.ok) throw new Error(res.error);

                const profile = (res.data?.profile ?? null) as Profile;

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
                const res = await apiPost<{ profile: Profile }>("/api/profile/character", {
                    characterId,
                });
                if (!res.ok) throw new Error(res.error);

                const profile = (res.data?.profile ?? null) as Profile;
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

                const json = await fetchJson(res);

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

                void get().prefetchCongrats(chapterQuestId, {
                    quest_title: quest?.title ?? "Quête",
                    room_code: quest?.room_code ?? null,
                    difficulty: quest?.difficulty ?? null,
                    mission_md: quest?.mission_md ?? null,
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

                const json = await fetchJson(res);

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
                void get().addRenown(
                    delta,
                    line ? `Quête: ${line}` : "Quête terminée",
                    chapterQuestId
                );

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
        ✅ AFFECTATION (backlog -> chapter)
        ========================================================================= */

        assignQuestToCurrentChapter: async (adventureQuestId: string) => {
            const toast = useToastStore.getState();
            const journal = useJournalStore.getState();

            const chapterId = await ensureCurrentChapterId();

            if (!chapterId) {
                toast.error("Affectation impossible", "Aucun chapitre actif.");
                return false;
            }

            try {
                const res = await fetch("/api/chapter-quests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chapter_id: chapterId,
                        adventure_quest_ids: [adventureQuestId],
                    }),
                });

                const json = await fetchJson(res);

                if (!res.ok) {
                    toast.error("Affectation impossible", json?.error ?? "Erreur serveur");
                    return false;
                }

                toast.success("Quête affectée", "Ajoutée au chapitre courant.");

                void journal.create({
                    kind: "note",
                    title: "➕ Quête affectée au chapitre",
                    content: "Une quête du backlog a été ajoutée au chapitre en cours.",
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

        addRenown: async (amount, reason, chapterQuestId) => {
            const sessionId = useSessionStore.getState().activeSessionId;
            if (!sessionId) return null;

            const before = get().renown ?? null;

            try {
                set({ renownLoading: true });

                const res = await apiPost<{ renown: Renown | null }>("/api/renown", {
                    session_id: sessionId,
                    amount,
                });

                if (!res.ok) {
                    useToastStore
                        .getState()
                        .error("Renommée", res.error ?? "Impossible d’ajouter de la renommée");
                    return null;
                }

                const after = (res.data?.renown ?? null) as Renown | null;
                if (!after) return null;

                set({
                    renown: after,
                    lastRenownGain: {
                        chapterQuestId: chapterQuestId ?? "unknown",
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

        askEncouragement: async (_chapterQuestId, input) => {
            try {
                set({ encouragementLoading: true });

                const res = await apiPost<{ encouragement: any; meta?: any }>(
                    "/api/encouragement",
                    input
                );

                if (!res.ok) {
                    useToastStore
                        .getState()
                        .error(
                            "Maître du jeu",
                            res.error ?? "Impossible de générer un encouragement"
                        );
                    return null;
                }

                const e = (res.data as any)?.encouragement;
                if (!e?.message) return null;

                const encouragement: Encouragement = {
                    title: e.title ?? "Encouragement",
                    message: e.message,
                    createdAt: Date.now(),
                    meta: (res.data as any)?.meta ?? undefined,
                };

                set((s) => ({
                    encouragementByChapterQuestId: {
                        ...s.encouragementByChapterQuestId,
                        [input.chapter_quest_id]: encouragement,
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

        /* =========================================================================
        🎉 CONGRATS (MJ)
        ========================================================================= */

        congratsByChapterQuestId: {},
        congratsLoadingById: {},

        clearCongrats: (chapterQuestId) =>
            set((s) => {
                const next = { ...s.congratsByChapterQuestId };
                delete next[chapterQuestId];
                return { congratsByChapterQuestId: next };
            }),

        prefetchCongrats: async (chapterQuestId, input) => {
            const existing = get().congratsByChapterQuestId[chapterQuestId];
            if (existing?.message) return existing;

            set((s) => ({
                congratsLoadingById: { ...s.congratsLoadingById, [chapterQuestId]: true },
            }));

            try {
                const res = await apiPost<{ congrats: any; meta?: any }>("/api/congrats", {
                    chapter_quest_id: chapterQuestId,
                    quest_title: input.quest_title,
                    room_code: input.room_code ?? null,
                    difficulty: input.difficulty ?? null,
                    mission_md: input.mission_md ?? null,
                });

                if (!res.ok) return null;

                const c = (res.data as any)?.congrats;
                if (!c?.message) return null;

                const congrats: Congratulations = {
                    title: c.title ?? "Félicitations",
                    message: c.message,
                    createdAt: Date.now(),
                    meta: (res.data as any)?.meta ?? undefined,
                };

                set((s) => ({
                    congratsByChapterQuestId: {
                        ...s.congratsByChapterQuestId,
                        [chapterQuestId]: congrats,
                    },
                }));

                return congrats;
            } catch {
                return null;
            } finally {
                set((s) => ({
                    congratsLoadingById: { ...s.congratsLoadingById, [chapterQuestId]: false },
                }));
            }
        },

        /* =========================================================================
        📚 CHAPTERS (par aventure)
        ========================================================================= */

        chaptersByAdventureId: {},
        chaptersLoadingByAdventureId: {},

        getChaptersByAdventure: async (adventureId: string) => {
            if (!adventureId) return [];

            const cached = get().chaptersByAdventureId[adventureId];
            if (cached?.length) return cached;

            set((s) => ({
                chaptersLoadingByAdventureId: {
                    ...s.chaptersLoadingByAdventureId,
                    [adventureId]: true,
                },
            }));

            try {
                const res = await fetch(
                    `/api/chapters?adventureId=${encodeURIComponent(adventureId)}`,
                    { cache: "no-store" }
                );
                const json = await fetchJson(res);

                if (!res.ok) {
                    console.error("getChaptersByAdventure failed:", json?.error ?? res.statusText);
                    return [];
                }

                const chapters = (json?.chapters ?? []) as Chapter[];

                set((s) => ({
                    chaptersByAdventureId: { ...s.chaptersByAdventureId, [adventureId]: chapters },
                }));

                return chapters;
            } catch (e) {
                console.error(e);
                return [];
            } finally {
                set((s) => ({
                    chaptersLoadingByAdventureId: {
                        ...s.chaptersLoadingByAdventureId,
                        [adventureId]: false,
                    },
                }));
            }
        },

        /* =========================================================================
        📖 CHAPTER STORY
        ========================================================================= */

        chapterStoryByChapterId: {},
        chapterStoryLoadingById: {},

        clearChapterStory: (chapterId) =>
            set((s) => {
                const next = { ...s.chapterStoryByChapterId };
                delete next[chapterId];
                return { chapterStoryByChapterId: next };
            }),

        getChapterStory: async (chapterId: string) => {
            if (!chapterId) return null;

            set((s) => ({
                chapterStoryLoadingById: { ...s.chapterStoryLoadingById, [chapterId]: true },
            }));

            try {
                const res = await apiGet<{ story: ChapterStoryRow | null }>(
                    `/api/chapter-story?chapterId=${encodeURIComponent(chapterId)}`
                );

                if (!res.ok) return null;

                const story = res.data?.story ?? null;

                if (story) {
                    set((s) => ({
                        chapterStoryByChapterId: {
                            ...s.chapterStoryByChapterId,
                            [chapterId]: story,
                        },
                    }));
                }

                return story;
            } finally {
                set((s) => ({
                    chapterStoryLoadingById: { ...s.chapterStoryLoadingById, [chapterId]: false },
                }));
            }
        },

        generateChapterStory: async (chapterId: string, force: boolean = false) => {
            if (!chapterId) return null;

            set((s) => ({
                chapterStoryLoadingById: { ...s.chapterStoryLoadingById, [chapterId]: true },
            }));

            try {
                const url = `/api/chapter-story${force ? "?force=true" : ""}`;

                const res = await apiPost<{ story: ChapterStoryRow | null; cached?: boolean }>(
                    url,
                    {
                        chapterId,
                    }
                );

                if (!res.ok) {
                    useToastStore.getState().error("Récit", res.error ?? "Génération impossible");
                    return null;
                }

                const story = (res.data as any)?.story ?? null;

                if (story) {
                    set((s) => ({
                        chapterStoryByChapterId: {
                            ...s.chapterStoryByChapterId,
                            [chapterId]: story,
                        },
                    }));

                    useToastStore
                        .getState()
                        .success("Récit scellé", "Le Maître du Jeu a écrit le chapitre.");
                }

                return story;
            } finally {
                set((s) => ({
                    chapterStoryLoadingById: { ...s.chapterStoryLoadingById, [chapterId]: false },
                }));
            }
        },
    };
});
