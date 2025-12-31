import { useUiSettingsStore } from "@/stores/uiSettingsStore";

const LOGOS_BY_THEME = {
    classic: "/assets/images/logos/logo_renaissance_classic.png",
    "cyber-ritual": "/assets/images/logos/logo_renaissance_cyber_ritual.png",
    "forest-sigil": "/assets/images/logos/logo_renaissance_forest_sigil.png",
    "ashen-codex": "/assets/images/logos/logo_renaissance_ashen_codex.png",
    "winter-noel": "/assets/images/logos/logo_renaissance_winter_noel.png",
    "aube-ardente": "/assets/images/logos/logo_renaissance_aube_ardente.png",
} as const;

/**
 * Hook helper: retourne le bon logo selon le thème actif.
 */
export function useThemeLogo(): string {
    const theme = useUiSettingsStore((s) => s.theme);
    return LOGOS_BY_THEME[theme] ?? LOGOS_BY_THEME.classic;
}
