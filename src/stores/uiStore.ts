// src/stores/uiStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiStore = {
    devMode: boolean;
    commandPaletteOpen: boolean;

    // ✅ v0.1.1
    reduceAnimations: boolean;

    setDevMode: (value: boolean) => void;
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
    toggleCommandPalette: () => void;

    // ✅ v0.1.1
    setReduceAnimations: (value: boolean) => void;
    toggleReduceAnimations: () => void;
};

export const useUiStore = create(
    persist<UiStore>(
        (set) => ({
            devMode: true,
            commandPaletteOpen: false,

            // ✅ v0.1.1
            reduceAnimations: false,

            setDevMode: (value) => set({ devMode: value }),
            openCommandPalette: () => set({ commandPaletteOpen: true }),
            closeCommandPalette: () => set({ commandPaletteOpen: false }),
            toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

            // ✅ v0.1.1
            setReduceAnimations: (value) => set({ reduceAnimations: value }),
            toggleReduceAnimations: () => set((s) => ({ reduceAnimations: !s.reduceAnimations })),
        }),
        { name: "renaissance_ui" }
    )
);
