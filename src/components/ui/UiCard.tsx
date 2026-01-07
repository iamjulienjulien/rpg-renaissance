// src/components/ui/UiCard.tsx
"use client";

import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiCardVariant = "default" | "classic" | "soft" | "ghost";
export type UiCardTone = "theme" | "neutral";

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
    tone?: UiCardTone;

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
    "10": "bg-black/10",
    "15": "bg-black/15",
    "20": "bg-black/20",
    "25": "bg-black/25",
    "30": "bg-black/30",
    "40": "bg-black/40",
    "50": "bg-black/50",
};

export function UiCard({
    children,
    variant = "soft",
    tone = "theme",
    padded = true,
    blackBg = false,
    className,
    "data-testid": testId,
}: UiCardProps) {
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
    const toneStyle = tone === "neutral" ? "text-white/80" : "text-white/85"; // theme par défaut

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
                toneStyle,
                padded && "p-4",
                blackBg ? blackBgClass[blackBg] : null,
                className
            )}
        >
            {children}
        </div>
    );
}
