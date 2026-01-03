// src/stores/gameStore.ts
import { create } from "zustand";
import { useToastStore } from "@/stores/toastStore";
import { useJournalStore } from "@/stores/journalStore";
import { useSessionStore, type GameSession } from "@/stores/sessionStore";

import type {
    Adventure,
    AdventureType,
    AdventureQuest,
    AdventureQuestWithStatus,
    ChapterQuestFull,
    Chapter,
    Character,
    Profile,
    QuestLite,
    Renown,
    RenownGainEvent,
    Encouragement,
    Congratulations,
    ChapterStoryRow,
    CreateAdventureQuestInput,
    UpdateAdventureQuestInput,
    AdventureRoom,
    RoomTemplate,
    QuestChain,
    QuestChainItem,
    PhotoCategory,
    PhotoRow,
    QuestMessageRole,
    QuestMessageKind,
    QuestMessageMeta,
    QuestThread as QuestThreadRow,
    QuestMessage as QuestMessageRow,
    CurrentPlayer,
} from "@/types/game";

export type BadgeCatalogRow = {
    id: string;
    code: string;
    title: string;
    emoji: string | null;
    description: string | null;
    created_at: string;
};

export type RenownLevelRow = {
    level: number;
    tier: number;
    tier_title: string;
    level_suffix: string | null;
    full_title: string;
    is_milestone: boolean;
    created_at: string;
};

/* ============================================================================
🧱 TYPES (données métier)
============================================================================ */

export type ReloadKey =
    | "session"
    | "characters"
    | "profile"
    | "chapter"
    | "renown"
    | "adventureTypes"
    | "adventure"
    | "chapterQuests"
    | "backlog"
    | "rooms"
    | "roomTemplates"
    | "chaptersByAdventure"
    | "questChains"
    | "questChainItems"
    | "questPhotos"
    | "questThreads"
    | "questMessages"
    | "questMission";

export type ReloadInput = ReloadKey | ReloadKey[];

export type ApiResult<T> =
    | { ok: true; status: number; data: T }
    | { ok: false; status: number; error: string; data?: undefined };

async function safeJson(res: Response) {
    return res.json().catch(() => null);
}

function asErrorMessage(payload: any, fallback: string) {
    if (!payload) return fallback;
    if (typeof payload === "string") return payload;
    if (typeof payload?.error === "string") return payload.error;
    if (typeof payload?.message === "string") return payload.message;
    return fallback;
}

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

