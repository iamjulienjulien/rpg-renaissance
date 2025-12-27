// src/stores/uiStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ============================================================================
🧠 UI STORE
- Preferences persistées (devMode, reduceAnimations…)
- États UI éphémères (command palette, modals…)
- Gestion centralisée des modals (pile + helpers)
============================================================================ */

export type UiModalId =
    | "chapterTransition"
    | "adventureConfig"
    | "chapterConfig"
    | "renownGain"
    // extensible
    | (string & {});

type UiStore = {
    /* ------------------------------------------------------------------------
    ⚙️ Preferences persistées
    ------------------------------------------------------------------------ */
    devMode: boolean;
    reduceAnimations: boolean;

    setDevMode: (value: boolean) => void;
    setReduceAnimations: (value: boolean) => void;
    toggleReduceAnimations: () => void;

    /* ------------------------------------------------------------------------
    ⌨️ Command palette (éphémère)
    ------------------------------------------------------------------------ */
    commandPaletteOpen: boolean;
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
    toggleCommandPalette: () => void;

    /* ------------------------------------------------------------------------
    🪟 Modals (éphémère)
    - modalState: map open/close par id
    - modalStack: pile des modals ouvertes (ESC/ordre)
    ------------------------------------------------------------------------ */
    modalState: Record<string, boolean>;
    modalStack: UiModalId[];

    openModal: (id: UiModalId) => void;
    closeModal: (id: UiModalId) => void;
    toggleModal: (id: UiModalId) => void;

    isModalOpen: (id: UiModalId) => boolean;
    anyModalOpen: () => boolean;

    closeTopModal: () => void;
    closeAllModals: () => void;
};

export const useUiStore = create(
    persist<UiStore>(
        (set, get) => ({
            /* =========================================================================
            ⚙️ Preferences persistées
            ========================================================================= */
            devMode: true,
            reduceAnimations: false,

            setDevMode: (value) => set({ devMode: value }),
            setReduceAnimations: (value) => set({ reduceAnimations: value }),
            toggleReduceAnimations: () => set((s) => ({ reduceAnimations: !s.reduceAnimations })),

            /* =========================================================================
            ⌨️ Command palette
            ========================================================================= */
            commandPaletteOpen: false,
            openCommandPalette: () => set({ commandPaletteOpen: true }),
            closeCommandPalette: () => set({ commandPaletteOpen: false }),
            toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

            /* =========================================================================
            🪟 Modals
            ========================================================================= */
            modalState: {},
            modalStack: [],

            openModal: (id) =>
                set((s) => {
                    const key = String(id);
                    if (s.modalState[key]) return s;

                    return {
                        modalState: { ...s.modalState, [key]: true },
                        modalStack: [...s.modalStack, id],
                    };
                }),

            closeModal: (id) =>
                set((s) => {
                    const key = String(id);
                    if (!s.modalState[key]) return s;

                    const nextState = { ...s.modalState };
                    delete nextState[key];

                    return {
                        modalState: nextState,
                        modalStack: s.modalStack.filter((x) => x !== id),
                    };
                }),

            toggleModal: (id) => {
                const open = get().isModalOpen(id);
                if (open) get().closeModal(id);
                else get().openModal(id);
            },

            isModalOpen: (id) => !!get().modalState[String(id)],
            anyModalOpen: () => get().modalStack.length > 0,

            closeTopModal: () => {
                const stack = get().modalStack;
                const top = stack[stack.length - 1];
                if (top) get().closeModal(top);
            },

            closeAllModals: () => set({ modalState: {}, modalStack: [] }),
        }),
        { name: "renaissance_ui" }
    )
);
