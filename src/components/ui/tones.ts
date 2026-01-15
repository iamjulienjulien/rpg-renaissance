/* ============================================================================
🎨 UI TONES
============================================================================ */

export type UiTone =
    | "theme"
    | "neutral"
    | "emerald"
    | "violet"
    | "amber"
    | "rose"
    | "sky"
    | "slate";

export type UiToneDefinition = {
    /** Identifiant logique du tone */
    key: UiTone;

    /** Nom lisible (docs / panels) */
    label: string;

    /** Description sémantique / usage recommandé */
    description: string;

    /** Classes CSS principales (bg / text / ring) */
    classes: string;

    background: string;
};

export const TONES: UiToneDefinition[] = [
    {
        key: "theme",
        label: "Theme",
        description:
            "Couleur principale dérivée du thème actif. À utiliser pour les éléments clés et cohérents avec l’identité globale.",
        classes:
            "bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] ring-[hsl(var(--accent)/0.35)]",
        background: "bg-[hsl(var(--accent)/0.12)]",
    },
    {
        key: "neutral",
        label: "Neutral",
        description:
            "Ton neutre et discret, idéal pour les labels secondaires, métadonnées ou éléments non prioritaires.",
        classes: "bg-white/5 text-white/70 ring-white/15",
        background: "bg-white/5",
    },
    {
        key: "emerald",
        label: "Emerald",
        description:
            "Exprime la réussite, la validation ou un état positif. Recommandé pour les statuts de succès.",
        classes: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/25",
        background: "bg-emerald-400/10",
    },
    {
        key: "violet",
        label: "Violet",
        description:
            "Ton créatif et premium, adapté aux concepts avancés, fonctionnalités spéciales ou mises en avant élégantes.",
        classes: "bg-violet-400/10 text-violet-200 ring-violet-400/25",
        background: "bg-violet-400/10",
    },
    {
        key: "amber",
        label: "Amber",
        description:
            "Couleur d’attention et de vigilance. À utiliser pour les avertissements légers ou informations importantes.",
        classes: "bg-amber-400/10 text-amber-200 ring-amber-400/25",
        background: "bg-amber-400/10",
    },
    {
        key: "rose",
        label: "Rose",
        description:
            "Associé aux erreurs, suppressions ou actions sensibles nécessitant une confirmation explicite.",
        classes: "bg-rose-400/10 text-rose-200 ring-rose-400/25",
        background: "bg-rose-400/10",
    },
    {
        key: "sky",
        label: "Sky",
        description:
            "Ton clair et informatif, adapté aux messages d’aide, indications contextuelles ou états informatifs.",
        classes: "bg-sky-400/10 text-sky-200 ring-sky-400/25",
        background: "bg-sky-400/10",
    },
    {
        key: "slate",
        label: "Slate",
        description:
            "Couleur sobre et technique, idéale pour les tags système, environnements dev ou informations neutres structurantes.",
        classes: "bg-slate-400/10 text-slate-200 ring-slate-400/25",
        background: "bg-[hsl(var(--accent)/0.12)]",
    },
];

/** Convenience: quick lookup by key */
export const TONES_BY_KEY = Object.fromEntries(TONES.map((g) => [g.key, g])) as Record<
    UiTone,
    UiToneDefinition
>;

/** Convenience: list of keys */
export const TONES_KEYS = TONES.map((g) => g.key) as UiTone[];
