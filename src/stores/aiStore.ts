import { create } from "zustand";
import { supabaseBrowser } from "@/lib/supabase/client";

/* ============================================================================
🧠 TYPES
============================================================================ */

type GenerateQuestMissionArgs = {
    chapter_quest_id: string;
    user_id: string;
    force?: boolean;
};

type GenerateQuestEncouragementArgs = {
    chapter_quest_id: string;
    user_id: string;
};

type GenerateQuestMissionResult = {
    jobId: string;
    status: "queued";
};

type GenerateResult = {
    jobId: string;
    status: "queued";
};

export type AiJobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export type AiJobPending = {
    jobId: string;
    jobType: string;
    chapter_quest_id?: string;
    status: AiJobStatus;
    result?: any | null;
    error?: string | null;
};

type AiStore = {
    /* ---------------------------------------------------------------------
     State
    --------------------------------------------------------------------- */

    aiJobsPending: AiJobPending[];

    /* ---------------------------------------------------------------------
     Actions
    --------------------------------------------------------------------- */
    pushPendingJob: (job: AiJobPending) => void;
    updateJobStatus: (jobId: string, patch: Partial<AiJobPending>) => void;
    checkQuestMissionJobs: () => void;
    checkQuestEncouragementJobs: () => void;
    checkQuestPhotoMessageJobs: () => void;

    loadPendingJobs: () => Promise<void>;
    subscribeToAiJobs: (user_id: string) => () => void;

    questMissionLoading: boolean;
    questMissionGenerating: boolean;

    generateQuestMission: (
        args: GenerateQuestMissionArgs
    ) => Promise<GenerateQuestMissionResult | null>;

    questEncouragementLoading: boolean;
    questEncouragementGenerating: boolean;

    generateQuestEncouragement: (
        args: GenerateQuestEncouragementArgs
    ) => Promise<GenerateResult | null>;

    questPhotoMessageGenerating: boolean;

    startQuestPhotoMessageGenerating: () => void;
};

/* ============================================================================
🗺️ STORE
============================================================================ */

