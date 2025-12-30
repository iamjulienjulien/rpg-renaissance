// src/lib/admin/adminStore.ts
"use client";

import { create } from "zustand";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type AdminKpis = {
    sessions: number;
    adventures: number;
    chapters: number;
    quests_total: number;
    quests_done: number;
    completion_rate: number; // %
};

export type AiGenerationStatus = "success" | "error";

export type AiGenerationRow = {
    id: string;
    created_at: string;
    session_id: string;
    user_id: string | null;

    generation_type: string;
    source: string | null;

    provider: string | null;
    model: string;

    status: AiGenerationStatus;

    duration_ms: number | null;

    error_message: string | null;
    error_code: string | null;

    chapter_quest_id: string | null;
    chapter_id: string | null;
    adventure_id: string | null;
};

export type AiGenerationFullRow = Record<string, any>;

export type AiGenerationsFilters = {
    q?: string;
    type?: string;
    status?: AiGenerationStatus | "all";
    model?: string;
    limit?: number;
    offset?: number;
};

export type AdminUserRow = {
    user_id: string;
    email: string | null; // ✅ NEW
    created_at: string | null;

    sessions_count: number;
    adventures_count: number;
    quests_count: number;
};

export type AdminUsersFilters = {
    q?: string;
    limit?: number;
    offset?: number;
};

export type AdminUserEmailRow = {
    user_id: string;
    email: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
};

export type AdminSessionRow = {
    session_id: string;

    user_id: string;
    user_email: string | null;

    title: string;
    status: string;
    is_active: boolean;

    created_at: string;
    last_activity_at: string;

    adventures_count: number;
    quests_count: number;
    quests_done_count: number;
};

export type AdminSessionsFilters = {
    q?: string;
    userId?: string;
    limit?: number;
    offset?: number;
};

export type AdminAdventureRow = {
    adventure_id: string;

    session_id: string;
    user_id: string;
    user_email: string | null;

    title: string;
    created_at: string;

    chapters_count: number;
    quests_count: number;
    quests_done_count: number;
    completion_rate: number; // %
};

export type AdminAdventuresFilters = {
    q?: string;
    userId?: string;
    sessionId?: string;
    limit?: number;
    offset?: number;
};

export type AdminChapterRow = {
    chapter_id: string;

    // parent links
    adventure_id: string | null;
    session_id: string | null;

    // user (enrichi côté store via usersEmailsById)
    user_id: string | null;
    user_email: string | null;

    title: string;
    chapter_code: string;
    kind: string;
    pace: string;
    status: string;

    created_at: string;

    quests_count: number;
    quests_done_count: number;
    completion_rate: number; // %
};

export type AdminChaptersFilters = {
    q?: string;
    userId?: string;
    sessionId?: string;
    adventureId?: string;
    limit?: number;
    offset?: number;
};

export type AdminQuestRow = {
    chapter_quest_id: string;

    // links
    chapter_id: string;
    adventure_id: string;
    session_id: string;
    user_id: string;
    user_email: string | null;

    // quest data
    adventure_quest_id: string;
    title: string;
    room_code: string | null;

    status: "todo" | "doing" | "done";
    created_at: string;

    difficulty: number | null;
    estimate_min: number | null;
    priority: "secondary" | "main" | null;
    urgency: "low" | "normal" | "high" | null;

    // helpful labels (optional but nice for UI)
    chapter_code: string | null;
    chapter_title: string | null;
    adventure_title: string | null;
    session_title: string | null;
};

export type AdminQuestsFilters = {
    q?: string;

    userId?: string;
    sessionId?: string;
    adventureId?: string;
    chapterId?: string;

    status?: "all" | "todo" | "doing" | "done";

    limit?: number;
    offset?: number;
};

export type SystemLogLevel = "debug" | "info" | "success" | "warning" | "error";

export type SystemLogRow = {
    id: string;
    created_at: string;

    level: SystemLogLevel;
    message: string;

    request_id: string | null;
    trace_id: string | null;

    route: string | null;
    method: string | null;
    status_code: number | null;
    duration_ms: number | null;

    session_id: string | null;
    user_id: string | null;
    chapter_id: string | null;
    adventure_id: string | null;
    chapter_quest_id: string | null;
    adventure_quest_id: string | null;

    source: string | null;

    file: string | null;
    line: number | null;
    function_name: string | null;

    error_name: string | null;
    error_message: string | null;

    // stack est “full”, tu le verras surtout au détail
    stack?: string | null;

    metadata: Record<string, any>;
};

