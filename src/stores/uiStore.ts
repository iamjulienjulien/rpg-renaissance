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
    | "questCreate"
    | "questPhotoUpload"
    // extensible
    | (string & {});

/**
 * 🧳 Contexte générique de modal
 * Chaque modal peut typer son contexte côté appelant via generics TS (au besoin).
 */
export type UiModalContext = Record<string, any> | null;

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
    - modalContext: payload/context associé à une modal (ex: mode chain)
    ------------------------------------------------------------------------ */
    modalState: Record<string, boolean>;
    modalStack: UiModalId[];
    modalContext: Record<string, UiModalContext>;

    openModal: (id: UiModalId, context?: UiModalContext) => void;
    closeModal: (id: UiModalId) => void;
    toggleModal: (id: UiModalId, context?: UiModalContext) => void;

    setModalContext: (id: UiModalId, context: UiModalContext) => void;
    getModalContext: <T = UiModalContext>(id: UiModalId) => T | null;
    clearModalContext: (id: UiModalId) => void;

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
            modalContext: {},

            setModalContext: (id, context) =>
                set((s) => ({
                    modalContext: {
                        ...s.modalContext,
                        [String(id)]: context ?? null,
                    },
                })),

            getModalContext: (id) => {
                const v = get().modalContext[String(id)];
                return (v ?? null) as any;
            },

            clearModalContext: (id) =>
                set((s) => {
                    const key = String(id);
                    if (!(key in s.modalContext)) return s;

                    const next = { ...s.modalContext };
                    delete next[key];

                    return { modalContext: next };
                }),

            openModal: (id, context) =>
                set((s) => {
                    const key = String(id);

                    // ✅ on met/écrase le contexte si fourni (même si déjà open)
                    const nextContext =
                        typeof context === "undefined"
                            ? s.modalContext
                            : { ...s.modalContext, [key]: context ?? null };

                    // déjà ouverte -> pas de push stack, mais maj context possible
                    if (s.modalState[key]) {
                        return { ...s, modalContext: nextContext };
                    }

                    return {
                        modalState: { ...s.modalState, [key]: true },
                        modalStack: [...s.modalStack, id],
                        modalContext: nextContext,
                    };
                }),

            closeModal: (id) =>
                set((s) => {
                    const key = String(id);
                    if (!s.modalState[key]) return s;

                    const nextState = { ...s.modalState };
                    delete nextState[key];

                    // ✅ on nettoie le contexte à la fermeture
                    const nextContext = { ...s.modalContext };
                    delete nextContext[key];

                    return {
                        modalState: nextState,
                        modalStack: s.modalStack.filter((x) => x !== id),
                        modalContext: nextContext,
                    };
                }),

            toggleModal: (id, context) => {
                const open = get().isModalOpen(id);
                if (open) get().closeModal(id);
                else get().openModal(id, context);
            },

            isModalOpen: (id) => !!get().modalState[String(id)],
            anyModalOpen: () => get().modalStack.length > 0,

            closeTopModal: () => {
                const stack = get().modalStack;
                const top = stack[stack.length - 1];
                if (top) get().closeModal(top);
            },

            closeAllModals: () => set({ modalState: {}, modalStack: [], modalContext: {} }),
        }),
        {
            name: "renaissance_ui",
            // ✅ optionnel mais recommandé: ne pas persister les modals/context (éphémère)
            // partialize: (s) => ({
            //     devMode: s.devMode,
            //     reduceAnimations: s.reduceAnimations,
            // }),
        }
    )
);