export const useAiStore = create<AiStore>((set, get) => ({
    aiJobsPending: [],

    /* ------------------------------------------------------------
     Push un job en pending (source unique)
    ------------------------------------------------------------ */
    pushPendingJob(job) {
        set((state) => ({
            aiJobsPending: [...state.aiJobsPending.filter((j) => j.jobId !== job.jobId), job],
        }));

        // recalcul automatique
        get().checkQuestMissionJobs();
        get().checkQuestEncouragementJobs();
        get().checkQuestPhotoMessageJobs();
    },

    /* ------------------------------------------------------------
     Recalcule l’état global questMissionGenerating
    ------------------------------------------------------------ */
    checkQuestMissionJobs() {
        const jobs = get().aiJobsPending.filter((j) => j.jobType === "quest_mission");

        if (!jobs.length) {
            set({ questMissionGenerating: false });
            return;
        }

        const hasRunning = jobs.some((j) => j.status === "queued" || j.status === "running");

        set({ questMissionGenerating: hasRunning });
    },

    checkQuestEncouragementJobs() {
        const jobs = get().aiJobsPending.filter((j) => j.jobType === "quest_encouragement");

        if (!jobs.length) {
            set({ questEncouragementGenerating: false });
            return;
        }

        const hasRunning = jobs.some((j) => j.status === "queued" || j.status === "running");

        set({ questEncouragementGenerating: hasRunning });
    },

    checkQuestPhotoMessageJobs() {
        const jobs = get().aiJobsPending.filter((j) => j.jobType === "quest_photo_message");

        if (!jobs.length) {
            set({ questPhotoMessageGenerating: false });
            return;
        }

        const hasRunning = jobs.some((j) => j.status === "queued" || j.status === "running");

        set({ questPhotoMessageGenerating: hasRunning });
    },

    /* ------------------------------------------------------------
     Update job (Realtime)
    ------------------------------------------------------------ */
    updateJobStatus(jobId, patch) {
        set((state) => ({
            aiJobsPending: state.aiJobsPending.map((job) =>
                job.jobId === jobId ? { ...job, ...patch } : job
            ),
        }));

        get().checkQuestMissionJobs();
        get().checkQuestEncouragementJobs();
        get().checkQuestPhotoMessageJobs();
    },

    /* ------------------------------------------------------------
     Chargement initial des jobs (au boot)
    ------------------------------------------------------------ */
    async loadPendingJobs() {
        try {
            const res = await fetch("/api/ai/jobs?limit=200");
            if (!res.ok) return;

            const data = await res.json();
            const items = Array.isArray(data?.items) ? data.items : [];

            for (const row of items) {
                if (!row?.id || !row?.job_type) continue;

                get().pushPendingJob({
                    jobId: row.id,
                    jobType: row.job_type,
                    chapter_quest_id: row.chapter_quest_id ?? undefined,
                    status: row.status as AiJobStatus,
                    result: row.result ?? null,
                    error: row.error_message ?? null,
                });
            }
        } catch (err) {
            console.error("[aiStore] loadPendingJobs failed", err);
        }
    },

    /* ------------------------------------------------------------
     Realtime subscription (Supabase)
    ------------------------------------------------------------ */
    subscribeToAiJobs(user_id) {
        if (!user_id) {
            console.warn("[aiStore] subscribeToAiJobs: missing user_id");
            return () => {};
        }

        const supabase = supabaseBrowser();

        const channel = supabase
            .channel(`ai-jobs-${user_id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "ai_jobs",
                    filter: `user_id=eq.${user_id}`,
                },
                (payload) => {
                    const row = payload.new as any;
                    if (!row?.id) return;

                    get().updateJobStatus(row.id, {
                        status: row.status,
                        result: row.result ?? null,
                        error: row.error_message ?? null,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /* ------------------------------------------------------------
     Generate quest mission
    ------------------------------------------------------------ */
    questMissionLoading: false,
    questMissionGenerating: false,

    async generateQuestMission({ chapter_quest_id, user_id, force }) {
        if (!chapter_quest_id || !user_id) {
            console.warn("[aiStore] Missing chapter_quest_id or user_id");
            return null;
        }

        set({ questMissionLoading: true, questMissionGenerating: true });

        try {
            const res = await fetch("/api/ai/quest-mission", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chapter_quest_id,
                    user_id,
                    force: !!force,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null);
                console.error("[aiStore] quest-mission failed", err);
                return null;
            }

            const data = (await res.json()) as GenerateQuestMissionResult;

            get().pushPendingJob({
                jobId: data.jobId,
                jobType: "quest_mission",
                chapter_quest_id,
                status: "queued",
            });

            return data;
        } catch (err) {
            console.error("[aiStore] quest-mission error", err);
            return null;
        } finally {
            set({ questMissionLoading: false });
        }
    },

    /* ------------------------------------------------------------
     Generate quest encouragement
    ------------------------------------------------------------ */
    questEncouragementLoading: false,
    questEncouragementGenerating: false,

    async generateQuestEncouragement({ chapter_quest_id, user_id }) {
        if (!chapter_quest_id || !user_id) {
            console.warn("[aiStore] Missing chapter_quest_id or user_id");
            return null;
        }

        set({ questEncouragementLoading: true, questEncouragementGenerating: true });

        try {
            const res = await fetch("/api/ai/quest-encouragement", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chapter_quest_id,
                    user_id,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null);
                console.error("[aiStore] quest-encouragement failed", err);
                return null;
            }

            const data = (await res.json()) as GenerateResult;

            get().pushPendingJob({
                jobId: data.jobId,
                jobType: "quest_encouragement",
                chapter_quest_id,
                status: "queued",
            });

            return data;
        } catch (err) {
            console.error("[aiStore] quest-encouragement error", err);
            return null;
        } finally {
            set({ questEncouragementLoading: false });
        }
    },

    questPhotoMessageGenerating: false,
    startQuestPhotoMessageGenerating() {
        set({ questPhotoMessageGenerating: true });
    },
}));
