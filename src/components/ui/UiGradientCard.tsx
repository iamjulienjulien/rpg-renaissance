"use client";

import * as React from "react";
import {
    GRADIENTS,
    GRADIENTS_BY_KEY,
    type UiGradient,
    type UiGradientName,
} from "@/components/ui/gradients";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiGradientCardProps = {
    children: React.ReactNode;

    /** Variant visuel (identique à UiCard) */
    variant?: "default" | "classic" | "soft" | "ghost";

    /** Ton du texte */
    tone?: "theme" | "neutral";

    /** Gradient lumineux en arrière-plan */
    gradient?: UiGradientName;

    /** Active le glow */
    glow?: boolean;

    /** Opacité du glow */
    glowOpacity?: number;

    /** Handler click */
    onClick?: () => void;

    /** Padding interne */
    padded?: boolean;

    /** Background noir optionnel */
    blackBg?: false | "10" | "15" | "20" | "25" | "30" | "40" | "50";

    /** Classes supplémentaires */
    className?: string;

    /** Test id */
    "data-testid"?: string;
};

const blackBgClass: Record<Exclude<UiGradientCardProps["blackBg"], false | undefined>, string> = {
    "10": "bg-black/10",
    "15": "bg-black/15",
    "20": "bg-black/20",
    "25": "bg-black/25",
    "30": "bg-black/30",
    "40": "bg-black/40",
    "50": "bg-black/50",
};

export const UiGradientCardPropsTable = [
    {
        name: "children",
        type: "React.ReactNode",
        description: "Contenu principal affiché à l’intérieur de la carte.",
        default: "—",
        required: true,
    },
    {
        name: "variant",
        type: '"default" | "classic" | "soft" | "ghost"',
        description:
            "Variant visuel de la carte. Définit le fond, le ring et la profondeur globale.",
        default: '"soft"',
        required: false,
    },
    {
        name: "tone",
        type: '"theme" | "neutral"',
        description:
            "Ton général du texte à l’intérieur de la carte. Permet des ajustements subtils de contraste.",
        default: '"theme"',
        required: false,
    },
    {
        name: "gradient",
        type: '"aurora" | "ember" | "cosmic" | "mythic" | "royal" | "mono" | "theme"',
        description:
            "Gradient lumineux affiché en arrière-plan de la carte. Les valeurs sont centralisées dans gradients.ts.",
        default: '"aurora"',
        required: false,
    },
    {
        name: "glow",
        type: "boolean",
        description:
            "Active ou désactive l’effet de glow (lumière diffuse) au-dessus du fond de la carte.",
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
        name: "onClick",
        type: "() => void",
        description:
            "Rend la carte cliquable et déclenche cette fonction au clic (curseur interactif inclus).",
        default: "—",
        required: false,
    },
    {
        name: "padded",
        type: "boolean",
        description: "Ajoute un padding interne standard autour du contenu de la carte.",
        default: "true",
        required: false,
    },
    {
        name: "blackBg",
        type: 'false | "10" | "15" | "20" | "25" | "30" | "40" | "50"',
        description:
            "Ajoute un fond noir semi-transparent par-dessus le style de base, avec opacité configurable.",
        default: "false",
        required: false,
    },
    {
        name: "className",
        type: "string",
        description: "Classes CSS supplémentaires appliquées au conteneur principal de la carte.",
        default: "—",
        required: false,
    },
    {
        name: "data-testid",
        type: "string",
        description: "Identifiant de test (utilisé pour les tests automatisés).",
        default: "—",
        required: false,
    },
];

export function UiGradientCard({
    children,
    variant = "soft",
    tone = "theme",
    gradient = "aurora",
    glow = true,
    glowOpacity = 0.6,
    padded = true,
    blackBg = false,
    className,
    onClick,
    "data-testid": testId,
}: UiGradientCardProps) {
    const clickable = !!onClick;

    // === Base UiCard styles ==================================================
    const baseStyle = "ring-white/10";

    const toneStyle = "text-white/85";

    const glowShadow =
        variant === "ghost" || variant === "classic"
            ? ""
            : "shadow-[0_0_0_1px_hsl(var(--border)/0.65),0_10px_22px_hsl(var(--shadow)/0.55)]";

    // === Gradient ============================================================
    const resolvedGradient = GRADIENTS_BY_KEY[gradient];

    console.log("resolvedGradient", resolvedGradient);

    return (
        <div
            // data-testid={testId}
            onClick={clickable ? onClick : undefined}
            className={cn(
                "relative overflow-hidden rounded-2xl ring-1 backdrop-blur-md",
                baseStyle,
                glowShadow,
                toneStyle,
                padded && "p-4",
                blackBg ? blackBgClass[blackBg] : null,
                clickable && "cursor-pointer",
                className
            )}
            style={{
                opacity: glowOpacity,
                background: resolvedGradient.background,
            }}
        >
            {children}
        </div>
    );
}
