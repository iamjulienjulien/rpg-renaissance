import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type DevStore = {
    enabled: boolean;

    logsVerbose: boolean;
    overlays: boolean;

    apiLatencyMs: number; // 0 = off

    setEnabled: (v: boolean) => void;
    toggleEnabled: () => void;

    setLogsVerbose: (v: boolean) => void;
    setOverlays: (v: boolean) => void;
    setApiLatencyMs: (ms: number) => void;

    toggleOverlays: () => void;

    resetDevSettings: () => void;
};

const defaults = {
    enabled: false,
    logsVerbose: false,
    overlays: false,
    apiLatencyMs: 0,
};

export const useDevStore = create<DevStore>()(
    persist(
        (set, get) => ({
            ...defaults,

            setEnabled: (v) => set({ enabled: v }),
            toggleEnabled: () => set({ enabled: !get().enabled }),

            setLogsVerbose: (v) => set({ logsVerbose: v }),
            setOverlays: (v) => set({ overlays: v }),
            setApiLatencyMs: (ms) => set({ apiLatencyMs: ms }),

            toggleOverlays: () => set({ overlays: !get().overlays }),

            resetDevSettings: () => set({ ...defaults }),
        }),
        {
            name: "renaissance-dev-store",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
