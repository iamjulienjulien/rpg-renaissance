// src/stores/toastStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

export type ToastTone = "success" | "error" | "info" | "warning";

export type Toast = {
    id: string;
    tone: ToastTone;
    title: string;
    message?: string;
    createdAt: number;
    durationMs: number | null;
    source?: "local" | "db";
};

export type ToastInput = {
    tone?: ToastTone;
    title: string;
    message?: string;
    durationMs?: number;
};

type DbToast = {
    id: string;
    kind: "achievement" | "system" | "info";
    title: string;
    message: string;
    payload: any;
    status: "unread" | "read" | "dismissed";
    created_at: string;
};

type ToastStore = {
    toasts: Toast[];

    // ✅ core
    push: (input: ToastInput | Toast) => string;
    dismiss: (id: string) => void;
    clear: () => void;

    replayLastDbToast: () => Promise<boolean>;

    // ✅ sugar
    success: (title: string, message?: string, durationMs?: number) => string;
    error: (title: string, message?: string, durationMs?: number) => string;
    info: (title: string, message?: string, durationMs?: number) => string;
    warning: (title: string, message?: string, durationMs?: number) => string;

    // ✅ db live engine
    startLive: () => void;
    stopLive: () => void;

    // internal refs (non persistées)
    _started: boolean;
    _channel: any | null;
    _supabase: SupabaseClient | null;

    // timers (non persistés)
    _timers: Record<string, number>;

    // helpers
    _ensureTimers: () => void;
    _markRead: (id: string) => Promise<void>;
    _markDismissed: (id: string) => Promise<void>;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function uid() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function defaultDuration(tone: ToastTone) {
    if (tone === "error") return 6000;
    if (tone === "warning") return 4500;
    return 3200;
}

function safeStr(x: unknown) {
    return typeof x === "string" ? x : "";
}

function mapDbToastToStore(t: DbToast): Toast {
    const payloadJson = t.payload ? JSON.stringify(t.payload) : "{}";
    const message = `${safeStr(t.message ?? "")}`.trim() + `\n\n__PAYLOAD__${payloadJson}`;

    return {
        id: t.id,
        tone: t.kind === "achievement" ? "success" : "info",
        title: t.title,
        message,
        createdAt: Date.now(),
        durationMs: t.kind === "achievement" ? null : 4200, // ✅ persistant
        source: "db",
    };
}

/* ============================================================================
🏪 STORE
============================================================================ */

export const useToastStore = create<ToastStore>()(
    persist(
        (set, get) => ({
            toasts: [],

            _started: false,
            _channel: null,
            _supabase: null,
            _timers: {},

            push: (input) => {
                console.log("input", input);
                // ✅ accepte Toast complet (id DB) ou ToastInput (id auto)
                const isFull =
                    typeof (input as any)?.id === "string" &&
                    typeof (input as any)?.tone === "string";

                const toast: Toast = isFull
                    ? ({
                          ...(input as Toast),
                          source: (input as Toast).source ?? "local",
                          createdAt: (input as Toast).createdAt ?? Date.now(),
                          durationMs: (input as Toast).durationMs ?? null,
                      } as Toast)
                    : (() => {
                          const t = input as ToastInput;
                          console.log("t", t);
                          const tone: ToastTone = t.tone ?? "info";
                          return {
                              id: uid(),
                              tone,
                              title: t.title,
                              message: t.message,
                              createdAt: Date.now(),
                              durationMs: t.durationMs ?? defaultDuration(tone),
                              source: "local",
                          };
                      })();

                console.log("new toast", toast);

                set((s) => ({
                    toasts: [toast, ...s.toasts].slice(0, 4),
                }));

                // ✅ start timer if needed
                get()._ensureTimers();

                return toast.id;
            },

            dismiss: (id) => {
                const toast = get().toasts.find((t) => t.id === id);

                // clear timer
                const tm = get()._timers[id];
                if (tm) {
                    window.clearTimeout(tm);
                    set((s) => {
                        const next = { ...s._timers };
                        delete next[id];
                        return { _timers: next } as any;
                    });
                }

                set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));

                // best effort DB dismiss
                if (toast?.source === "db") {
                    void get()._markDismissed(id);
                }
            },

            clear: () => {
                // clear all timers
                const timers = get()._timers;
                for (const id of Object.keys(timers)) window.clearTimeout(timers[id]);

                set({ toasts: [], _timers: {} as any });
            },

            replayLastDbToast: async () => {
                try {
                    const res = await fetch("/api/toasts/replay", { method: "POST" });
                    if (!res.ok) return false;

                    const json = (await res.json()) as { ok: boolean; toast?: DbToast };
                    if (!json?.toast) return false;

                    // ✅ Push immédiat local (debug-friendly)
                    // Même si la subscription ne capte pas l'UPDATE, tu le vois direct.
                    get().push(mapDbToastToStore(json.toast));

                    // (optionnel) marquer read direct si tu veux garder le même comportement
                    void get()._markRead(json.toast.id);

                    return true;
                } catch {
                    return false;
                }
            },

            success: (title, message, durationMs) =>
                get().push({ tone: "success", title, message, durationMs }),
            error: (title, message, durationMs) =>
                get().push({ tone: "error", title, message, durationMs }),
            info: (title, message, durationMs) =>
                get().push({ tone: "info", title, message, durationMs }),
            warning: (title, message, durationMs) =>
                get().push({ tone: "warning", title, message, durationMs }),

            _ensureTimers: () => {
                // crée des timers uniquement pour les toasts présents
                const { toasts, _timers } = get();

                const nextTimers = { ..._timers };
                let changed = false;

                for (const t of toasts) {
                    if (nextTimers[t.id]) continue;

                    const ms = t.durationMs;
                    if (typeof ms !== "number" || ms <= 0) continue; // ✅ null => persistant

                    const handle = window.setTimeout(() => {
                        get().dismiss(t.id);
                    }, ms);

                    nextTimers[t.id] = handle;
                    changed = true;
                }

                // supprime timers orphelins
                for (const id of Object.keys(nextTimers)) {
                    if (!toasts.some((t) => t.id === id)) {
                        window.clearTimeout(nextTimers[id]);
                        delete nextTimers[id];
                        changed = true;
                    }
                }

                if (changed) set({ _timers: nextTimers } as any);
            },

            _markRead: async (id) => {
                await fetch("/api/toasts/read", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                }).catch(() => null);
            },

            _markDismissed: async (id) => {
                await fetch("/api/toasts/dismiss", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                }).catch(() => null);
            },

            startLive: () => {
                // anti double start (Strict Mode)
                console.log("startLive");
                if (get()._started) return;

                const supabase = supabaseBrowser();
                set({ _started: true, _supabase: supabase } as any);

                // 1) bootstrap unread
                (async () => {
                    const { data, error } = await supabase
                        .from("user_toasts")
                        .select("id,kind,title,message,payload,status,created_at")
                        .eq("status", "unread")
                        .order("created_at", { ascending: false })
                        .limit(10);

                    if (!error && Array.isArray(data)) {
                        for (const t of data as DbToast[]) {
                            get().push(mapDbToastToStore(t));
                            void get()._markRead(t.id);
                        }
                    }
                })().catch(() => null);

                // 2) live inserts
                const channel = supabase
                    .channel("user_toasts_live")
                    .on(
                        "postgres_changes",
                        { event: "INSERT", schema: "public", table: "user_toasts" },
                        (payload: any) => {
                            const row = payload?.new as DbToast | undefined;
                            console.log("[toasts] INSERT", payload);
                            if (!row) return;
                            if (row.status !== "unread") return;

                            get().push(mapDbToastToStore(row));
                            void get()._markRead(row.id);
                        }
                    )
                    .on(
                        "postgres_changes",
                        { event: "UPDATE", schema: "public", table: "user_toasts" },
                        (payload: any) => {
                            console.log("[toasts] UPDATE", payload);

                            const row = payload?.new as DbToast | undefined;
                            if (!row) return;

                            // ✅ debug-friendly: si la DB marque dismissed, on enlève local
                            if (row.status === "dismissed") {
                                // évite d'appeler _markDismissed à nouveau (dismiss() le ferait)
                                set((s) => ({ toasts: s.toasts.filter((t) => t.id !== row.id) }));
                                return;
                            }

                            // ✅ optionnel: si un toast repasse "unread", on le (ré)affiche
                            if (row.status === "unread") {
                                get().push(mapDbToastToStore(row));
                                void get()._markRead(row.id);
                            }
                        }
                    )
                    .subscribe();

                set({ _channel: channel } as any);
            },

            stopLive: () => {
                const supabase = get()._supabase;
                const channel = get()._channel;

                if (supabase && channel) {
                    supabase.removeChannel(channel);
                }

                set({ _started: false, _channel: null, _supabase: null } as any);
            },
        }),
        {
            name: "renaissance-toast-store",
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({ toasts: state.toasts }), // ✅ n’enregistre pas channel/timers
        }
    )
);
