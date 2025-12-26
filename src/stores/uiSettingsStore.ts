import { create } from "zustand";

export type UiTheme = "classic" | "cyber-ritual" | "forest-sigil" | "ashen-codex" | "winter-noel";

type UiSettingsState = {
    theme: UiTheme;
    setTheme: (theme: UiTheme) => void;
    hydrate: () => void;
};

const LS_KEY = "rpg_ui_theme";

function applyTheme(theme: UiTheme) {
    if (typeof document === "undefined") return;

    if (theme === "classic") {
        document.documentElement.removeAttribute("data-theme");
        return;
    }
    document.documentElement.setAttribute("data-theme", theme);
}

export const useUiSettingsStore = create<UiSettingsState>((set, get) => ({
    theme: "classic",

    setTheme: (theme) => {
        set({ theme });
        try {
            localStorage.setItem(LS_KEY, theme);
        } catch {}
        applyTheme(theme);
    },

    hydrate: () => {
        try {
            const saved = (localStorage.getItem(LS_KEY) as UiTheme | null) ?? "classic";
            set({ theme: saved });
            applyTheme(saved);
        } catch {
            applyTheme(get().theme);
        }
    },
}));