async function apiPostForm<T>(
    url: string,
    form: FormData
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
    try {
        const res = await fetch(url, {
            method: "POST",
            body: form,
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

export async function apiPatch<T>(
    url: string,
    body?: unknown,
    opts?: {
        headers?: Record<string, string>;
        signal?: AbortSignal;
    }
): Promise<ApiResult<T>> {
    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...(opts?.headers ?? {}),
        },
        credentials: "include",
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: opts?.signal,
    });

    const json = await safeJson(res);

    if (!res.ok) {
        // fallback: essaye aussi le texte si json null
        let fallback = `Request failed (${res.status})`;
        if (!json) {
            const txt = await res.text().catch(() => "");
            if (txt) fallback = txt;
        }
        return {
            ok: false,
            status: res.status,
            error: asErrorMessage(json, fallback),
        };
    }

    return {
        ok: true,
        status: res.status,
        data: (json ?? ({} as any)) as T,
    };
}

async function apiDelete<T>(
    url: string
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
    try {
        const res = await fetch(url, { method: "DELETE" });
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
    currentChapterQuests: ChapterQuestFull[];
    currentCharacter: Character | null;
    currentPlayer: CurrentPlayer | null;

    getCurrentPlayer: () => Promise<CurrentPlayer | null>;

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

    loadLastAdventure: () => Promise<Adventure | null>;

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

    generateBacklogForStartAdventure: (input: {
        perRoomCount: 1 | 3 | 5 | 8 | 12;
    }) => Promise<number>;

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

    /* ONBOARDING (Step 1: Adventure + MJ) */
    onboardingAdventureLoading: boolean;

    completeOnboardingAdventure: (input: {
        character_id: string;
        adventure_code: string;
    }) => Promise<boolean>;

    completeOnboardingIdentity: (
        display_name: string,
        context: {
            context_self: string | null;
            context_family: string | null;
            context_home: string | null;
            context_routine: string | null;
            context_challenges: string | null;
        }
    ) => Promise<boolean>;

    bootstrapOnboardingQuests: () => Promise<void>;

    completeOnboarding: () => Promise<boolean>;

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
    reload: (what: ReloadInput, opts?: { silent?: boolean }) => Promise<void>;
    refreshProfile: () => Promise<void>;
    activateCharacter: (characterId: string) => Promise<void>;
    loadActiveCharacter: () => Promise<void>;

    /* ---------------------------- 🧺 BACKLOG ---------------------------- */
    adventureBacklog: AdventureQuestWithStatus[];
    adventureBacklogLoading: boolean;
    loadAdventureBacklog: (adventureId: string) => Promise<AdventureQuestWithStatus[]>;

    /* ---------------------------- ⚔️ QUESTS ----------------------------- */

    startQuest: (chapterQuestId: string, quest?: QuestLite | null) => Promise<any | null>;
    finishQuest: (chapterQuestId: string, quest?: QuestLite | null) => Promise<any | null>;
    createAdventureQuest: (input: CreateAdventureQuestInput) => Promise<AdventureQuest | null>;
    updateAdventureQuest: (input: UpdateAdventureQuestInput) => Promise<AdventureQuest | null>;
    assignQuestToCurrentChapter: (adventureQuestId: string) => Promise<boolean>;
    unassignQuestFromChapter: (
        chapterQuestId: string,
        quest?: QuestLite | null
    ) => Promise<boolean>;

    /* ------------------------- 🔗 QUEST CHAINS -------------------------- */

    // cache: chains par aventure
    questChainsByAdventureId: Record<string, QuestChain[]>;
    questChainsLoadingByAdventureId: Record<string, boolean | undefined>;

    getQuestChainsByAdventure: (
        adventureId: string,
        opts?: { force?: boolean }
    ) => Promise<QuestChain[]>;

    createQuestChain: (input: {
        adventure_id: string;
        title?: string | null;
        description?: string | null;
    }) => Promise<QuestChain | null>;

    updateQuestChain: (
        chainId: string,
        input: { title?: string | null; description?: string | null }
    ) => Promise<QuestChain | null>;

    deleteQuestChain: (chainId: string) => Promise<boolean>;

    // cache: items par chain
    questChainItemsByChainId: Record<string, QuestChainItem[]>;
    questChainItemsLoadingByChainId: Record<string, boolean | undefined>;

    getQuestChainItems: (chainId: string, opts?: { force?: boolean }) => Promise<QuestChainItem[]>;

    addQuestToChain: (chainId: string, adventureQuestId: string) => Promise<boolean>;

    reorderQuestChainItem: (itemId: string, position: number) => Promise<boolean>;

    removeQuestFromChain: (itemId: string) => Promise<boolean>;

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

    /* --------------------------- 📸 PHOTOS (quêtes) --------------------------- */

    questPhotosByChapterQuestId: Record<string, PhotoRow[] | undefined>;
    questPhotosLoadingByChapterQuestId: Record<string, boolean | undefined>;
    questPhotosErrorByChapterQuestId: Record<string, string | null | undefined>;

    fetchQuestPhotos: (chapterQuestId: string, opts?: { force?: boolean }) => Promise<PhotoRow[]>;
    refreshQuestPhotos: (chapterQuestId: string) => Promise<PhotoRow[]>;
    clearQuestPhotos: (chapterQuestId: string) => void;

    getQuestPhotosByCategory: (chapterQuestId: string, category: PhotoCategory) => PhotoRow[];

    uploadQuestPhoto: (input: {
        chapter_quest_id: string;
        file: File;
        category?: PhotoCategory;
        caption?: string | null;
        sort?: number;
        is_cover?: boolean;
        width?: number | null;
        height?: number | null;
    }) => Promise<PhotoRow | null>;

    deletePhoto: (photoId: string, chapterQuestId?: string | null) => Promise<boolean>;

    /* --------------------------- 💬 QUEST THREADS --------------------------- */

    currentQuestThreadId: string | null;
    setCurrentQuestThreadId: (currentQuestThreadId: string | null) => void;

    questThreadsByChapterQuestId: Record<string, QuestThreadRow | undefined>;
    questThreadsLoadingByChapterQuestId: Record<string, boolean | undefined>;
    questThreadsErrorByChapterQuestId: Record<string, string | null | undefined>;

    getQuestThread: (
        chapterQuestId: string,
        opts?: { force?: boolean }
    ) => Promise<QuestThreadRow | null>;
    ensureQuestThread: (chapterQuestId: string) => Promise<QuestThreadRow | null>;
    clearQuestThread: (chapterQuestId: string) => void;

    /* --------------------------- 📨 QUEST MESSAGES --------------------------- */

    questMessagesByThreadId: Record<string, QuestMessageRow[] | undefined>;
    questMessagesLoadingByThreadId: Record<string, boolean | undefined>;
    questMessagesErrorByThreadId: Record<string, string | null | undefined>;

    fetchQuestMessages: (
        threadId: string,
        opts?: { force?: boolean }
    ) => Promise<QuestMessageRow[]>;
    refreshQuestMessages: (threadId: string) => Promise<QuestMessageRow[]>;
    clearQuestMessages: (threadId: string) => void;

    createQuestMessage: (input: {
        session_id: string;
        thread_id: string;
        chapter_quest_id: string;
        role: QuestMessageRole;
        kind: QuestMessageKind;
        content: string;
        title?: string | null;
        meta?: QuestMessageMeta | null;
        photo_id?: string | null;
    }) => Promise<QuestMessageRow | null>;

    /* ------------------------ 📜 QUEST MISSION (brief MJ) ------------------------ */

    questMissionByChapterQuestId: Record<string, any | undefined>;
    questMissionLoadingById: Record<string, boolean | undefined>;

    getQuestMission: (chapterQuestId: string) => Promise<any | null>;
    generateQuestMission: (chapterQuestId: string, force?: boolean) => Promise<any | null>;
    clearQuestMission: (chapterQuestId: string) => void;

    // data
    badges: BadgeCatalogRow[];
    renownLevels: RenownLevelRow[];

    // loading/error (optionnel mais pratique)
    badgesLoading: boolean;
    renownLevelsLoading: boolean;
    badgesError: string | null;
    renownLevelsError: string | null;

    // actions
    getBadges: (args?: { force?: boolean }) => Promise<BadgeCatalogRow[]>;
    getRenownLevels: (args?: {
        force?: boolean;
        tier?: number;
        milestonesOnly?: boolean;
    }) => Promise<RenownLevelRow[]>;
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
        currentChapterQuests: [],
        currentCharacter: null,
        currentPlayer: null,

        rooms: [],
        templates: [],

        getCurrentPlayer: async () => {
            const res = await fetch("/api/player", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                // option: reset si 401
                if (res.status === 401) {
                    set({ currentPlayer: null });
                    return null;
                }
                const msg = await res.text().catch(() => "");
                throw new Error(`getCurrentPlayer failed (${res.status}): ${msg}`);
            }

            const data = (await res.json()) as CurrentPlayer;

            set({ currentPlayer: data });
            return data;
        },

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

        loadLastAdventure: async () => {
            set({ loading: true, error: null });

            try {
                // ⚠️ GET sans params => toutes les aventures de la session
                const res = await apiGet<{ adventures: Adventure[] | null }>("/api/adventures");

                if (!res.ok) {
                    set({ error: res.error ?? "Failed to load adventures" });
                    return null;
                }

                const listRaw = (res.data as any)?.adventures ?? [];
                const adventures: Adventure[] = Array.isArray(listRaw) ? listRaw : [];

                if (adventures.length === 0) {
                    // pas d'aventure => on remet à zéro mais sans casser tout le reste
                    set((s) => ({
                        currentAdventure: null,
                        startAdventureData: {
                            ...s.startAdventureData,
                            adventure: null,
                            rooms: [],
                            backlog: [],
                            context_text: "",
                        },
                    }));
                    return null;
                }

                // ✅ "dernière du tableau" (comme demandé)
                const last = adventures[adventures.length - 1] ?? null;

                if (!last?.id) {
                    set({ error: "Invalid adventure payload" });
                    return null;
                }

                // Mettre à jour le snapshot + le startAdventureData pour réutiliser les flows existants
                set((s) => ({
                    currentAdventure: last,
                    startAdventureData: {
                        ...s.startAdventureData,
                        adventure: last,
                        context_text: (last.context_text ??
                            s.startAdventureData.context_text ??
                            "") as any,
                    },
                }));

                return last;
            } catch (e) {
                const msg = e instanceof Error ? e.message : "Network error";
                set({ error: msg });
                return null;
            } finally {
                set({ loading: false });
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
                urgency: "normal", // ✅ NEW (optionnel mais clair)
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

        /* ONBOARDING */

        onboardingAdventureLoading: false,

        completeOnboardingAdventure: async ({ character_id, adventure_code }) => {
            const toast = useToastStore.getState();

            const cid = (character_id ?? "").trim();
            const adv = (adventure_code ?? "").trim();

            if (!cid) {
                set({ error: "Choisis un Maître du Jeu." });
                return false;
            }

            if (!adv) {
                set({ error: "Choisis une aventure." });
                return false;
            }

            set({ onboardingAdventureLoading: true, saving: true, error: null });

            try {
                /* ------------------------------------------------------------
        1) Enregistrer le MJ (comme activateCharacter)
        ------------------------------------------------------------ */
                const charRes = await apiPost<{ profile: Profile }>("/api/profile/character", {
                    characterId: cid,
                });

                if (!charRes.ok) throw new Error(charRes.error);

                const profile = (charRes.data?.profile ?? null) as Profile;

                const selected = get().characters.find((c) => c.id === cid) ?? null;

                set({
                    selectedId: cid,
                    profile: profile
                        ? { ...profile, character: selected ?? (profile as any)?.character ?? null }
                        : ({
                              user_id: "me",
                              display_name: null,
                              character_id: cid,
                              character: selected,
                          } as any),
                    currentCharacter: selected,
                });

                /* ------------------------------------------------------------
        2) Démarrer l’aventure (comme startAdventure)
        - On passe type_code = adventure_code (ton catalogue step1 utilise id)
        ------------------------------------------------------------ */
                const started = await get().startAdventure({
                    type_code: adv,
                    journal: {
                        emoji: "🏁",
                        title: "Prologue scellé",
                        content: `Aventure: ${adv}\nMJ: ${
                            selected ? `${selected.emoji} ${selected.name}` : cid
                        }`,
                    },
                });

                if (!started?.adventureId) {
                    toast.error("Onboarding", "Impossible de démarrer l’aventure.");
                    return false;
                }

                /* ------------------------------------------------------------
        2.5) Enqueue job briefing (best-effort)
        ------------------------------------------------------------ */
                const jobRes = await apiPost<{ jobId: string }>("/api/ai/jobs/enqueue", {
                    job_type: "adventure_briefing",
                    adventure_id: started.adventureId,
                    priority: 50,
                    payload: {
                        adventure_id: started.adventureId,
                    },
                });

                if (!jobRes.ok) {
                    console.warn("Failed to enqueue adventure briefing job:", jobRes.error);
                }

                /* ------------------------------------------------------------
        3) Rafraîchir l’état global (best-effort)
        ------------------------------------------------------------ */
                await get().bootstrap();

                toast.success(
                    "Aventure démarrée",
                    selected ? `${selected.emoji} ${selected.name}` : undefined
                );

                return true;
            } catch (e) {
                const msg = e instanceof Error ? e.message : "Onboarding failed";
                set({ error: msg });
                toast.error("Échec", "Impossible de valider l’étape 1");
                return false;
            } finally {
                set({ onboardingAdventureLoading: false, saving: false });
            }
        },

        completeOnboardingIdentity: async (displayName, context) => {
            console.info("completeOnboardingIdentity", displayName, context);
            const name = (displayName ?? "").trim().slice(0, 80);

            if (!name) {
                set({ error: "Nom d’affichage invalide" });
                return false;
            }

            set({ saving: true, error: null });

            try {
                /* ------------------------------------------------------------------
        1) Sauvegarde du display_name
        ------------------------------------------------------------------ */
                const resProfile = await fetch("/api/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ display_name: name }),
                });

                const jsonProfile = await resProfile.json().catch(() => null);
                if (!resProfile.ok) {
                    set({
                        error: jsonProfile?.error ?? "Impossible de sauvegarder le profil",
                    });
                    return false;
                }

                /* ------------------------------------------------------------------
        2) Sauvegarde du contexte utilisateur (en une fois)
        ------------------------------------------------------------------ */
                const payload: Record<string, string | null> = {};

                (
                    [
                        "context_self",
                        "context_family",
                        "context_home",
                        "context_routine",
                        "context_challenges",
                    ] as const
                ).forEach((key) => {
                    const raw = context[key];
                    const value = (raw ?? "").trim();
                    payload[key] = value.length ? value : null;
                });

                const resContext = await fetch("/api/account/context", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const jsonContext = await resContext.json().catch(() => null);
                if (!resContext.ok) {
                    set({
                        error: jsonContext?.error ?? "Impossible de sauvegarder le contexte",
                    });
                    return false;
                }

                const userId = jsonProfile?.profile?.user_id ?? null;
                const adventureId = get().currentAdventure?.id ?? null;

                if (userId && adventureId) {
                    const resWelcome = await fetch("/api/ai/welcome-message", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ adventure_id: adventureId, user_id: userId }),
                    });

                    await resWelcome.json().catch(() => null);
                    if (!resWelcome.ok) {
                        set({
                            error: "Impossible de générer le message d'accueil",
                        });
                        return false;
                    }
                }

                /* ------------------------------------------------------------------
        3) Mise à jour locale du profile (important pour la suite du flow)
        ------------------------------------------------------------------ */
                set({
                    profile: jsonProfile?.profile ?? null,
                });

                return true;
            } catch (e) {
                set({
                    error: e instanceof Error ? e.message : "Erreur inconnue",
                });
                return false;
            } finally {
                set({ saving: false });
            }
        },

        bootstrapOnboardingQuests: async () => {
            set({ startAdventureLoading: true });

            try {
                const sessionRes = await apiGet<{ session: GameSession | null }>(
                    "/api/session/active"
                );
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

                // 2) Charger la dernière aventure de la session
                const adv = await get().loadLastAdventure();

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

                // 3) Charger rooms + backlog à partir de l’aventure
                const [roomsRes, qRes] = await Promise.all([
                    apiGet<{ rooms: any[] }>(
                        `/api/adventure-rooms?adventureId=${encodeURIComponent(adv.id)}`
                    ),
                    apiGet<{ quests: any[] }>(
                        `/api/adventure-quests?adventureId=${encodeURIComponent(adv.id)}`
                    ),
                ]);

                set({
                    currentAdventure: adv,
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

        completeOnboarding: async () => {
            set({ saving: true, error: null });

            try {
                const res = await fetch("/api/me", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        onboarding_done: true,
                    }),
                });

                const json = await res.json().catch(() => null);

                if (!res.ok) {
                    set({ error: json?.error ?? "Failed to complete onboarding" });
                    return false;
                }

                // On met à jour le profil local si présent
                set((state) => ({
                    profile: state.profile
                        ? { ...state.profile, onboarding_done: true }
                        : state.profile,
                }));

                return true;
            } catch (e) {
                set({
                    error: e instanceof Error ? e.message : "Failed to complete onboarding",
                });
                return false;
            } finally {
                set({ saving: false });
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
                let currentChapterQuests: ChapterQuestFull[] = [];
                let currentQuests: ChapterQuestFull[] = [];
                let rooms: AdventureRoom[] = [];
                let templates: RoomTemplate[] = [];
                let adventureBacklog: AdventureQuestWithStatus[] = [];
                let questChainsByAdventureId: Record<string, QuestChain[]> = {};

                if (chapter?.id) {
                    const [advRes, questsRes, roomsRes, templatesRes, backlogRes, chainsRes] =
                        await Promise.allSettled([
                            chapter.adventure_id
                                ? fetch(
                                      `/api/adventures?id=${encodeURIComponent(
                                          chapter.adventure_id
                                      )}`,
                                      { cache: "no-store" }
                                  )
                                : Promise.resolve(null as any),
                            fetch(
                                `/api/chapter-quests?chapterId=${encodeURIComponent(chapter.id)}`,
                                {
                                    cache: "no-store",
                                }
                            ),
                            chapter.adventure_id
                                ? fetch(
                                      `/api/adventure-rooms?adventureId=${encodeURIComponent(
                                          chapter.adventure_id
                                      )}`,
                                      { cache: "no-store" }
                                  )
                                : Promise.resolve(null as any),
                            fetch("/api/room-templates", { cache: "no-store" }),
                            chapter.adventure_id
                                ? fetch(
                                      `/api/adventure-quests?adventureId=${encodeURIComponent(
                                          chapter.adventure_id
                                      )}`,
                                      { cache: "no-store" }
                                  )
                                : Promise.resolve(null as any),
                            chapter.adventure_id
                                ? fetch(
                                      `/api/quest-chains?adventureId=${encodeURIComponent(
                                          chapter.adventure_id
                                      )}`,
                                      { cache: "no-store" }
                                  )
                                : Promise.resolve(null as any),
                        ]);

                    if (advRes.status === "fulfilled" && advRes.value) {
                        const advJson = await fetchJson(advRes.value);
                        if (advRes.value.ok)
                            currentAdventure = (advJson?.adventure ?? null) as Adventure | null;
                    }

                    if (questsRes.status === "fulfilled") {
                        const qJson = await fetchJson(questsRes.value);
                        if (questsRes.value.ok)
                            currentChapterQuests = (qJson?.items ?? []) as ChapterQuestFull[];

                        // 🔎 "currentQuests" = doing uniquement (utilisé ailleurs)
                        currentQuests = (currentChapterQuests ?? []).filter(
                            (q) => q.status === "doing"
                        );
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

                    if (backlogRes.status === "fulfilled" && backlogRes.value) {
                        const bJson = await fetchJson(backlogRes.value);
                        if (backlogRes.value.ok) {
                            const list = (bJson?.quests ?? []) as AdventureQuestWithStatus[];
                            adventureBacklog = Array.isArray(list) ? list : [];
                        }
                    }

                    if (chainsRes.status === "fulfilled" && chainsRes.value) {
                        const cJson = await fetchJson(chainsRes.value);
                        if (chainsRes.value.ok) {
                            const list = (cJson?.chains ?? []) as QuestChain[];
                            questChainsByAdventureId = chapter.adventure_id
                                ? { [chapter.adventure_id]: Array.isArray(list) ? list : [] }
                                : {};
                        }
                    }
                }

                // console.log("currentAdventure", currentAdventure);

                set({
                    characters,
                    rooms,
                    templates,
                    profile,
                    selectedId,
                    currentCharacter,

                    chapter,
                    currentChapter: chapter,

                    currentAdventure,
                    currentChapterQuests,
                    currentQuests,
                    questChainsByAdventureId,
                    adventureBacklog,

                    renown,
                    adventureTypes,
                });

                if (currentAdventure?.id) {
                    void get().getChaptersByAdventure(currentAdventure.id);
                }

                void get().getCurrentPlayer();
                void get().getRenownLevels();
                void get().getBadges();
            } catch (e) {
                set({
                    characters: [],
                    profile: null,
                    selectedId: null,

                    chapter: null,
                    currentChapter: null,

                    currentAdventure: null,

                    currentQuests: [],
                    currentChapterQuests: [],

                    adventureBacklog: [],

                    renown: null,
                    adventureTypes: [],
                    rooms: [],
                    templates: [],
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

        reload: async (what, opts) => {
            const silent = !!opts?.silent;

            const input = Array.isArray(what) ? what : [what];
            const requested = new Set<ReloadKey>(input as ReloadKey[]);

            // Dépendances auto
            if (requested.has("chapter")) {
                requested.add("adventure");
                requested.add("chapterQuests");
                requested.add("backlog");
                requested.add("rooms");
                requested.add("roomTemplates");
            }
            if (requested.has("adventure")) {
                requested.add("chaptersByAdventure");
                requested.add("questChains");
            }
            if (requested.has("session")) {
                requested.add("renown");
            }
            if (requested.has("questChains")) {
                requested.add("questChainItems"); // ✅ optionnel si tu veux auto-charger items du chain actif (voir note)
            }

            if (requested.has("chapterQuests")) {
                requested.add("questThreads"); // ✅ ADD (utile: threads liés aux CQ)
            }
            if (requested.has("questThreads")) {
                requested.add("questMessages"); // ✅ optionnel (si tu veux refresh complet)
            }

            if (!silent) {
                set((s) => ({
                    error: null,
                    loading:
                        requested.has("chapter") ||
                        requested.has("adventure") ||
                        requested.has("chapterQuests") ||
                        requested.has("backlog")
                            ? true
                            : s.loading,
                    characterLoading:
                        requested.has("characters") || requested.has("profile")
                            ? true
                            : s.characterLoading,
                    renownLoading: requested.has("renown") ? true : s.renownLoading,
                }));
            }

            const safeFetch = async (url: string) => {
                const res = await fetch(url, { cache: "no-store" });
                const json = await fetchJson(res);
                return { ok: res.ok, json, statusText: res.statusText };
            };

            try {
                // 1) sessionId si nécessaire
                let sessionId = useSessionStore.getState().activeSessionId ?? null;

                if (requested.has("session") || (requested.has("renown") && !sessionId)) {
                    const sessionRes = await apiGet<{ session: GameSession | null }>(
                        "/api/session/active"
                    );
                    if (!sessionRes.ok)
                        throw new Error(sessionRes.error ?? "Failed to load session");
                    sessionId = sessionRes.data?.session?.id ?? null;
                }

                // 2) Blocs indépendants
                const jobs: Array<Promise<void>> = [];

                if (requested.has("characters")) {
                    jobs.push(
                        (async () => {
                            const r = await safeFetch("/api/characters");
                            if (!r.ok)
                                throw new Error(r.json?.error ?? "Failed to load characters");
                            const characters = (r.json?.characters ?? []) as Character[];
                            set({ characters });
                        })()
                    );
                }

                if (requested.has("profile")) {
                    jobs.push(
                        (async () => {
                            const r = await safeFetch("/api/profile/character");
                            if (!r.ok) {
                                set({ profile: null, selectedId: null, currentCharacter: null });
                                return;
                            }

                            const profile = (r.json?.profile ?? null) as Profile;

                            set((s) => {
                                const selectedId = (profile?.character_id ?? null) as string | null;
                                const currentCharacter = selectedId
                                    ? (s.characters.find((c) => c.id === selectedId) ?? null)
                                    : (profile?.character ?? null);

                                return { profile, selectedId, currentCharacter };
                            });
                        })()
                    );
                }

                if (requested.has("adventureTypes")) {
                    jobs.push(
                        (async () => {
                            const r = await safeFetch("/api/adventure-types");
                            if (!r.ok) return;
                            const adventureTypes = (r.json?.adventureTypes ??
                                []) as AdventureType[];
                            set({ adventureTypes });
                        })()
                    );
                }

                if (requested.has("chapter")) {
                    jobs.push(
                        (async () => {
                            const r = await safeFetch("/api/chapters?latest=1");
                            if (!r.ok) {
                                set({
                                    chapter: null,
                                    currentChapter: null,
                                    currentAdventure: null,
                                    currentQuests: [],
                                    currentChapterQuests: [],
                                    adventureBacklog: [],
                                    rooms: [],
                                });
                                return;
                            }

                            const chapter = (r.json?.chapter ?? null) as Chapter | null;
                            set({ chapter, currentChapter: chapter });
                        })()
                    );
                }

                if (requested.has("renown")) {
                    jobs.push(
                        (async () => {
                            if (!sessionId) {
                                set({ renown: null });
                                return;
                            }
                            const r = await safeFetch(
                                `/api/renown?session_id=${encodeURIComponent(sessionId)}`
                            );
                            if (!r.ok) return;
                            const renown = (r.json?.renown ?? null) as Renown | null;
                            set({ renown });
                        })()
                    );
                }

                await Promise.all(jobs);

                // 3) Dépendants du chapitre/adventure_id
                const chapter = get().chapter ?? get().currentChapter ?? null;
                const adventureId = chapter?.adventure_id ?? null;

                if (requested.has("adventure")) {
                    if (!adventureId) {
                        set({ currentAdventure: null });
                    } else {
                        const r = await safeFetch(
                            `/api/adventures?id=${encodeURIComponent(adventureId)}`
                        );
                        if (r.ok)
                            set({
                                currentAdventure: (r.json?.adventure ?? null) as Adventure | null,
                            });
                    }
                }

                if (requested.has("chapterQuests")) {
                    if (!chapter?.id) {
                        set({ currentQuests: [], currentChapterQuests: [] });
                    } else {
                        const r = await safeFetch(
                            `/api/chapter-quests?chapterId=${encodeURIComponent(chapter.id)}`
                        );
                        if (r.ok) {
                            const items = (r.json?.items ?? []) as ChapterQuestFull[];
                            const list = Array.isArray(items) ? items : [];
                            set({
                                currentChapterQuests: list,
                                currentQuests: list.filter((q) => q.status === "doing"),
                            });
                        }
                    }
                }

                if (requested.has("questThreads")) {
                    const chapterQuests = get().currentChapterQuests ?? [];
                    // best-effort: on ne spam pas si vide
                    await Promise.all(
                        chapterQuests
                            .map((cq) => cq?.id)
                            .filter(Boolean)
                            .map((cqId) => get().getQuestThread(String(cqId), { force: true }))
                    );
                }

                if (requested.has("questMessages")) {
                    // ⚠️ on ne sait pas “quel thread est actif” => on refresh les threads déjà en cache
                    const threads = Object.values(get().questThreadsByChapterQuestId).filter(
                        Boolean
                    ) as QuestThreadRow[];
                    await Promise.all(
                        threads.map((t) => get().fetchQuestMessages(t.id, { force: true }))
                    );
                }

                if (requested.has("questChains")) {
                    const advId = get().currentAdventure?.id ?? adventureId ?? null;
                    if (!advId) return;

                    void get().getQuestChainsByAdventure(advId, { force: true });
                }

                if (requested.has("questChainItems")) {
                    // ⚠️ ici, on ne charge pas “tout”, car on n’a pas un chainId unique.
                    // => l’UI doit appeler getQuestChainItems(chainId) au moment opportun.
                    // (on garde ce ReloadKey pour permettre un “refresh” ciblé côté UI)
                }

                if (requested.has("backlog")) {
                    if (!adventureId) {
                        set({ adventureBacklog: [] });
                    } else {
                        await get().loadAdventureBacklog(adventureId);
                    }
                }

                if (requested.has("rooms")) {
                    if (!adventureId) {
                        set({ rooms: [] });
                    } else {
                        const r = await safeFetch(
                            `/api/adventure-rooms?adventureId=${encodeURIComponent(adventureId)}`
                        );
                        if (r.ok) set({ rooms: (r.json?.rooms ?? []) as any[] });
                    }
                }

                if (requested.has("roomTemplates")) {
                    const r = await safeFetch("/api/room-templates");
                    if (r.ok) set({ templates: (r.json?.templates ?? []) as any[] });
                }

                if (requested.has("chaptersByAdventure")) {
                    const advId = get().currentAdventure?.id ?? adventureId ?? null;
                    if (advId) void get().getChaptersByAdventure(advId);
                }

                if (requested.has("questMission")) {
                    const cqs = get().currentChapterQuests ?? [];
                    await Promise.all(
                        cqs.map((cq) => (cq?.id ? get().getQuestMission(cq.id) : Promise.resolve()))
                    );
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : "Reload failed";
                set({ error: msg });
            } finally {
                if (!silent) {
                    set({
                        loading: false,
                        characterLoading: false,
                        renownLoading: false,
                    });
                }
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
        🧺 BACKLOG (nouveau)
        ========================================================================= */

        adventureBacklog: [],
        adventureBacklogLoading: false,

        loadAdventureBacklog: async (adventureId: string) => {
            const id = (adventureId ?? "").trim();
            if (!id) {
                set({ adventureBacklog: [] });
                return [];
            }

            set({ adventureBacklogLoading: true });

            try {
                const res = await apiGet<{ quests: AdventureQuestWithStatus[] }>(
                    `/api/adventure-quests?adventureId=${encodeURIComponent(id)}`
                );

                if (!res.ok) {
                    set({ adventureBacklog: [] });
                    return [];
                }

                const quests = (res.data as any)?.quests ?? [];
                const list = Array.isArray(quests) ? quests : [];

                set({ adventureBacklog: list });
                return list;
            } finally {
                set({ adventureBacklogLoading: false });
            }
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

        createAdventureQuest: async (input) => {
            const toast = useToastStore.getState();

            const adventure_id = (input?.adventure_id ?? "").trim();
            const title = (input?.title ?? "").trim();

            if (!adventure_id || !title) {
                toast.error("Quête", "Titre ou aventure manquant.");
                return null;
            }

            const res = await apiPost<{ quest: AdventureQuest }>("/api/adventure-quests", {
                adventure_id,
                room_code: input.room_code ?? null,
                title,
                description: input.description ?? null,
                difficulty: input.difficulty ?? 2,
                estimate_min: input.estimate_min ?? null,
                urgency: input.urgency ?? "normal",

                // 🔗 (optionnel) si ton API les accepte un jour, tu pourras aussi les envoyer
                // parent_chapter_quest_id: input.parent_chapter_quest_id ?? null,
                // parent_adventure_quest_id: input.parent_adventure_quest_id ?? null,
            });

            if (!res.ok) {
                toast.error("Quête", res.error ?? "Création impossible");
                return null;
            }

            const quest = (res.data as any)?.quest as AdventureQuest | undefined;
            if (!quest?.id) {
                toast.error("Quête", "Création impossible (réponse vide)");
                return null;
            }

            // ✅ UX de base
            toast.success("Quête créée", `📜 ${quest.title}`);

            // ✅ refresh backlog (best-effort)
            void get().reload(["backlog"], { silent: true });

            /* ---------------------------------------------------------------------
    🔗 CHAIN MODE (best-effort)
    - On crée / retrouve une chaîne si on a les 2 parents
    --------------------------------------------------------------------- */
            const parentChapterQuestId = (input as any)?.parent_chapter_quest_id ?? null;
            const parentAdventureQuestId = (input as any)?.parent_adventure_quest_id ?? null;

            const shouldChain =
                typeof parentChapterQuestId === "string" &&
                parentChapterQuestId.trim().length > 0 &&
                typeof parentAdventureQuestId === "string" &&
                parentAdventureQuestId.trim().length > 0;

            if (!shouldChain) return quest;

            const parentAQ = parentAdventureQuestId.trim();

            try {
                // 1) charger les chains de l'aventure (cache ok)
                const chains = await get().getQuestChainsByAdventure(adventure_id, {
                    force: false,
                });

                // 2) retrouver une chaîne qui contient le parent (via items)
                let targetChainId: string | null = null;

                for (const ch of chains) {
                    const items = await get().getQuestChainItems(ch.id, { force: false });
                    const hasParent = (items ?? []).some(
                        (it: any) => (it?.adventure_quest_id ?? it?.quest_id) === parentAQ
                    );

                    if (hasParent) {
                        targetChainId = ch.id;
                        break;
                    }
                }

                // 3) si aucune chaîne existante: on en crée une, puis on ajoute le parent
                if (!targetChainId) {
                    const chainTitle = (input as any)?.parent_title?.trim?.()
                        ? `Chaîne: ${(input as any).parent_title.trim()}`
                        : "Chaîne de quêtes";

                    const created = await get().createQuestChain({
                        adventure_id,
                        title: chainTitle,
                        description: null,
                    });

                    if (!created?.id) {
                        // si on ne peut pas créer la chaîne, on ne bloque pas la création de quête
                        return quest;
                    }

                    targetChainId = created.id;

                    // Ajouter le parent en 1er (best-effort)
                    await get().addQuestToChain(targetChainId, parentAQ);

                    toast.success("Chaîne créée", "Le parent a été lié à la chaîne.");
                }

                // 4) ajouter la nouvelle quête à la chaîne
                const ok = await get().addQuestToChain(targetChainId, quest.id);

                if (ok) {
                    toast.success("Quête enchaînée", "Ajoutée à la chaîne.");
                }

                // 5) refresh des items pour que l'UI voie direct la mise à jour
                void get().getQuestChainItems(targetChainId, { force: true });
                void get().getQuestChainsByAdventure(adventure_id, { force: true });
            } catch (e) {
                // best-effort: on ne casse jamais la création de quête
                console.error("Chain creation failed", e);
                toast.error("Chaîne", "Impossible de lier la quête à la chaîne (création OK).");
            }

            return quest;
        },

        updateAdventureQuest: async (input) => {
            const toast = useToastStore.getState();

            const id = (input?.id ?? "").trim();
            if (!id) {
                toast.error("Quête", "ID manquant.");
                return null;
            }

            const patch: Record<string, any> = { id };

            if (typeof input.title === "string") {
                const t = input.title.trim();
                if (!t) {
                    toast.error("Quête", "Titre invalide.");
                    return null;
                }
                patch.title = t;
            }

            if (input.description === null || typeof input.description === "string") {
                const d = input.description ?? null;
                patch.description = d && d.trim() ? d.trim() : null;
            }

            if (input.room_code === null || typeof input.room_code === "string") {
                const rc = input.room_code ?? null;
                patch.room_code = rc && rc.trim() ? rc.trim() : null;
            }

            if (typeof input.difficulty === "number") {
                if (![1, 2, 3].includes(input.difficulty)) {
                    toast.error("Quête", "Difficulté invalide.");
                    return null;
                }
                patch.difficulty = input.difficulty;
            }

            if (input.estimate_min === null || typeof input.estimate_min === "number") {
                if (input.estimate_min === null) {
                    patch.estimate_min = null;
                } else if (!Number.isFinite(input.estimate_min) || input.estimate_min < 1) {
                    toast.error("Quête", "Estimation invalide.");
                    return null;
                } else {
                    patch.estimate_min = Math.floor(input.estimate_min);
                }
            }

            if (typeof input.urgency === "string") {
                if (!["low", "normal", "high"].includes(input.urgency)) {
                    toast.error("Quête", "Urgence invalide.");
                    return null;
                }
                patch.urgency = input.urgency;
            }

            // rien à patcher (à part id)
            if (Object.keys(patch).length <= 1) {
                toast.error("Quête", "Aucune modification.");
                return null;
            }

            const res = await apiPatch<{ quest: AdventureQuest }>("/api/adventure-quests", patch);

            if (!res.ok) {
                toast.error("Quête", res.error ?? "Modification impossible");
                return null;
            }

            const quest = (res.data as any)?.quest as AdventureQuest | undefined;
            if (!quest?.id) {
                toast.error("Quête", "Modification impossible (réponse vide)");
                return null;
            }

            toast.success("Quête modifiée", `🛠️ ${quest.title}`);

            // ✅ Refresh best-effort: backlog + chapterQuests (là où la quête peut apparaître)
            void get().reload(["backlog", "chapterQuests"], { silent: true });

            return quest;
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

                // ✅ refresh minimal
                void get().reload(["chapterQuests", "backlog"], { silent: true });

                return true;
            } catch (e) {
                console.error(e);
                toast.error("Affectation impossible", "Erreur réseau");
                return false;
            }
        },

        unassignQuestFromChapter: async (chapterQuestId: string, quest?: QuestLite | null) => {
            const toast = useToastStore.getState();
            const journal = useJournalStore.getState();

            const id = (chapterQuestId ?? "").trim();
            if (!id) return false;

            try {
                const res = await apiDelete<{ ok: boolean }>(
                    `/api/chapter-quests/${encodeURIComponent(id)}`
                );

                if (!res.ok) {
                    toast.error("Unassign failed", res.error ?? "Server error");
                    return false;
                }

                // 🔥 Nettoyer caches runtime
                set((s) => {
                    const nextEnc = { ...s.encouragementByChapterQuestId };
                    delete nextEnc[id];

                    const nextCongrats = { ...s.congratsByChapterQuestId };
                    delete nextCongrats[id];

                    const nextCongratsLoading = { ...s.congratsLoadingById };
                    delete nextCongratsLoading[id];

                    return {
                        encouragementByChapterQuestId: nextEnc,
                        congratsByChapterQuestId: nextCongrats,
                        congratsLoadingById: nextCongratsLoading,
                    };
                });

                toast.success("Quest unassigned", "Removed from chapter.");

                const line = questLine(quest);
                void journal.create({
                    kind: "note",
                    title: "➖ Quest unassigned",
                    content: line
                        ? `Removed from chapter: ${line}.`
                        : "A quest was removed from the chapter.",
                    quest_id: quest?.id ?? null,
                });

                // ✅ refresh minimal
                void get().reload(["chapterQuests", "backlog"], { silent: true });

                return true;
            } catch (e) {
                console.error(e);
                toast.error("Unassign failed", "Network error");
                return false;
            }
        },

        /* =========================================================================
        🔗 QUEST CHAINS
        ========================================================================= */

        questChainsByAdventureId: {},
        questChainsLoadingByAdventureId: {},

        getQuestChainsByAdventure: async (adventureId: string, opts) => {
            const id = (adventureId ?? "").trim();
            if (!id) return [];

            const force = !!opts?.force;

            const cached = get().questChainsByAdventureId[id];
            if (!force && cached?.length) return cached;

            set((s) => ({
                questChainsLoadingByAdventureId: {
                    ...s.questChainsLoadingByAdventureId,
                    [id]: true,
                },
            }));

            try {
                const res = await apiGet<{ chains: QuestChain[] }>(
                    `/api/quest-chains?adventureId=${encodeURIComponent(id)}`
                );

                if (!res.ok) return [];

                const list = (res.data as any)?.chains ?? [];
                const chains = Array.isArray(list) ? list : [];

                set((s) => ({
                    questChainsByAdventureId: {
                        ...s.questChainsByAdventureId,
                        [id]: chains,
                    },
                }));

                return chains;
            } finally {
                set((s) => ({
                    questChainsLoadingByAdventureId: {
                        ...s.questChainsLoadingByAdventureId,
                        [id]: false,
                    },
                }));
            }
        },

        createQuestChain: async (input) => {
            const toast = useToastStore.getState();

            const adventure_id = (input?.adventure_id ?? "").trim();
            if (!adventure_id) return null;

            const res = await apiPost<{ chain: QuestChain | null }>("/api/quest-chains", {
                adventure_id,
                title: input.title ?? null,
                description: input.description ?? null,
            });

            if (!res.ok) {
                toast.error("Chaîne", res.error ?? "Création impossible");
                return null;
            }

            const chain = (res.data as any)?.chain ?? null;
            if (!chain?.id) return null;

            toast.success("Chaîne créée", chain.title ?? "Nouvelle chaîne");

            // ✅ refresh cache (best-effort)
            void get().getQuestChainsByAdventure(adventure_id, { force: true });

            return chain;
        },

        updateQuestChain: async (chainId, input) => {
            const toast = useToastStore.getState();

            const id = (chainId ?? "").trim();
            if (!id) return null;

            // PATCH: on ne passe que les champs présents (cohérent côté API)
            const payload: Record<string, any> = {};
            if ("title" in input) payload.title = input.title ?? null;
            if ("description" in input) payload.description = input.description ?? null;

            try {
                const res = await fetch(`/api/quest-chains/${encodeURIComponent(id)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const json = await fetchJson(res);

                if (!res.ok) {
                    toast.error("Chaîne", json?.error ?? "Mise à jour impossible");
                    return null;
                }

                const chain = json?.chain ?? null;
                if (!chain?.id) return null;

                toast.success("Chaîne mise à jour", chain.title ?? undefined);

                // ✅ Réconcilier cache local: on patch l’item dans la liste (si on le retrouve)
                set((s) => {
                    const next = { ...s.questChainsByAdventureId };

                    // on ne connaît pas adventure_id ici avec certitude: on le cherche
                    for (const advId of Object.keys(next)) {
                        const list = next[advId] ?? [];
                        const idx = list.findIndex((c) => c.id === id);
                        if (idx >= 0) {
                            const patched = list.slice();
                            patched[idx] = { ...patched[idx], ...chain };
                            next[advId] = patched;
                            break;
                        }
                    }

                    return { questChainsByAdventureId: next };
                });

                return chain as QuestChain;
            } catch {
                toast.error("Chaîne", "Erreur réseau");
                return null;
            }
        },

        deleteQuestChain: async (chainId) => {
            const toast = useToastStore.getState();
            const id = (chainId ?? "").trim();
            if (!id) return false;

            const res = await apiDelete<{ ok: boolean }>(
                `/api/quest-chains/${encodeURIComponent(id)}`
            );
            if (!res.ok) {
                toast.error("Chaîne", res.error ?? "Suppression impossible");
                return false;
            }

            toast.success("Chaîne supprimée", undefined);

            // ✅ purge caches
            set((s) => {
                const nextChains = { ...s.questChainsByAdventureId };
                for (const advId of Object.keys(nextChains)) {
                    nextChains[advId] = (nextChains[advId] ?? []).filter((c) => c.id !== id);
                }

                const nextItems = { ...s.questChainItemsByChainId };
                delete nextItems[id];

                const nextItemsLoading = { ...s.questChainItemsLoadingByChainId };
                delete nextItemsLoading[id];

                return {
                    questChainsByAdventureId: nextChains,
                    questChainItemsByChainId: nextItems,
                    questChainItemsLoadingByChainId: nextItemsLoading,
                };
            });

            return true;
        },

        questChainItemsByChainId: {},
        questChainItemsLoadingByChainId: {},

        getQuestChainItems: async (chainId: string, opts) => {
            const id = (chainId ?? "").trim();
            if (!id) return [];

            const force = !!opts?.force;

            const cached = get().questChainItemsByChainId[id];
            if (!force && cached?.length) return cached;

            set((s) => ({
                questChainItemsLoadingByChainId: {
                    ...s.questChainItemsLoadingByChainId,
                    [id]: true,
                },
            }));

            try {
                const res = await apiGet<{ items: QuestChainItem[] }>(
                    `/api/quest-chains/${encodeURIComponent(id)}/items`
                );

                if (!res.ok) return [];

                const list = (res.data as any)?.items ?? [];
                const items = Array.isArray(list) ? list : [];

                set((s) => ({
                    questChainItemsByChainId: {
                        ...s.questChainItemsByChainId,
                        [id]: items,
                    },
                }));

                return items;
            } finally {
                set((s) => ({
                    questChainItemsLoadingByChainId: {
                        ...s.questChainItemsLoadingByChainId,
                        [id]: false,
                    },
                }));
            }
        },

        addQuestToChain: async (chainId, adventureQuestId) => {
            const toast = useToastStore.getState();

            const cid = (chainId ?? "").trim();
            const qid = (adventureQuestId ?? "").trim();
            if (!cid || !qid) return false;

            const res = await apiPost<{ item?: any }>(
                `/api/quest-chains/${encodeURIComponent(cid)}/items`,
                { adventure_quest_id: qid }
            );

            if (!res.ok) {
                toast.error("Chaîne", res.error ?? "Ajout impossible");
                return false;
            }

            toast.success("Quête ajoutée", "Ajoutée à la chaîne");

            // ✅ refresh items (best-effort)
            void get().getQuestChainItems(cid, { force: true });

            return true;
        },

        reorderQuestChainItem: async (itemId, position) => {
            const toast = useToastStore.getState();

            const id = (itemId ?? "").trim();
            if (!id) return false;

            const pos = Number(position);
            if (!Number.isInteger(pos) || pos < 1) return false;

            try {
                const res = await fetch(`/api/quest-chain-items/${encodeURIComponent(id)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ position: pos }),
                });

                const json = await fetchJson(res);

                if (!res.ok) {
                    toast.error("Chaîne", json?.error ?? "Réorganisation impossible");
                    return false;
                }

                // ✅ patch optimiste local: on remonte l’item dans le cache s’il existe
                set((s) => {
                    const next = { ...s.questChainItemsByChainId };

                    for (const chainId of Object.keys(next)) {
                        const list = next[chainId] ?? [];
                        const idx = list.findIndex((it) => it.id === id);
                        if (idx < 0) continue;

                        const updated = { ...list[idx], position: pos };

                        const without = list.filter((it) => it.id !== id);
                        const withUpdated = [...without, updated].sort(
                            (a, b) => (a.position ?? 0) - (b.position ?? 0)
                        );

                        next[chainId] = withUpdated;
                        break;
                    }

                    return { questChainItemsByChainId: next };
                });

                return true;
            } catch {
                toast.error("Chaîne", "Erreur réseau");
                return false;
            }
        },

        removeQuestFromChain: async (itemId) => {
            const toast = useToastStore.getState();

            const id = (itemId ?? "").trim();
            if (!id) return false;

            const res = await apiDelete<{ ok: boolean }>(
                `/api/quest-chain-items/${encodeURIComponent(id)}`
            );

            if (!res.ok) {
                toast.error("Chaîne", res.error ?? "Suppression impossible");
                return false;
            }

            toast.success("Retirée de la chaîne", undefined);

            // ✅ purge dans tous les caches (on ne connaît pas chain_id forcément)
            set((s) => {
                const next = { ...s.questChainItemsByChainId };
                for (const chainId of Object.keys(next)) {
                    next[chainId] = (next[chainId] ?? []).filter((it) => it.id !== id);
                }
                return { questChainItemsByChainId: next };
            });

            return true;
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

        /* =========================================================================
📸 PHOTOS (quêtes)
======================================================================== */

        questPhotosByChapterQuestId: {},
        questPhotosLoadingByChapterQuestId: {},
        questPhotosErrorByChapterQuestId: {},

        clearQuestPhotos: (chapterQuestId) =>
            set((s) => {
                const id = (chapterQuestId ?? "").trim();
                if (!id) return s;

                const next = { ...s.questPhotosByChapterQuestId };
                delete next[id];

                const nextL = { ...s.questPhotosLoadingByChapterQuestId };
                delete nextL[id];

                const nextE = { ...s.questPhotosErrorByChapterQuestId };
                delete nextE[id];

                return {
                    questPhotosByChapterQuestId: next,
                    questPhotosLoadingByChapterQuestId: nextL,
                    questPhotosErrorByChapterQuestId: nextE,
                };
            }),

        fetchQuestPhotos: async (chapterQuestId, opts) => {
            const id = (chapterQuestId ?? "").trim();
            if (!id) return [];

            const force = !!opts?.force;

            const cached = get().questPhotosByChapterQuestId[id];
            if (!force && cached?.length) return cached;

            set((s) => ({
                questPhotosLoadingByChapterQuestId: {
                    ...s.questPhotosLoadingByChapterQuestId,
                    [id]: true,
                },
                questPhotosErrorByChapterQuestId: {
                    ...s.questPhotosErrorByChapterQuestId,
                    [id]: null,
                },
            }));

            try {
                const res = await apiGet<{ rows: PhotoRow[] }>(
                    `/api/photos?chapterQuestId=${encodeURIComponent(id)}`
                );

                if (!res.ok) {
                    set((s) => ({
                        questPhotosErrorByChapterQuestId: {
                            ...s.questPhotosErrorByChapterQuestId,
                            [id]: res.error ?? "Failed to fetch photos",
                        },
                    }));
                    return [];
                }

                const rows = Array.isArray((res.data as any)?.rows)
                    ? ((res.data as any).rows as PhotoRow[])
                    : [];

                set((s) => ({
                    questPhotosByChapterQuestId: {
                        ...s.questPhotosByChapterQuestId,
                        [id]: rows,
                    },
                }));

                return rows;
            } finally {
                set((s) => ({
                    questPhotosLoadingByChapterQuestId: {
                        ...s.questPhotosLoadingByChapterQuestId,
                        [id]: false,
                    },
                }));
            }
        },

        refreshQuestPhotos: async (chapterQuestId) => {
            return await get().fetchQuestPhotos(chapterQuestId, { force: true });
        },

        getQuestPhotosByCategory: (chapterQuestId, category) => {
            const id = (chapterQuestId ?? "").trim();
            if (!id) return [];

            const rows = get().questPhotosByChapterQuestId[id] ?? [];
            return (rows ?? [])
                .filter((p) => p?.category === category)
                .sort((a, b) => {
                    // tri stable: sort ASC, puis created_at DESC
                    const sa = a?.sort ?? 0;
                    const sb = b?.sort ?? 0;
                    if (sa !== sb) return sa - sb;
                    return String(b?.created_at ?? "").localeCompare(String(a?.created_at ?? ""));
                });
        },

        uploadQuestPhoto: async (input) => {
            const toast = useToastStore.getState();

            const chapter_quest_id = (input?.chapter_quest_id ?? "").trim();
            if (!chapter_quest_id) return null;

            if (!(input.file instanceof File)) {
                toast.error("Photo", "Fichier manquant.");
                return null;
            }

            const category = (input.category ?? "other") as any;

            const form = new FormData();
            form.set("chapter_quest_id", chapter_quest_id);
            form.set("category", category);
            form.set("file", input.file);

            if (input.caption != null) form.set("caption", String(input.caption));
            if (input.sort != null) form.set("sort", String(input.sort));
            if (input.is_cover != null) form.set("is_cover", String(!!input.is_cover));
            if (input.width != null) form.set("width", String(input.width));
            if (input.height != null) form.set("height", String(input.height));

            // UI: on peut afficher un loader par CQ
            set((s) => ({
                questPhotosLoadingByChapterQuestId: {
                    ...s.questPhotosLoadingByChapterQuestId,
                    [chapter_quest_id]: true,
                },
                questPhotosErrorByChapterQuestId: {
                    ...s.questPhotosErrorByChapterQuestId,
                    [chapter_quest_id]: null,
                },
            }));

            try {
                const res = await apiPostForm<{ photo: PhotoRow; signed_url: string | null }>(
                    "/api/photos",
                    form
                );

                if (!res.ok) {
                    toast.error("Upload", res.error ?? "Upload impossible");
                    set((s) => ({
                        questPhotosErrorByChapterQuestId: {
                            ...s.questPhotosErrorByChapterQuestId,
                            [chapter_quest_id]: res.error ?? "Upload failed",
                        },
                    }));
                    return null;
                }

                const photo = (res.data as any)?.photo ?? null;
                const signed_url = (res.data as any)?.signed_url ?? null;

                const enriched: PhotoRow | null = photo ? ({ ...photo, signed_url } as any) : null;

                // patch optimiste: on ajoute en tête
                if (enriched?.id) {
                    set((s) => {
                        const prev = s.questPhotosByChapterQuestId[chapter_quest_id] ?? [];
                        return {
                            questPhotosByChapterQuestId: {
                                ...s.questPhotosByChapterQuestId,
                                [chapter_quest_id]: [enriched, ...prev],
                            },
                        };
                    });

                    toast.success(
                        "Photo ajoutée",
                        category === "initial"
                            ? "📸 Initiale"
                            : category === "final"
                              ? "🏁 Finale"
                              : "📎 Autre"
                    );
                }

                return enriched;
            } finally {
                set((s) => ({
                    questPhotosLoadingByChapterQuestId: {
                        ...s.questPhotosLoadingByChapterQuestId,
                        [chapter_quest_id]: false,
                    },
                }));
            }
        },

        deletePhoto: async (photoId, chapterQuestId) => {
            const toast = useToastStore.getState();
            const id = (photoId ?? "").trim();
            if (!id) return false;

            // optimiste: enlever de la liste si on connait la CQ
            let snapshot: PhotoRow[] | null = null;
            if (chapterQuestId) {
                const cqId = chapterQuestId.trim();
                snapshot = (get().questPhotosByChapterQuestId[cqId] ?? []).slice();

                set((s) => ({
                    questPhotosByChapterQuestId: {
                        ...s.questPhotosByChapterQuestId,
                        [cqId]: (s.questPhotosByChapterQuestId[cqId] ?? []).filter(
                            (p) => p.id !== id
                        ),
                    },
                }));
            }

            const res = await apiDelete<{ ok: boolean }>(
                `/api/photos?id=${encodeURIComponent(id)}`
            );

            if (!res.ok) {
                // rollback si snapshot
                if (chapterQuestId && snapshot) {
                    const cqId = chapterQuestId.trim();
                    set((s) => ({
                        questPhotosByChapterQuestId: {
                            ...s.questPhotosByChapterQuestId,
                            [cqId]: snapshot ?? [],
                        },
                    }));
                }

                toast.error("Suppression", res.error ?? "Impossible de supprimer");
                return false;
            }

            toast.success("Photo supprimée", undefined);
            return true;
        },

        /* =========================================================================
💬 QUEST THREADS
======================================================================== */

        currentQuestThreadId: null,
        setCurrentQuestThreadId: (currentQuestThreadId: string | null) => {
            currentQuestThreadId ? set({ currentQuestThreadId }) : "";
        },

        questThreadsByChapterQuestId: {},
        questThreadsLoadingByChapterQuestId: {},
        questThreadsErrorByChapterQuestId: {},

        clearQuestThread: (chapterQuestId) =>
            set((s) => {
                const id = (chapterQuestId ?? "").trim();
                if (!id) return s;

                const nextT = { ...s.questThreadsByChapterQuestId };
                delete nextT[id];

                const nextL = { ...s.questThreadsLoadingByChapterQuestId };
                delete nextL[id];

                const nextE = { ...s.questThreadsErrorByChapterQuestId };
                delete nextE[id];

                return {
                    questThreadsByChapterQuestId: nextT,
                    questThreadsLoadingByChapterQuestId: nextL,
                    questThreadsErrorByChapterQuestId: nextE,
                };
            }),

        getQuestThread: async (chapterQuestId, opts) => {
            const id = (chapterQuestId ?? "").trim();
            if (!id) return null;

            const force = !!opts?.force;
            const cached = get().questThreadsByChapterQuestId[id];
            if (!force && cached?.id) return cached;

            set((s) => ({
                questThreadsLoadingByChapterQuestId: {
                    ...s.questThreadsLoadingByChapterQuestId,
                    [id]: true,
                },
                questThreadsErrorByChapterQuestId: {
                    ...s.questThreadsErrorByChapterQuestId,
                    [id]: null,
                },
            }));

            try {
                const res = await apiGet<{ thread: QuestThreadRow | null }>(
                    `/api/quest-threads?chapterQuestId=${encodeURIComponent(id)}`
                );

                if (!res.ok) {
                    set((s) => ({
                        questThreadsErrorByChapterQuestId: {
                            ...s.questThreadsErrorByChapterQuestId,
                            [id]: res.error ?? "Failed to fetch thread",
                        },
                    }));
                    return null;
                }

                const thread = (res.data as any)?.thread ?? null;

                if (thread?.id) {
                    set((s) => ({
                        questThreadsByChapterQuestId: {
                            ...s.questThreadsByChapterQuestId,
                            [id]: thread,
                        },
                    }));
                }

                return thread?.id ? thread : null;
            } finally {
                set((s) => ({
                    questThreadsLoadingByChapterQuestId: {
                        ...s.questThreadsLoadingByChapterQuestId,
                        [id]: false,
                    },
                }));
            }
        },

        ensureQuestThread: async (chapterQuestId) => {
            const id = (chapterQuestId ?? "").trim();
            if (!id) return null;

            // 1) try get existing
            const existing = await get().getQuestThread(id, { force: false });
            if (existing?.id) return existing;

            // 2) create
            const sessionId = useSessionStore.getState().activeSessionId;
            if (!sessionId) return null;

            const res = await apiPost<{ thread: QuestThreadRow | null }>("/api/quest-threads", {
                session_id: sessionId,
                chapter_quest_id: id,
            });

            if (!res.ok) {
                set((s) => ({
                    questThreadsErrorByChapterQuestId: {
                        ...s.questThreadsErrorByChapterQuestId,
                        [id]: res.error ?? "Failed to create thread",
                    },
                }));
                return null;
            }

            const thread = (res.data as any)?.thread ?? null;

            if (thread?.id) {
                set((s) => ({
                    questThreadsByChapterQuestId: {
                        ...s.questThreadsByChapterQuestId,
                        [id]: thread,
                    },
                }));
                return thread;
            }

            return null;
        },

        /* =========================================================================
📨 QUEST MESSAGES
======================================================================== */

        questMessagesByThreadId: {},
        questMessagesLoadingByThreadId: {},
        questMessagesErrorByThreadId: {},

        clearQuestMessages: (threadId) =>
            set((s) => {
                const id = (threadId ?? "").trim();
                if (!id) return s;

                const nextM = { ...s.questMessagesByThreadId };
                delete nextM[id];

                const nextL = { ...s.questMessagesLoadingByThreadId };
                delete nextL[id];

                const nextE = { ...s.questMessagesErrorByThreadId };
                delete nextE[id];

                return {
                    questMessagesByThreadId: nextM,
                    questMessagesLoadingByThreadId: nextL,
                    questMessagesErrorByThreadId: nextE,
                };
            }),

        fetchQuestMessages: async (threadId, opts) => {
            const id = (threadId ?? "").trim();
            if (!id) return [];

            const force = !!opts?.force;
            const cached = get().questMessagesByThreadId[id];
            if (!force && cached?.length) return cached;

            set((s) => ({
                questMessagesLoadingByThreadId: {
                    ...s.questMessagesLoadingByThreadId,
                    [id]: true,
                },
                questMessagesErrorByThreadId: {
                    ...s.questMessagesErrorByThreadId,
                    [id]: null,
                },
            }));

            try {
                const res = await apiGet<{ rows: QuestMessageRow[] }>(
                    `/api/quest-messages?threadId=${encodeURIComponent(id)}`
                );

                if (!res.ok) {
                    set((s) => ({
                        questMessagesErrorByThreadId: {
                            ...s.questMessagesErrorByThreadId,
                            [id]: res.error ?? "Failed to fetch messages",
                        },
                    }));
                    return [];
                }

                const rows = Array.isArray((res.data as any)?.rows)
                    ? ((res.data as any).rows as QuestMessageRow[])
                    : [];

                // tri asc par created_at (si ton API ne le fait pas déjà)
                rows.sort((a, b) =>
                    String(a?.created_at ?? "").localeCompare(String(b?.created_at ?? ""))
                );

                set((s) => ({
                    questMessagesByThreadId: {
                        ...s.questMessagesByThreadId,
                        [id]: rows,
                    },
                }));

                return rows;
            } finally {
                set((s) => ({
                    questMessagesLoadingByThreadId: {
                        ...s.questMessagesLoadingByThreadId,
                        [id]: false,
                    },
                }));
            }
        },

        refreshQuestMessages: async (threadId) => {
            return await get().fetchQuestMessages(threadId, { force: true });
        },

        createQuestMessage: async (input) => {
            const toast = useToastStore.getState();

            const session_id = (input?.session_id ?? "").trim();
            const thread_id = (input?.thread_id ?? "").trim();
            const chapter_quest_id = (input?.chapter_quest_id ?? "").trim();
            const content = (input?.content ?? "").trim();

            if (!session_id || !thread_id || !chapter_quest_id) return null;
            if (!input.role || !input.kind || !content) return null;

            const res = await apiPost<{ message: QuestMessageRow | null }>("/api/quest-messages", {
                session_id,
                thread_id,
                chapter_quest_id,
                role: input.role,
                kind: input.kind,
                content,
                title: input.title ?? null,
                meta: input.meta ?? null,
                photo_id: input.photo_id ?? null,
            });

            if (!res.ok) {
                toast.error("Message", res.error ?? "Envoi impossible");
                return null;
            }

            const message = (res.data as any)?.message ?? null;
            if (!message?.id) return null;

            // patch optimiste: append
            set((s) => {
                const prev = s.questMessagesByThreadId[thread_id] ?? [];
                return {
                    questMessagesByThreadId: {
                        ...s.questMessagesByThreadId,
                        [thread_id]: [...prev, message],
                    },
                };
            });

            return message;
        },

        /* =========================================================================
📜 QUEST MISSION (brief MJ)
======================================================================== */

        questMissionByChapterQuestId: {},
        questMissionLoadingById: {},

        clearQuestMission: (chapterQuestId) =>
            set((s) => {
                const next = { ...s.questMissionByChapterQuestId };
                delete next[chapterQuestId];
                return { questMissionByChapterQuestId: next };
            }),

        getQuestMission: async (chapterQuestId: string) => {
            if (!chapterQuestId) return null;

            set((s) => ({
                questMissionLoadingById: {
                    ...s.questMissionLoadingById,
                    [chapterQuestId]: true,
                },
            }));

            try {
                const res = await apiGet<{ mission: any | null }>(
                    `/api/quest-mission?chapterQuestId=${encodeURIComponent(chapterQuestId)}`
                );

                if (!res.ok) return null;

                const mission = res.data?.mission ?? null;

                if (mission) {
                    set((s) => ({
                        questMissionByChapterQuestId: {
                            ...s.questMissionByChapterQuestId,
                            [chapterQuestId]: mission,
                        },
                    }));
                }

                return mission;
            } finally {
                set((s) => ({
                    questMissionLoadingById: {
                        ...s.questMissionLoadingById,
                        [chapterQuestId]: false,
                    },
                }));
            }
        },

        generateQuestMission: async (chapterQuestId: string, force = false) => {
            if (!chapterQuestId) return null;

            set((s) => ({
                questMissionLoadingById: {
                    ...s.questMissionLoadingById,
                    [chapterQuestId]: true,
                },
            }));

            try {
                const url = `/api/quest-mission${force ? "?force=true" : ""}`;

                const res = await apiPost<{ mission: any | null; cached?: boolean }>(url, {
                    chapterQuestId,
                });

                if (!res.ok) {
                    useToastStore.getState().error("Mission", res.error ?? "Génération impossible");
                    return null;
                }

                const mission = (res.data as any)?.mission ?? null;

                if (mission) {
                    set((s) => ({
                        questMissionByChapterQuestId: {
                            ...s.questMissionByChapterQuestId,
                            [chapterQuestId]: mission,
                        },
                    }));

                    useToastStore
                        .getState()
                        .success(
                            "Mission reçue",
                            res.data?.cached ? "Depuis les archives" : "Le Maître du Jeu a parlé"
                        );
                }

                return mission;
            } finally {
                set((s) => ({
                    questMissionLoadingById: {
                        ...s.questMissionLoadingById,
                        [chapterQuestId]: false,
                    },
                }));
            }
        },

        badges: [],
        renownLevels: [],

        badgesLoading: false,
        renownLevelsLoading: false,
        badgesError: null,
        renownLevelsError: null,

        getBadges: async (args) => {
            const force = !!args?.force;
            const { badges, badgesLoading } = get() as any;

            if (!force && Array.isArray(badges) && badges.length > 0) return badges;
            if (badgesLoading) return (badges ?? []) as BadgeCatalogRow[];

            set({ badgesLoading: true, badgesError: null } as any);

            try {
                const res = await fetch("/api/badges", {
                    method: "GET",
                    headers: { Accept: "application/json" },
                });

                const body = await safeJson(res);

                if (!res.ok) {
                    const msg = (body as any)?.error ?? `Failed to fetch badges (${res.status})`;
                    set({ badgesLoading: false, badgesError: msg } as any);
                    return (get() as any).badges as BadgeCatalogRow[];
                }

                const next = ((body as any)?.badges ?? []) as BadgeCatalogRow[];
                set({ badges: next, badgesLoading: false, badgesError: null } as any);
                return next;
            } catch (e: any) {
                const msg = e?.message ? String(e.message) : "Failed to fetch badges";
                set({ badgesLoading: false, badgesError: msg } as any);
                return (get() as any).badges as BadgeCatalogRow[];
            }
        },

        getRenownLevels: async (args) => {
            const force = !!args?.force;
            const tier = typeof args?.tier === "number" ? args.tier : null;
            const milestonesOnly = !!args?.milestonesOnly;

            const { renownLevels, renownLevelsLoading } = get() as any;

            // ⚠️ cache simple: on ne court-circuite que si on demande le catalogue complet
            const askingFullCatalog = tier === null && !milestonesOnly;

            if (
                !force &&
                askingFullCatalog &&
                Array.isArray(renownLevels) &&
                renownLevels.length > 0
            ) {
                return renownLevels;
            }
            if (renownLevelsLoading) return (renownLevels ?? []) as RenownLevelRow[];

            set({ renownLevelsLoading: true, renownLevelsError: null } as any);

            try {
                const qs = new URLSearchParams();
                if (tier !== null) qs.set("tier", String(tier));
                if (milestonesOnly) qs.set("milestones", "1");

                const url = qs.toString()
                    ? `/api/renown-levels?${qs.toString()}`
                    : "/api/renown-levels";

                const res = await fetch(url, {
                    method: "GET",
                    headers: { Accept: "application/json" },
                });

                const body = await safeJson(res);

                if (!res.ok) {
                    const msg =
                        (body as any)?.error ?? `Failed to fetch renown levels (${res.status})`;
                    set({ renownLevelsLoading: false, renownLevelsError: msg } as any);
                    return (get() as any).renownLevels as RenownLevelRow[];
                }

                const next = ((body as any)?.levels ?? []) as RenownLevelRow[];

                // On stocke uniquement le catalogue complet dans le store "principal"
                if (askingFullCatalog) {
                    set({
                        renownLevels: next,
                        renownLevelsLoading: false,
                        renownLevelsError: null,
                    } as any);
                } else {
                    // si query (tier/milestones), on ne remplace pas le full cache
                    set({
                        renownLevelsLoading: false,
                        renownLevelsError: null,
                    } as any);
                }

                return next;
            } catch (e: any) {
                const msg = e?.message ? String(e.message) : "Failed to fetch renown levels";
                set({ renownLevelsLoading: false, renownLevelsError: msg } as any);
                return (get() as any).renownLevels as RenownLevelRow[];
            }
        },
    };
});