export type SystemLogsFilters = {
    q?: string;
    level?: SystemLogLevel | "all";
    route?: string;
    method?: string;
    statusCode?: string; // string pour input, cast côté API
    source?: string;

    userId?: string;
    sessionId?: string;
    requestId?: string;
    traceId?: string;

    limit?: number;
    offset?: number;
};

type AdminState = {
    // KPIs
    kpis: AdminKpis | null;
    kpisLoading: boolean;
    kpisError: string | null;
    fetchKpis: () => Promise<void>;

    // List
    aiGenerations: AiGenerationRow[];
    aiGenerationsCount: number | null;
    aiGenerationsLoading: boolean;
    aiGenerationsError: string | null;
    aiGenerationsFilters: AiGenerationsFilters;

    // Drawer selection
    selectedAiGenerationId: string | null;
    selectedAiGenerationFull: AiGenerationFullRow | null;
    selectedAiGenerationLoading: boolean;
    selectedAiGenerationError: string | null;

    // Actions
    setAiGenerationsFilters: (patch: Partial<AiGenerationsFilters>) => void;
    fetchAiGenerations: (opts?: { reset?: boolean }) => Promise<void>;

    openAiGeneration: (id: string) => void;
    closeAiGeneration: () => void;
    fetchAiGenerationById: (id: string) => Promise<void>;

    // Users list
    users: AdminUserRow[];
    usersCount: number | null;
    usersLoading: boolean;
    usersError: string | null;
    usersFilters: AdminUsersFilters;

    setUsersFilters: (patch: Partial<AdminUsersFilters>) => void;
    fetchUsers: (opts?: { reset?: boolean }) => Promise<void>;

    // Users emails cache (auth.users)
    usersEmailsById: Record<string, AdminUserEmailRow>;
    usersEmailsLoading: boolean;
    usersEmailsError: string | null;
    fetchUsersEmails: (opts?: { force?: boolean }) => Promise<void>;

    // Sessions list
    sessions: AdminSessionRow[];
    sessionsCount: number | null;
    sessionsLoading: boolean;
    sessionsError: string | null;
    sessionsFilters: AdminSessionsFilters;

    setSessionsFilters: (patch: Partial<AdminSessionsFilters>) => void;
    fetchSessions: (opts?: { reset?: boolean }) => Promise<void>;

    // Adventures list
    adventures: AdminAdventureRow[];
    adventuresCount: number | null;
    adventuresLoading: boolean;
    adventuresError: string | null;
    adventuresFilters: AdminAdventuresFilters;

    setAdventuresFilters: (patch: Partial<AdminAdventuresFilters>) => void;
    fetchAdventures: (opts?: { reset?: boolean }) => Promise<void>;

    // Chapters list
    chapters: AdminChapterRow[];
    chaptersCount: number | null;
    chaptersLoading: boolean;
    chaptersError: string | null;
    chaptersFilters: AdminChaptersFilters;

    setChaptersFilters: (patch: Partial<AdminChaptersFilters>) => void;
    fetchChapters: (opts?: { reset?: boolean }) => Promise<void>;

    // Quests list
    quests: AdminQuestRow[];
    questsCount: number | null;
    questsLoading: boolean;
    questsError: string | null;
    questsFilters: AdminQuestsFilters;

    setQuestsFilters: (patch: Partial<AdminQuestsFilters>) => void;
    fetchQuests: (opts?: { reset?: boolean }) => Promise<void>;

    // System logs list
    systemLogs: SystemLogRow[];
    systemLogsCount: number | null;
    systemLogsLoading: boolean;
    systemLogsError: string | null;
    systemLogsFilters: SystemLogsFilters;

    setSystemLogsFilters: (patch: Partial<SystemLogsFilters>) => void;
    fetchSystemLogs: (opts?: { reset?: boolean }) => Promise<void>;

    // Drawer selection (detail)
    selectedSystemLogId: string | null;
    selectedSystemLogFull: Record<string, any> | null;
    selectedSystemLogLoading: boolean;
    selectedSystemLogError: string | null;

    openSystemLog: (id: string) => void;
    closeSystemLog: () => void;
    fetchSystemLogById: (id: string) => Promise<void>;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function toQueryString(filters: AiGenerationsFilters) {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    if (filters.type) params.set("type", filters.type);
    if (filters.model) params.set("model", filters.model);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);

    params.set("limit", String(filters.limit ?? 25));
    params.set("offset", String(filters.offset ?? 0));

    return params.toString();
}

