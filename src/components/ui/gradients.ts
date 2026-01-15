// src/components/ui/gradients.ts

export type UiGradientName = "aurora" | "ember" | "cosmic" | "mythic" | "royal" | "mono" | "theme";

export type UiGradientStop = {
    /** CSS color (rgba(...) / hsl(...) / etc.) */
    color: string;
    /** CSS size: "900px 380px" */
    size: string;
    /** CSS position: "15% 20%" */
    at: string;
    /** CSS transparent stop: "60%" */
    fadeAt: string;
};

export type UiGradient = {
    /** key used in components (ex: "aurora") */
    key: UiGradientName;
    /** label for UI (panels, selects, docs) */
    label: string;

    description: string;

    /**
     * list of radial layers composing the glow
     * (1 layer for mono, 2 layers for others)
     */
    layers: UiGradientStop[];

    /**
     * full CSS background string (comma-separated radial-gradient(...))
     * ready to be used in style={{ background }}
     */
    background: string;

    /**
     * helpful tags for filters / docs / theming
     * ex: ["cool", "cyan", "purple"]
     */
    tags?: string[];
};

function radial({ size, at, color, fadeAt }: UiGradientStop) {
    return `radial-gradient(${size} at ${at}, ${color}, transparent ${fadeAt})`;
}

export const GRADIENTS: UiGradient[] = [
    {
        key: "aurora",
        label: "Aurora",
        description:
            "Ambiance fraîche et lumineuse mêlant cyan et violet, idéale pour suggérer l’énergie, le mouvement et une interface vivante.",
        layers: [
            { size: "900px 380px", at: "15% 20%", color: "rgba(34,211,238,0.18)", fadeAt: "60%" },
            { size: "700px 360px", at: "85% 30%", color: "rgba(217,70,239,0.16)", fadeAt: "55%" },
        ],
        background: [
            radial({
                size: "900px 380px",
                at: "15% 20%",
                color: "rgba(34,211,238,0.18)",
                fadeAt: "60%",
            }),
            radial({
                size: "700px 360px",
                at: "85% 30%",
                color: "rgba(217,70,239,0.16)",
                fadeAt: "55%",
            }),
        ].join(","),
        tags: ["cool", "cyan", "purple"],
    },
    {
        key: "ember",
        label: "Ember",
        description:
            "Dégradé chaud aux tons ambre et rouge, évoquant l’intensité, l’alerte ou l’action imminente.",
        layers: [
            { size: "900px 380px", at: "15% 20%", color: "rgba(251,191,36,0.20)", fadeAt: "60%" },
            { size: "700px 360px", at: "85% 30%", color: "rgba(244,63,94,0.18)", fadeAt: "55%" },
        ],
        background: [
            radial({
                size: "900px 380px",
                at: "15% 20%",
                color: "rgba(251,191,36,0.20)",
                fadeAt: "60%",
            }),
            radial({
                size: "700px 360px",
                at: "85% 30%",
                color: "rgba(244,63,94,0.18)",
                fadeAt: "55%",
            }),
        ].join(","),
        tags: ["warm", "amber", "rose"],
    },
    {
        key: "cosmic",
        label: "Cosmic",
        description:
            "Palette profonde et contrastée inspirée du ciel nocturne, parfaite pour des sections à forte identité ou un univers contemplatif.",
        layers: [
            { size: "900px 380px", at: "20% 15%", color: "rgba(99,102,241,0.22)", fadeAt: "60%" },
            { size: "700px 360px", at: "80% 35%", color: "rgba(217,70,239,0.18)", fadeAt: "55%" },
        ],
        background: [
            radial({
                size: "900px 380px",
                at: "20% 15%",
                color: "rgba(99,102,241,0.22)",
                fadeAt: "60%",
            }),
            radial({
                size: "700px 360px",
                at: "80% 35%",
                color: "rgba(217,70,239,0.18)",
                fadeAt: "55%",
            }),
        ].join(","),
        tags: ["indigo", "purple", "space"],
    },
    {
        key: "mythic",
        label: "Mythic",
        description:
            "Alliance de verts et de bleus apportant une sensation de renouveau, de stabilité et de progression naturelle.",
        layers: [
            { size: "900px 380px", at: "15% 20%", color: "rgba(52,211,153,0.22)", fadeAt: "60%" },
            { size: "700px 360px", at: "85% 30%", color: "rgba(14,165,233,0.18)", fadeAt: "55%" },
        ],
        background: [
            radial({
                size: "900px 380px",
                at: "15% 20%",
                color: "rgba(52,211,153,0.22)",
                fadeAt: "60%",
            }),
            radial({
                size: "700px 360px",
                at: "85% 30%",
                color: "rgba(14,165,233,0.18)",
                fadeAt: "55%",
            }),
        ].join(","),
        tags: ["green", "blue", "fresh"],
    },
    {
        key: "royal",
        label: "Royal",
        description:
            "Tons riches et élégants entre violet et rose, adaptés aux éléments premium, symboliques ou à forte valeur.",
        layers: [
            { size: "900px 380px", at: "15% 20%", color: "rgba(139,92,246,0.22)", fadeAt: "60%" },
            { size: "700px 360px", at: "85% 30%", color: "rgba(236,72,153,0.18)", fadeAt: "55%" },
        ],
        background: [
            radial({
                size: "900px 380px",
                at: "15% 20%",
                color: "rgba(139,92,246,0.22)",
                fadeAt: "60%",
            }),
            radial({
                size: "700px 360px",
                at: "85% 30%",
                color: "rgba(236,72,153,0.18)",
                fadeAt: "55%",
            }),
        ].join(","),
        tags: ["violet", "pink", "lux"],
    },
    {
        key: "mono",
        label: "Mono",
        description:
            "Dégradé neutre et discret en blanc, pensé pour rester sobre et mettre le contenu au premier plan.",
        layers: [
            { size: "900px 380px", at: "50% 20%", color: "rgba(255,255,255,0.10)", fadeAt: "60%" },
        ],
        background: radial({
            size: "900px 380px",
            at: "50% 20%",
            color: "rgba(255,255,255,0.10)",
            fadeAt: "60%",
        }),
        tags: ["neutral", "white"],
    },
    {
        key: "theme",
        label: "Theme",
        description:
            "Gradient dynamique basé sur les variables d’accent du thème, garantissant une cohérence visuelle automatique avec le design global.",
        layers: [
            {
                size: "900px 380px",
                at: "15% 20%",
                color: "hsl(var(--accent) / 0.26)",
                fadeAt: "70%",
            },
            {
                size: "700px 360px",
                at: "85% 30%",
                color: "hsl(var(--accent-2) / 0.24)",
                fadeAt: "65%",
            },
        ],
        background: [
            radial({
                size: "900px 380px",
                at: "15% 20%",
                color: "hsl(var(--accent) / 0.26)",
                fadeAt: "70%",
            }),
            radial({
                size: "700px 360px",
                at: "85% 30%",
                color: "hsl(var(--accent-2) / 0.24)",
                fadeAt: "65%",
            }),
        ].join(","),
        tags: ["token", "accent"],
    },
];

/** Convenience: quick lookup by key */
export const GRADIENTS_BY_KEY = Object.fromEntries(GRADIENTS.map((g) => [g.key, g])) as Record<
    UiGradientName,
    UiGradient
>;

/** Convenience: list of keys */
export const GRADIENT_KEYS = GRADIENTS.map((g) => g.key) as UiGradientName[];
