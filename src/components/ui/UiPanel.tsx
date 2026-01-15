// src/components/ui/UiPanel.tsx
"use client";

import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiPanelProps = {
    title?: string;
    subtitle?: string;
    emoji?: string;
    right?: React.ReactNode;
    children: React.ReactNode;

    variant?: "default" | "soft" | "ghost" | "theme";
    tone?: "theme" | "neutral";
    padded?: boolean;
    className?: string;

    /** Accordion */
    collapsible?: boolean;
    defaultOpen?: boolean;
    onToggle?: (open: boolean) => void;

    /** Footer */
    footer?: React.ReactNode;
};

export const UiPanelPropsTable = [
    {
        name: "children",
        type: "React.ReactNode",
        description: "Contenu principal affiché à l’intérieur du panel.",
        default: "—",
        required: true,
    },
    {
        name: "title",
        type: "string",
        description: "Titre du panel, affiché en en-tête (en capitales).",
        default: "—",
        required: false,
    },
    {
        name: "subtitle",
        type: "string",
        description: "Sous-titre affiché sous le titre principal.",
        default: "—",
        required: false,
    },
    {
        name: "emoji",
        type: "string",
        description: "Emoji affiché avant le titre du panel.",
        default: "—",
        required: false,
    },
    {
        name: "right",
        type: "React.ReactNode",
        description: "Contenu affiché à droite du header (actions, badges, boutons…).",
        default: "—",
        required: false,
    },
    {
        name: "variant",
        type: '"default" | "soft" | "ghost" | "theme"',
        description: "Variant visuel du panel (fond, ring et intensité du glow).",
        default: '"default"',
        required: false,
    },
    {
        name: "tone",
        type: '"theme" | "neutral"',
        description: "Ton général du panel (actuellement réservé pour extensions futures).",
        default: '"theme"',
        required: false,
    },
    {
        name: "padded",
        type: "boolean",
        description: "Ajoute un padding interne standard autour du contenu du panel.",
        default: "true",
        required: false,
    },
    {
        name: "className",
        type: "string",
        description: "Classes CSS supplémentaires appliquées au conteneur principal.",
        default: "—",
        required: false,
    },
    {
        name: "collapsible",
        type: "boolean",
        description: "Si true, le panel devient repliable (mode accordion).",
        default: "false",
        required: false,
    },
    {
        name: "defaultOpen",
        type: "boolean",
        description: "État initial du panel si collapsible (ouvert ou fermé).",
        default: "true",
        required: false,
    },
    {
        name: "onToggle",
        type: "(open: boolean) => void",
        description: "Callback déclenché lors de l’ouverture ou fermeture du panel.",
        default: "—",
        required: false,
    },
    {
        name: "footer",
        type: "React.ReactNode",
        description: "Contenu affiché en bas du panel, séparé par une bordure (footer).",
        default: "—",
        required: false,
    },
];

export function UiPanel({
    title,
    subtitle,
    emoji,
    right,
    children,

    variant = "default",
    tone = "theme",
    padded = true,
    className,

    collapsible = false,
    defaultOpen = true,
    onToggle,

    footer,
}: UiPanelProps) {
    const [open, setOpen] = React.useState(defaultOpen);

    const toggle = () => {
        if (!collapsible) return;
        setOpen((v) => {
            const next = !v;
            onToggle?.(next);
            return next;
        });
    };

    const baseStyle =
        variant === "ghost"
            ? "bg-transparent ring-white/10"
            : variant === "soft"
              ? "bg-[hsl(var(--panel)/0.55)] ring-[hsl(var(--ring)/0.6)]"
              : variant === "theme"
                ? "bg-[hsl(var(--panel)/0.45)] ring-[hsl(var(--accent)/0.3)]"
                : "bg-[hsl(var(--panel)/0.75)] ring-[hsl(var(--ring))]";

    const glowStyle =
        variant === "ghost"
            ? ""
            : "shadow-[0_0_0_1px_hsl(var(--border)),0_10px_30px_hsl(var(--shadow)),0_0_24px_hsl(var(--glow)/0.08)]";

    return (
        <div
            className={cn(
                "rounded-2xl ring-1 backdrop-blur-md",
                baseStyle,
                glowStyle,
                padded && "p-5",
                collapsible && !open ? "cursor-pointer select-none" : "",
                className
            )}
            onClick={collapsible && !open ? toggle : undefined}
            role={collapsible && !open ? "button" : undefined}
        >
            {/* HEADER */}
            {(title || right) && (
                <div
                    className={cn(
                        "flex items-start justify-between gap-3",
                        collapsible && open ? "cursor-pointer select-none" : ""
                    )}
                    onClick={collapsible && open ? toggle : undefined}
                    role={collapsible && open ? "button" : undefined}
                    aria-expanded={collapsible ? open : undefined}
                >
                    <div>
                        {title && (
                            <div
                                className={cn(
                                    "text-[11px] tracking-[0.22em]",
                                    "text-[hsl(var(--muted))]",
                                    "drop-shadow-[0_0_10px_hsl(var(--glow)/0.10)]"
                                )}
                            >
                                {emoji ? `${emoji} ` : ""}
                                {title.toUpperCase()}
                                {collapsible && (
                                    <span className="ml-2 opacity-60">{open ? "▾" : "▸"}</span>
                                )}
                            </div>
                        )}

                        {subtitle && (
                            <div className="mt-1 text-sm text-[hsl(var(--muted))] opacity-70">
                                {subtitle}
                            </div>
                        )}
                    </div>

                    {right && <div className="shrink-0">{right}</div>}
                </div>
            )}

            {/* BODY */}
            <div
                className={cn(
                    collapsible && !open ? "" : title ? (subtitle ? "mt-4" : "mt-2") : "",
                    collapsible && "transition-[grid-template-rows,opacity] duration-200 ease-out",
                    collapsible &&
                        (open
                            ? "grid grid-rows-[1fr] opacity-100"
                            : "grid grid-rows-[0fr] opacity-0")
                )}
            >
                <div className={collapsible ? "overflow-hidden px-1" : undefined}>
                    {(!collapsible || open) && children}
                </div>
            </div>

            {/* FOOTER */}
            {footer && (!collapsible || open) && (
                <div className="mt-4 pt-4 border-t border-white/10">{footer}</div>
            )}
        </div>
    );
}
