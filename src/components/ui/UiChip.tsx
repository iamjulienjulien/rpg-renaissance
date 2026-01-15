"use client";

import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiChipTone =
    | "theme"
    | "neutral"
    | "emerald"
    | "violet"
    | "amber"
    | "rose"
    | "sky"
    | "slate";

export type UiChipSize = "xs" | "sm" | "md";

export type UiChipProps = {
    children: React.ReactNode;

    /** Couleur visuelle */
    tone?: UiChipTone;

    /** Taille */
    size?: UiChipSize;

    /** Icône optionnelle (emoji ou icône JSX) */
    icon?: React.ReactNode;

    /** Chip cliquable */
    onClick?: () => void;

    /** Désactivé */
    disabled?: boolean;

    /** Classes supplémentaires */
    className?: string;
};

export const UiChipPropsTable = [
    {
        name: "children",
        type: "React.ReactNode",
        description: "Contenu principal du chip (texte, icône inline, ou combinaison).",
        default: "—",
        required: true,
    },
    {
        name: "tone",
        type: '"theme" | "neutral" | "emerald" | "violet" | "amber" | "rose" | "sky" | "slate"',
        description: "Définit la couleur visuelle et l’ambiance du chip.",
        default: '"neutral"',
        required: false,
    },
    {
        name: "size",
        type: '"xs" | "sm" | "md"',
        description: "Contrôle la taille du chip (padding et taille du texte).",
        default: '"sm"',
        required: false,
    },
    {
        name: "icon",
        type: "React.ReactNode",
        description: "Icône optionnelle affichée avant le contenu (emoji ou JSX).",
        default: "—",
        required: false,
    },
    {
        name: "onClick",
        type: "() => void",
        description: "Rend le chip cliquable et déclenche cette fonction au clic.",
        default: "—",
        required: false,
    },
    {
        name: "disabled",
        type: "boolean",
        description: "Désactive le chip (non cliquable, opacité réduite).",
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

const toneClasses: Record<UiChipTone, string> = {
    theme: "bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] ring-[hsl(var(--accent)/0.35)]",

    neutral: "bg-white/5 text-white/70 ring-white/15",

    emerald: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/25",
    violet: "bg-violet-400/10 text-violet-200 ring-violet-400/25",
    amber: "bg-amber-400/10 text-amber-200 ring-amber-400/25",
    rose: "bg-rose-400/10 text-rose-200 ring-rose-400/25",
    sky: "bg-sky-400/10 text-sky-200 ring-sky-400/25",
    slate: "bg-slate-400/10 text-slate-200 ring-slate-400/25",
};

const sizeClasses: Record<UiChipSize, string> = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
};

export function UiChip({
    children,
    tone = "neutral",
    size = "sm",
    icon,
    onClick,
    disabled,
    className,
}: UiChipProps) {
    const clickable = !!onClick && !disabled;

    return (
        <span
            role={clickable ? "button" : undefined}
            onClick={clickable ? onClick : undefined}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full ring-1 transition",
                "select-none whitespace-nowrap",
                toneClasses[tone],
                sizeClasses[size],
                clickable && "cursor-pointer hover:brightness-110",
                disabled && "opacity-40 cursor-not-allowed",
                className
            )}
        >
            {icon ? <span className="text-[1em] leading-none">{icon}</span> : null}
            <span>{children}</span>
        </span>
    );
}
