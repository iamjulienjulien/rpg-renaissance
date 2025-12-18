import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ToastTone = "success" | "error" | "info" | "warning";

export type Toast = {
    id: string;
    tone: ToastTone;
    title: string;
    message?: string;
    createdAt: number;
    durationMs: number;
};

type ToastInput = {
    tone?: ToastTone;
    title: string;
    message?: string;
    durationMs?: number;
};

type ToastStore = {
    toasts: Toast[];
    push: (input: ToastInput) => string;
    dismiss: (id: string) => void;
    clear: () => void;

    success: (title: string, message?: string, durationMs?: number) => string;
    error: (title: string, message?: string, durationMs?: number) => string;
    info: (title: string, message?: string, durationMs?: number) => string;
    warning: (title: string, message?: string, durationMs?: number) => string;
};

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

export const useToastStore = create<ToastStore>()(
    persist(
        (set, get) => ({
            toasts: [],

            push: (input) => {
                const tone: ToastTone = input.tone ?? "info";
                const id = uid();

                const toast: Toast = {
                    id,
                    tone,
                    title: input.title,
                    message: input.message,
                    createdAt: Date.now(),
                    durationMs: input.durationMs ?? defaultDuration(tone),
                };

                set((s) => ({
                    toasts: [toast, ...s.toasts].slice(0, 4), // max 4 toasts
                }));

                return id;
            },

            dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

            clear: () => set({ toasts: [] }),

            success: (title, message, durationMs) =>
                get().push({ tone: "success", title, message, durationMs }),
            error: (title, message, durationMs) =>
                get().push({ tone: "error", title, message, durationMs }),
            info: (title, message, durationMs) =>
                get().push({ tone: "info", title, message, durationMs }),
            warning: (title, message, durationMs) =>
                get().push({ tone: "warning", title, message, durationMs }),
        }),
        {
            name: "renaissance-toast-store",
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