function toUsersQueryString(filters: AdminUsersFilters) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    params.set("limit", String(filters.limit ?? 25));
    params.set("offset", String(filters.offset ?? 0));
    return params.toString();
}

function toSessionsQueryString(filters: AdminSessionsFilters) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.userId) params.set("userId", filters.userId);
    params.set("limit", String(filters.limit ?? 25));
    params.set("offset", String(filters.offset ?? 0));
    return params.toString();
}

function toAdventuresQueryString(filters: AdminAdventuresFilters) {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.sessionId) params.set("sessionId", filters.sessionId);

    params.set("limit", String(filters.limit ?? 25));
    params.set("offset", String(filters.offset ?? 0));

    return params.toString();
}

function toChaptersQueryString(filters: AdminChaptersFilters) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);

    if (filters.userId) params.set("userId", filters.userId);
    if (filters.sessionId) params.set("sessionId", filters.sessionId);
    if (filters.adventureId) params.set("adventureId", filters.adventureId);

    params.set("limit", String(filters.limit ?? 25));
    params.set("offset", String(filters.offset ?? 0));
    return params.toString();
}

function toQuestsQueryString(filters: AdminQuestsFilters) {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);

    if (filters.userId) params.set("userId", filters.userId);
    if (filters.sessionId) params.set("sessionId", filters.sessionId);
    if (filters.adventureId) params.set("adventureId", filters.adventureId);
    if (filters.chapterId) params.set("chapterId", filters.chapterId);

    if (filters.status && filters.status !== "all") params.set("status", filters.status);

    params.set("limit", String(filters.limit ?? 25));
    params.set("offset", String(filters.offset ?? 0));

    return params.toString();
}

function toSystemLogsQueryString(filters: SystemLogsFilters) {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    if (filters.level && filters.level !== "all") params.set("level", filters.level);
    if (filters.route) params.set("route", filters.route);
    if (filters.method) params.set("method", filters.method);
    if (filters.statusCode) params.set("statusCode", filters.statusCode);
    if (filters.source) params.set("source", filters.source);

    if (filters.userId) params.set("userId", filters.userId);
    if (filters.sessionId) params.set("sessionId", filters.sessionId);
    if (filters.requestId) params.set("requestId", filters.requestId);
    if (filters.traceId) params.set("traceId", filters.traceId);

    params.set("limit", String(filters.limit ?? 25));
    params.set("offset", String(filters.offset ?? 0));

    return params.toString();
}

/* ============================================================================
🗃️ STORE
============================================================================ */

