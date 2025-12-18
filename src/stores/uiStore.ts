import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiStore = {
    devMode: boolean;
    commandPaletteOpen: boolean;

    setDevMode: (value: boolean) => void;
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
    toggleCommandPalette: () => void;
};

export const useUiStore = create(
    persist<UiStore>(
        (set) => ({
            devMode: true,
            commandPaletteOpen: false,
            setDevMode: (value) => set({ devMode: value }),
            openCommandPalette: () => set({ commandPaletteOpen: true }),
            closeCommandPalette: () => set({ commandPaletteOpen: false }),
            toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
        }),
        { name: "renaissance_ui" }
    )
);
