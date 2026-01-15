// src/components/ui/UiCard.tsx
"use client";

import * as React from "react";

import { UiTone, TONES_BY_KEY } from "./tones";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiCardVariant = "default" | "classic" | "soft" | "ghost";
// export type UiCardTone = "theme" | "neutral";

/**
 * UiCard = version simplifiée de UiPanel
 * - Pensée pour être contenue dans un UiPanel (ou ailleurs)
 * - Pas de header/title/subtitle/collapsible
 * - Conserve variant + tone
 * - Ajoute un background noir optionnel avec opacité configurable
 */
export type UiCardProps = {
    children: React.ReactNode;

    variant?: UiCardVariant;
    tone?: false | UiTone;

    onClick?: () => void;

    /** Padding interne */
    padded?: boolean;

    /** Background noir optionnel (par dessus le style de base) */
    blackBg?: false | "10" | "15" | "20" | "25" | "30" | "40" | "50";

    /** Classes supplémentaires */
    className?: string;

    /** Test id */
    "data-testid"?: string;
};

const blackBgClass: Record<Exclude<UiCardProps["blackBg"], false | undefined>, string> = {
    "10": "bg-black/10!",
    "15": "bg-black/15!",
    "20": "bg-black/20!",
    "25": "bg-black/25!",
    "30": "bg-black/30!",
    "40": "bg-black/40!",
    "50": "bg-black/50!",
};

export const UiCardPropsTable = [
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

export function UiCard({
    children,
    variant = "default",
    tone = false,
    padded = true,
    blackBg = false,
    className,
    onClick,
    "data-testid": testId,
}: UiCardProps) {
    const clickable = onClick ?? false;
    // Base proche de UiPanel, mais un poil plus discret
    const baseStyle =
        variant === "classic"
            ? "bg-black/30 ring-white/10"
            : variant === "ghost"
              ? "bg-transparent ring-white/10"
              : variant === "soft"
                ? "bg-[hsl(var(--panel)/0.45)] ring-[hsl(var(--ring)/0.55)]"
                : "bg-[hsl(var(--panel)/0.65)] ring-[hsl(var(--ring)/0.75)]";

    // Tone: léger réglage (utile si un jour tu veux élargir)
    console.log("tone", tone);
    const toneStyle = tone ? TONES_BY_KEY[tone].background : ""; // theme par défaut
    console.log(TONES_BY_KEY);

    // Un peu de profondeur, mais moins que UiPanel (pour nesting)
    const glowStyle =
        variant === "ghost" || variant === "classic"
            ? ""
            : "shadow-[0_0_0_1px_hsl(var(--border)/0.65),0_10px_22px_hsl(var(--shadow)/0.55)]";

    return (
        <div
            data-testid={testId}
            className={cn(
                "rounded-2xl ring-1 backdrop-blur-md",
                baseStyle,
                glowStyle,
                // toneStyle,
                padded && "p-4",
                blackBg ? blackBgClass[blackBg] : null,
                className,
                clickable && "cursor-pointer"
            )}
            onClick={clickable ? onClick : undefined}
        >
            {children}
        </div>
    );
}