export const useAdminStore = create<AdminState>((set, get) => ({
    // KPIs
    kpis: null,
    kpisLoading: false,
    kpisError: null,

    fetchKpis: async () => {
        set({ kpisLoading: true, kpisError: null });

        try {
            const res = await fetch("/api/admin/kpis", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            set({
                kpis: json?.kpis ?? null,
                kpisLoading: false,
                kpisError: null,
            });
        } catch (e: any) {
            set({
                kpisLoading: false,
                kpisError: e?.message || "Failed to fetch KPIs",
            });
        }
    },

    // List
    aiGenerations: [],
    aiGenerationsCount: null,
    aiGenerationsLoading: false,
    aiGenerationsError: null,
    aiGenerationsFilters: {
        q: "",
        type: "",
        status: "all",
        model: "",
        limit: 25,
        offset: 0,
    },

    // Drawer
    selectedAiGenerationId: null,
    selectedAiGenerationFull: null,
    selectedAiGenerationLoading: false,
    selectedAiGenerationError: null,

    setAiGenerationsFilters: (patch) => {
        set((s) => ({
            aiGenerationsFilters: {
                ...s.aiGenerationsFilters,
                ...patch,
            },
        }));
    },

    fetchAiGenerations: async (opts) => {
        const reset = !!opts?.reset;

        const filters = get().aiGenerationsFilters;
        const nextFilters = reset ? { ...filters, offset: 0 } : filters;

        if (reset) set({ aiGenerationsFilters: nextFilters });

        set({ aiGenerationsLoading: true, aiGenerationsError: null });

        try {
            const qs = toQueryString(nextFilters);
            const res = await fetch(`/api/admin/ai-generations?${qs}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);

            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            set({
                aiGenerations: Array.isArray(json?.rows) ? json.rows : [],
                aiGenerationsCount: typeof json?.count === "number" ? json.count : null,
                aiGenerationsLoading: false,
                aiGenerationsError: null,
            });
        } catch (e: any) {
            set({
                aiGenerationsLoading: false,
                aiGenerationsError: e?.message || "Failed to fetch ai_generations",
            });
        }
    },

    openAiGeneration: (id) => {
        set({
            selectedAiGenerationId: id,
            selectedAiGenerationFull: null,
            selectedAiGenerationLoading: true,
            selectedAiGenerationError: null,
        });

        void get().fetchAiGenerationById(id);
    },

    closeAiGeneration: () => {
        set({
            selectedAiGenerationId: null,
            selectedAiGenerationFull: null,
            selectedAiGenerationLoading: false,
            selectedAiGenerationError: null,
        });
    },

    fetchAiGenerationById: async (id) => {
        set({ selectedAiGenerationLoading: true, selectedAiGenerationError: null });

        try {
            const res = await fetch(`/api/admin/ai-generations?id=${encodeURIComponent(id)}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);

            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            set({
                selectedAiGenerationFull: json?.row ?? null,
                selectedAiGenerationLoading: false,
                selectedAiGenerationError: null,
            });
        } catch (e: any) {
            set({
                selectedAiGenerationLoading: false,
                selectedAiGenerationError: e?.message || "Failed to fetch ai_generation row",
            });
        }
    },

    // Users
    users: [],
    usersCount: null,
    usersLoading: false,
    usersError: null,
    usersFilters: { q: "", limit: 25, offset: 0 },

    setUsersFilters: (patch) => {
        set((s) => ({
            usersFilters: { ...s.usersFilters, ...patch },
        }));
    },

    fetchUsers: async (opts) => {
        const reset = !!opts?.reset;
        const filters = get().usersFilters;
        const nextFilters = reset ? { ...filters, offset: 0 } : filters;

        if (reset) set({ usersFilters: nextFilters });

        set({ usersLoading: true, usersError: null });

        try {
            const qs = toUsersQueryString(nextFilters);
            const res = await fetch(`/api/admin/users?${qs}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            set({
                users: Array.isArray(json?.rows) ? json.rows : [],
                usersCount: typeof json?.count === "number" ? json.count : null,
                usersLoading: false,
                usersError: null,
            });
        } catch (e: any) {
            set({
                usersLoading: false,
                usersError: e?.message || "Failed to fetch users",
            });
        }
    },

    // Users emails cache
    usersEmailsById: {},
    usersEmailsLoading: false,
    usersEmailsError: null,

    fetchUsersEmails: async (opts) => {
        const force = !!opts?.force;
        const alreadyHasSome = Object.keys(get().usersEmailsById).length > 0;
        if (!force && alreadyHasSome) return;

        set({ usersEmailsLoading: true, usersEmailsError: null });

        try {
            // On récupère “tout” en pages, ou juste une grosse page si tu as peu d’utilisateurs
            // (simple et suffisant pour une v1)
            const res = await fetch(`/api/admin/users-emails?limit=200&offset=0`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            const byId: Record<string, AdminUserEmailRow> = {};
            for (const u of Array.isArray(json?.rows) ? json.rows : []) {
                if (u?.user_id) byId[u.user_id] = u;
            }

            set({
                usersEmailsById: byId,
                usersEmailsLoading: false,
                usersEmailsError: null,
            });
        } catch (e: any) {
            set({
                usersEmailsLoading: false,
                usersEmailsError: e?.message || "Failed to fetch users emails",
            });
        }
    },

    // Sessions
    sessions: [],
    sessionsCount: null,
    sessionsLoading: false,
    sessionsError: null,
    sessionsFilters: { q: "", userId: "", limit: 25, offset: 0 },

    setSessionsFilters: (patch) => {
        set((s) => ({
            sessionsFilters: { ...s.sessionsFilters, ...patch },
        }));
    },

    fetchSessions: async (opts) => {
        const reset = !!opts?.reset;
        const filters = get().sessionsFilters;
        const nextFilters = reset ? { ...filters, offset: 0 } : filters;

        if (reset) set({ sessionsFilters: nextFilters });

        set({ sessionsLoading: true, sessionsError: null });

        try {
            const qs = toSessionsQueryString(nextFilters);
            const res = await fetch(`/api/admin/sessions?${qs}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            const rawRows = Array.isArray(json?.rows) ? json.rows : [];
            let emails = get().usersEmailsById;

            // Si le cache est vide, on tente un fetch une fois (non bloquant)
            if (Object.keys(emails).length === 0) {
                void (await get().fetchUsersEmails());
                emails = get().usersEmailsById;
            }

            console.log(emails);

            const enriched = rawRows.map((s: any) => ({
                ...s,
                user_email: s.user_email ?? emails[s.user_id]?.email ?? null,
            }));

            console.log(enriched);

            set({
                sessions: enriched,
                sessionsCount: typeof json?.count === "number" ? json.count : null,
                sessionsLoading: false,
                sessionsError: null,
            });
        } catch (e: any) {
            set({
                sessionsLoading: false,
                sessionsError: e?.message || "Failed to fetch sessions",
            });
        }
    },

    // Adventures
    adventures: [],
    adventuresCount: null,
    adventuresLoading: false,
    adventuresError: null,
    adventuresFilters: { q: "", userId: "", sessionId: "", limit: 25, offset: 0 },

    setAdventuresFilters: (patch) => {
        set((s) => ({
            adventuresFilters: { ...s.adventuresFilters, ...patch },
        }));
    },

    fetchAdventures: async (opts) => {
        const reset = !!opts?.reset;
        const filters = get().adventuresFilters;
        const nextFilters = reset ? { ...filters, offset: 0 } : filters;

        if (reset) set({ adventuresFilters: nextFilters });

        set({ adventuresLoading: true, adventuresError: null });

        try {
            const qs = toAdventuresQueryString(nextFilters);
            const res = await fetch(`/api/admin/adventures?${qs}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            const rawRows = Array.isArray(json?.rows) ? json.rows : [];

            // 🔁 cache emails
            let emails = get().usersEmailsById;

            // Lazy fetch (non bloquant mais awaited ici pour cohérence UI)
            if (Object.keys(emails).length === 0) {
                await get().fetchUsersEmails();
                emails = get().usersEmailsById;
            }

            const enriched = rawRows.map((a: any) => ({
                ...a,
                user_email: a.user_email ?? emails[a.user_id]?.email ?? null,
            }));

            set({
                adventures: enriched,
                adventuresCount: typeof json?.count === "number" ? json.count : null,
                adventuresLoading: false,
                adventuresError: null,
            });
        } catch (e: any) {
            set({
                adventuresLoading: false,
                adventuresError: e?.message || "Failed to fetch adventures",
            });
        }
    },

    // Chapters
    chapters: [],
    chaptersCount: null,
    chaptersLoading: false,
    chaptersError: null,
    chaptersFilters: { q: "", userId: "", sessionId: "", adventureId: "", limit: 25, offset: 0 },

    setChaptersFilters: (patch) => {
        set((s) => ({
            chaptersFilters: { ...s.chaptersFilters, ...patch },
        }));
    },

    fetchChapters: async (opts) => {
        const reset = !!opts?.reset;
        const filters = get().chaptersFilters;
        const nextFilters = reset ? { ...filters, offset: 0 } : filters;

        if (reset) set({ chaptersFilters: nextFilters });

        set({ chaptersLoading: true, chaptersError: null });

        try {
            const qs = toChaptersQueryString(nextFilters);
            const res = await fetch(`/api/admin/chapters?${qs}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            const rawRows = Array.isArray(json?.rows) ? json.rows : [];

            // hydrate emails comme sessions/adventures
            let emails = get().usersEmailsById;

            if (Object.keys(emails).length === 0) {
                await get().fetchUsersEmails();
                emails = get().usersEmailsById;
            }

            const enriched = rawRows.map((c: any) => ({
                ...c,
                user_email: c.user_email ?? (c.user_id ? emails[c.user_id]?.email : null) ?? null,
            }));

            set({
                chapters: enriched,
                chaptersCount: typeof json?.count === "number" ? json.count : null,
                chaptersLoading: false,
                chaptersError: null,
            });
        } catch (e: any) {
            set({
                chaptersLoading: false,
                chaptersError: e?.message || "Failed to fetch chapters",
            });
        }
    },

    // Quests
    quests: [],
    questsCount: null,
    questsLoading: false,
    questsError: null,
    questsFilters: {
        q: "",
        userId: "",
        sessionId: "",
        adventureId: "",
        chapterId: "",
        status: "all",
        limit: 25,
        offset: 0,
    },

    setQuestsFilters: (patch) => {
        set((s) => ({
            questsFilters: { ...s.questsFilters, ...patch },
        }));
    },

    fetchQuests: async (opts) => {
        const reset = !!opts?.reset;
        const filters = get().questsFilters;
        const nextFilters = reset ? { ...filters, offset: 0 } : filters;

        if (reset) set({ questsFilters: nextFilters });

        set({ questsLoading: true, questsError: null });

        try {
            const qs = toQuestsQueryString(nextFilters);
            const res = await fetch(`/api/admin/quests?${qs}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            const rawRows = Array.isArray(json?.rows) ? json.rows : [];
            let emails = (get() as any).usersEmailsById ?? {};

            // Même logique que Sessions: hydrate emails cache si vide
            if (
                Object.keys(emails).length === 0 &&
                typeof (get() as any).fetchUsersEmails === "function"
            ) {
                await (get() as any).fetchUsersEmails();
                emails = (get() as any).usersEmailsById ?? {};
            }

            const enriched = rawRows.map((r: any) => ({
                ...r,
                user_email: r.user_email ?? emails?.[r.user_id]?.email ?? null,
            }));

            set({
                quests: enriched,
                questsCount: typeof json?.count === "number" ? json.count : null,
                questsLoading: false,
                questsError: null,
            });
        } catch (e: any) {
            set({
                questsLoading: false,
                questsError: e?.message || "Failed to fetch quests",
            });
        }
    },

    // System logs
    systemLogs: [],
    systemLogsCount: null,
    systemLogsLoading: false,
    systemLogsError: null,
    systemLogsFilters: {
        q: "",
        level: "all",
        route: "",
        method: "",
        statusCode: "",
        source: "",
        userId: "",
        sessionId: "",
        requestId: "",
        traceId: "",
        limit: 25,
        offset: 0,
    },

    setSystemLogsFilters: (patch) => {
        set((s) => ({
            systemLogsFilters: { ...(s as any).systemLogsFilters, ...patch },
        }));
    },

    fetchSystemLogs: async (opts) => {
        const reset = !!opts?.reset;

        const filters = (get() as any).systemLogsFilters as any;
        const nextFilters = reset ? { ...filters, offset: 0 } : filters;

        if (reset) set({ systemLogsFilters: nextFilters } as any);

        set({ systemLogsLoading: true, systemLogsError: null } as any);

        try {
            const qs = toSystemLogsQueryString(nextFilters);
            const res = await fetch(`/api/admin/system-logs?${qs}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            set({
                systemLogs: Array.isArray(json?.rows) ? json.rows : [],
                systemLogsCount: typeof json?.count === "number" ? json.count : null,
                systemLogsLoading: false,
                systemLogsError: null,
            } as any);
        } catch (e: any) {
            set({
                systemLogsLoading: false,
                systemLogsError: e?.message || "Failed to fetch system_logs",
            } as any);
        }
    },

    selectedSystemLogId: null,
    selectedSystemLogFull: null,
    selectedSystemLogLoading: false,
    selectedSystemLogError: null,

    openSystemLog: (id) => {
        set({
            selectedSystemLogId: id,
            selectedSystemLogFull: null,
            selectedSystemLogLoading: true,
            selectedSystemLogError: null,
        } as any);

        void (get() as any).fetchSystemLogById(id);
    },

    closeSystemLog: () => {
        set({
            selectedSystemLogId: null,
            selectedSystemLogFull: null,
            selectedSystemLogLoading: false,
            selectedSystemLogError: null,
        } as any);
    },

    fetchSystemLogById: async (id) => {
        set({ selectedSystemLogLoading: true, selectedSystemLogError: null } as any);

        try {
            const res = await fetch(`/api/admin/system-logs?id=${encodeURIComponent(id)}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

            set({
                selectedSystemLogFull: json?.row ?? null,
                selectedSystemLogLoading: false,
                selectedSystemLogError: null,
            } as any);
        } catch (e: any) {
            set({
                selectedSystemLogLoading: false,
                selectedSystemLogError: e?.message || "Failed to fetch system_log row",
            } as any);
        }
    },
}));
