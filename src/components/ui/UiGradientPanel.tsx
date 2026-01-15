// src/components/ui/UiGradientPanel.tsx
"use client";

import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🎨 GRADIENTS
============================================================================ */

export type UiGradientPanelGradient =
    | "aurora"
    | "ember"
    | "cosmic"
    | "mythic"
    | "royal"
    | "mono"
    | "theme"
    | "custom";

const GRADIENTS: Record<Exclude<UiGradientPanelGradient, "custom">, string> = {
    aurora:
        "radial-gradient(900px 380px at 15% 20%, rgba(34,211,238,0.18), transparent 60%)," +
        "radial-gradient(700px 360px at 85% 30%, rgba(217,70,239,0.16), transparent 55%)",

    ember:
        "radial-gradient(900px 380px at 15% 20%, rgba(251,191,36,0.20), transparent 60%)," +
        "radial-gradient(700px 360px at 85% 30%, rgba(244,63,94,0.18), transparent 55%)",

    cosmic:
        "radial-gradient(900px 380px at 20% 15%, rgba(99,102,241,0.22), transparent 60%)," +
        "radial-gradient(700px 360px at 80% 35%, rgba(217,70,239,0.18), transparent 55%)",

    mythic:
        "radial-gradient(900px 380px at 15% 20%, rgba(52,211,153,0.22), transparent 60%)," +
        "radial-gradient(700px 360px at 85% 30%, rgba(14,165,233,0.18), transparent 55%)",

    royal:
        "radial-gradient(900px 380px at 15% 20%, rgba(139,92,246,0.22), transparent 60%)," +
        "radial-gradient(700px 360px at 85% 30%, rgba(236,72,153,0.18), transparent 55%)",

    mono: "radial-gradient(900px 380px at 50% 20%, rgba(255,255,255,0.10), transparent 60%)",

    theme:
        "radial-gradient(900px 380px at 15% 20%, hsl(var(--accent) / 0.26), transparent 70%)," +
        "radial-gradient(700px 360px at 85% 30%, hsl(var(--accent-2) / 0.24), transparent 65%)",
};

export const UiGradientPanelPropsTable = [
    {
        name: "children",
        type: "React.ReactNode",
        description: "Contenu principal affiché à l’intérieur du panel.",
        default: "—",
        required: true,
    },
    {
        name: "as",
        type: "React.ElementType",
        description:
            "Élément HTML ou composant React utilisé comme wrapper racine (ex: div, section, article…).",
        default: '"div"',
        required: false,
    },
    {
        name: "eyebrow",
        type: "string",
        description:
            "Petit texte affiché au-dessus du contenu principal, souvent utilisé comme label ou contexte.",
        default: "—",
        required: false,
    },
    {
        name: "gradient",
        type: '"aurora" | "ember" | "cosmic" | "mythic" | "royal" | "mono" | "theme" | "custom"',
        description: "Définit le style de gradient lumineux affiché en arrière-plan du panel.",
        default: '"aurora"',
        required: false,
    },
    {
        name: "glow",
        type: "boolean",
        description:
            "Active ou désactive l’effet de glow (lumière diffuse) au-dessus du fond du panel.",
        default: "true",
        required: false,
    },
    {
        name: "glowOpacity",
        type: "number",
        description: "Contrôle l’opacité du glow (valeur entre 0 et 1 recommandée).",
        default: "0.6",
        required: false,
    },
    {
        name: "glowStyle",
        type: "string",
        description: 'CSS background personnalisé utilisé uniquement si gradient="custom".',
        default: "—",
        required: false,
    },
    {
        name: "className",
        type: "string",
        description: "Classes CSS supplémentaires appliquées au conteneur externe du panel.",
        default: "—",
        required: false,
    },
    {
        name: "innerClassName",
        type: "string",
        description:
            "Classes CSS supplémentaires appliquées au conteneur interne (autour des children).",
        default: "—",
        required: false,
    },
    {
        name: "backgroundClassName",
        type: "string",
        description: "Override des classes CSS de fond du panel (par défaut: bg-black/20).",
        default: '"bg-black/20"',
        required: false,
    },
    {
        name: "ringClassName",
        type: "string",
        description: "Override des classes CSS de la bordure (ring) du panel.",
        default: '"ring-white/10"',
        required: false,
    },
];

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UiGradientPanelProps<T extends React.ElementType = "div"> = {
    as?: T;

    /** Eyebrow (petit texte au-dessus du contenu) */
    eyebrow?: string;

    /** Contenu */
    children: React.ReactNode;

    /** Layout */
    className?: string;
    innerClassName?: string;

    /** Style */
    gradient?: UiGradientPanelGradient;
    glow?: boolean;
    glowOpacity?: number;
    glowStyle?: string; // utilisé si gradient="custom"

    backgroundClassName?: string;
    ringClassName?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/* ============================================================================
🧩 COMPONENT
============================================================================ */

export function UiGradientPanel<T extends React.ElementType = "div">(
    props: UiGradientPanelProps<T>
) {
    const {
        as,
        eyebrow,
        children,

        className,
        innerClassName,

        gradient = "aurora",
        glow = true,
        glowOpacity = 0.6,
        glowStyle,

        backgroundClassName,
        ringClassName,

        ...rest
    } = props;

    const Comp = (as ?? "div") as React.ElementType;

    const resolvedGlow =
        gradient === "custom" ? (glowStyle ?? GRADIENTS.aurora) : GRADIENTS[gradient];

    return (
        <Comp
            className={cn(
                "relative overflow-hidden rounded-[22px]",
                backgroundClassName ?? "bg-black/20",
                "ring-1",
                ringClassName ?? "ring-white/10",
                className
            )}
            {...rest}
        >
            {glow ? (
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        opacity: glowOpacity,
                        background: resolvedGlow,
                    }}
                />
            ) : null}

            <div className={cn("relative px-5 py-4")}>
                {eyebrow ? (
                    <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/45">
                        {eyebrow}
                    </div>
                ) : null}
                <div className={innerClassName}>{children}</div>
            </div>
        </Comp>
    );
}
