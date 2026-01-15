"use client";

import * as React from "react";
import UiTooltip from "@/components/ui/UiTooltip";
import { useUiAction, type UiAction } from "@/stores/uiStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UiPillTone =
    | "theme"
    | "neutral"
    | "emerald"
    | "violet"
    | "amber"
    | "rose"
    | "sky"
    | "slate";

export type UiPillSize = "xs" | "sm" | "md";

export type UiPillProps = {
    children: React.ReactNode;

    /** Couleur visuelle */
    tone?: UiPillTone;

    /** Taille */
    size?: UiPillSize;

    /** Tooltip (utilise UiTooltip) */
    title?: string;

    /** Click direct */
    onClick?: () => void;

    /** Action UI globale (store) */
    action?: UiAction;

    /** Désactivé */
    disabled?: boolean;

    /** Forcer l’apparence cliquable (même sans action) */
    clickable?: boolean;

    /** Classes supplémentaires */
    className?: string;
};

export const UiPillPropsTable = [
    {
        name: "children",
        type: "React.ReactNode",
        description: "Contenu principal du pill (texte, icône, ou combinaison).",
        default: "—",
        required: true,
    },
    {
        name: "tone",
        type: '"theme" | "neutral" | "emerald" | "violet" | "amber" | "rose" | "sky" | "slate"',
        description: "Définit la couleur visuelle et l’ambiance du pill.",
        default: '"neutral"',
        required: false,
    },
    {
        name: "size",
        type: '"xs" | "sm" | "md"',
        description: "Contrôle la taille du pill (padding et taille du texte).",
        default: '"sm"',
        required: false,
    },
    {
        name: "title",
        type: "string",
        description: "Texte du tooltip affiché au survol (via UiTooltip).",
        default: "—",
        required: false,
    },
    {
        name: "onClick",
        type: "() => void",
        description: "Callback appelé lors du clic sur le pill.",
        default: "—",
        required: false,
    },
    {
        name: "action",
        type: "UiAction",
        description: "Action UI globale déclenchée via le uiStore.",
        default: "—",
        required: false,
    },
    {
        name: "disabled",
        type: "boolean",
        description: "Désactive le pill (non cliquable, opacité réduite).",
        default: "false",
        required: false,
    },
    {
        name: "clickable",
        type: "boolean",
        description: "Force l’apparence cliquable même sans action ou onClick.",
        default: "false",
        required: false,
    },
    {
        name: "className",
        type: "string",
        description: "Classes CSS supplémentaires pour personnalisation.",
        default: "—",
        required: false,
    },
];

/* ============================================================================
🎨 STYLES
============================================================================ */

const toneClasses: Record<UiPillTone, string> = {
    theme: "bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))] ring-[hsl(var(--accent)/0.35)]",

    neutral: "bg-white/5 text-white/70 ring-white/15",

    emerald: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/25",
    violet: "bg-violet-400/10 text-violet-200 ring-violet-400/25",
    amber: "bg-amber-400/10 text-amber-200 ring-amber-400/25",
    rose: "bg-rose-400/10 text-rose-200 ring-rose-400/25",
    sky: "bg-sky-400/10 text-sky-200 ring-sky-400/25",
    slate: "bg-slate-400/10 text-slate-200 ring-slate-400/25",
};

const sizeClasses: Record<UiPillSize, string> = {
    xs: "px-2 py-0.5 text-[10px]",
    sm: "px-3 py-1 text-xs",
    md: "px-3.5 py-1.5 text-sm",
};

/* ============================================================================
🧩 COMPONENT
============================================================================ */

export function UiPill({
    children,
    tone = "neutral",
    size = "sm",
    title,
    onClick,
    action,
    disabled,
    clickable,
    className,
}: UiPillProps) {
    const storeAction = useUiAction(action);
    const click = onClick ?? storeAction;

    const isClickable = !disabled && (clickable || !!click);

    const base = (
        <span
            role={isClickable ? "button" : undefined}
            onClick={isClickable ? click : undefined}
            className={cn(
                "inline-flex items-center rounded-full ring-1 transition",
                "select-none whitespace-nowrap",
                "shadow-[0_0_0_1px_hsl(var(--border)),0_6px_14px_hsl(var(--shadow))]",
                toneClasses[tone],
                sizeClasses[size],
                isClickable && "cursor-pointer hover:brightness-110",
                disabled && "opacity-40 cursor-not-allowed",
                className
            )}
        >
            {children}
        </span>
    );

    if (!title) return base;

    return (
        <UiTooltip content={title} side="top" singleLine>
            {base}
        </UiTooltip>
    );
}
