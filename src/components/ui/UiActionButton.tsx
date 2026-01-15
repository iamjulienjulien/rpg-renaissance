"use client";

import React from "react";
import { useUiAction, type UiAction } from "@/components/RpgUi";
import { cn } from "@/lib/utills";

export type UiActionButtonProps = {
    children: React.ReactNode;
    onClick?: () => void;

    variant?: "soft" | "solid" | "master" | "magic" | "danger" | "ghost";
    disabled?: boolean;
    active?: boolean; // ✅ NEW
    className?: string;

    action?: UiAction;
    hint?: string;

    fullWidth?: boolean;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
};

export const UiActionButtonPropsTable = [
    {
        name: "children",
        type: "React.ReactNode",
        required: true,
        description: "Contenu du bouton (texte, icône ou composition libre).",
        default: "—",
    },
    {
        name: "onClick",
        type: "() => void",
        required: false,
        description: "Callback déclenché lors du clic sur le bouton.",
        default: "undefined",
    },
    {
        name: "variant",
        type: `"soft" | "solid" | "master" | "magic" | "danger" | "ghost"`,
        required: false,
        description:
            "Style visuel du bouton. Influence les couleurs, le contraste et le ressenti (primaire, magique, destructif, etc.).",
        default: `"soft"`,
    },
    {
        name: "disabled",
        type: "boolean",
        required: false,
        description: "Désactive le bouton et empêche toute interaction utilisateur.",
        default: "false",
    },
    {
        name: "active",
        type: "boolean",
        required: false,
        description: "Force l’état actif du bouton (utile pour les toggles ou états persistants).",
        default: "false",
    },
    {
        name: "className",
        type: "string",
        required: false,
        description: "Classes CSS supplémentaires pour personnaliser ou surcharger le style.",
        default: "undefined",
    },
    {
        name: "action",
        type: "UiAction",
        required: false,
        description: "Action métier associée au bouton (pattern action / intent du jeu).",
        default: "undefined",
    },
    {
        name: "hint",
        type: "string",
        required: false,
        description: "Texte d’aide ou de contexte affiché au survol ou à proximité du bouton.",
        default: "undefined",
    },
    {
        name: "fullWidth",
        type: "boolean",
        required: false,
        description: "Si activé, le bouton occupe toute la largeur disponible de son conteneur.",
        default: "false",
    },
    {
        name: "size",
        type: `"xs" | "sm" | "md" | "lg" | "xl"`,
        required: false,
        description: "Taille du bouton. Affecte la hauteur, le padding et la taille du texte.",
        default: `"md"`,
    },
];

const SIZE: Record<NonNullable<UiActionButtonProps["size"]>, string> = {
    xs: "text-xs px-3 py-1.5 rounded-xl",
    sm: "text-sm px-3.5 py-2 rounded-2xl",
    md: "rpg-text-sm px-4 py-2 rounded-2xl",
    lg: "text-base px-5 py-2.5 rounded-2xl",
    xl: "text-base px-6 py-3 rounded-3xl",
};

function HintPill({ variant, hint }: { variant: UiActionButtonProps["variant"]; hint: string }) {
    const base = "rounded-full px-2 py-0.5 text-[11px] ring-1 whitespace-nowrap";

    if (variant === "master") {
        return (
            <span
                className={cn(
                    base,
                    "bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--text))] ring-[hsl(var(--accent)/0.25)]"
                )}
            >
                {hint}
            </span>
        );
    }

    if (variant === "magic") {
        return <span className={cn(base, "bg-white/10 text-white/85 ring-white/15")}>{hint}</span>;
    }

    if (variant === "danger") {
        return (
            <span className={cn(base, "bg-red-500/15 text-red-100 ring-red-400/25")}>{hint}</span>
        );
    }

    return (
        <span
            className={cn(
                base,
                "bg-[hsl(var(--bg)/0.35)] text-[hsl(var(--muted))] ring-[hsl(var(--border))]"
            )}
        >
            {hint}
        </span>
    );
}

export function UiActionButton(props: UiActionButtonProps) {
    const disabled = !!props.disabled;
    const active = !!props.active && !disabled; // ✅
    const variant = props.variant ?? "soft";
    const size = props.size ?? "md";

    const storeAction = useUiAction(props.action);
    const onClick = props.onClick ?? storeAction;

    const fullWidth = !!props.fullWidth;
    const sizeCls = SIZE[size];

    /* =========================
       MASTER
    ========================= */
    if (variant === "master") {
        return (
            <button
                type="button"
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                aria-pressed={active}
                className={cn(
                    props.className,
                    fullWidth && "w-full",
                    "p-[1.5px]",
                    "bg-[linear-gradient(135deg,hsl(var(--accent)),hsl(var(--accent-2)))]",
                    "transition hover:brightness-110 active:brightness-95",
                    active && "brightness-110",
                    size === "xs"
                        ? "rounded-[14px]"
                        : size === "xl"
                          ? "rounded-[28px]"
                          : "rounded-[22px]",
                    disabled && "opacity-60 pointer-events-none"
                )}
            >
                <span
                    className={cn(
                        "inline-flex w-full items-center gap-2",
                        size === "xs"
                            ? "rounded-xl"
                            : size === "xl"
                              ? "rounded-[26px]"
                              : "rounded-[20px]",
                        sizeCls,
                        "font-semibold",
                        "bg-[hsl(var(--bg)/0.75)] backdrop-blur",
                        "text-[hsl(var(--text))] ring-1",
                        active ? "ring-[hsl(var(--accent))]" : "ring-[hsl(var(--ring))]"
                    )}
                >
                    <span className={cn(fullWidth ? "mx-auto" : "flex-1")}>{props.children}</span>
                    {props.hint && <HintPill variant={variant} hint={props.hint} />}
                </span>
            </button>
        );
    }

    /* =========================
       MAGIC
    ========================= */
    if (variant === "magic") {
        return (
            <button
                type="button"
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                aria-pressed={active}
                className={cn(
                    props.className,
                    fullWidth && "w-full",
                    "p-[1.5px]",
                    "bg-linear-to-br from-cyan-400 via-fuchsia-500 to-emerald-400",
                    "transition hover:brightness-110",
                    active && "brightness-110",
                    size === "xs"
                        ? "rounded-[14px]"
                        : size === "xl"
                          ? "rounded-[28px]"
                          : "rounded-[22px]",
                    disabled && "opacity-60 pointer-events-none"
                )}
            >
                <span
                    className={cn(
                        "inline-flex w-full items-center gap-2",
                        size === "xs"
                            ? "rounded-xl"
                            : size === "xl"
                              ? "rounded-[26px]"
                              : "rounded-[20px]",
                        sizeCls,
                        "font-semibold bg-black/85 backdrop-blur ring-1",
                        active ? "ring-white/40" : "ring-white/10"
                    )}
                >
                    <span className={cn(fullWidth ? "mx-auto" : "flex-1")}>{props.children}</span>
                    {props.hint && <HintPill variant={variant} hint={props.hint} />}
                </span>
            </button>
        );
    }

    /* =========================
       DANGER
    ========================= */
    if (variant === "danger") {
        return (
            <button
                type="button"
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                aria-pressed={active}
                className={cn(
                    props.className,
                    fullWidth && "w-full",
                    "inline-flex items-center gap-2 ring-1 transition",
                    sizeCls,
                    active ? "bg-red-500/25 ring-red-400/40" : "bg-red-500/15 ring-red-400/25",
                    "text-red-50",
                    disabled && "opacity-60 pointer-events-none"
                )}
            >
                <span className={cn(fullWidth ? "mx-auto" : "flex-1")}>{props.children}</span>
                {props.hint && <HintPill variant={variant} hint={props.hint} />}
            </button>
        );
    }

    /* =========================
       GHOST
    ========================= */
    if (variant === "ghost") {
        return (
            <button
                type="button"
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                aria-pressed={active}
                className={cn(
                    props.className,
                    fullWidth && "w-full",
                    "inline-flex items-center gap-2 transition",
                    sizeCls,
                    active
                        ? "bg-[hsl(var(--panel-2)/0.45)]"
                        : "bg-transparent hover:bg-[hsl(var(--panel-2)/0.35)]",
                    "text-[hsl(var(--text))]",
                    disabled && "opacity-60 pointer-events-none"
                )}
            >
                <span className={cn(fullWidth ? "mx-auto" : "flex-1")}>{props.children}</span>
                {props.hint && <HintPill variant={variant} hint={props.hint} />}
            </button>
        );
    }

    /* =========================
       SOFT / SOLID
    ========================= */
    const isSolid = variant === "solid";

    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            aria-pressed={active}
            className={cn(
                props.className,
                fullWidth && "w-full",
                "inline-flex items-center gap-2 ring-1 transition cursor-pointer",
                sizeCls,
                isSolid
                    ? active
                        ? "bg-[hsl(var(--accent)/0.2)] ring-[hsl(var(--accent)/0.4)]"
                        : "bg-[hsl(var(--accent)/0.12)] ring-[hsl(var(--accent)/0.25)]"
                    : active
                      ? "bg-[hsl(var(--panel-2-active))]  ring-[hsl(var(--ring))]"
                      : "bg-[hsl(var(--panel-2))]  hover:bg-[hsl(var(--panel-2-hover))] ring-[hsl(var(--ring))]",
                "text-[hsl(var(--text))]",
                disabled && "opacity-60 pointer-events-none"
            )}
        >
            <span className={cn(fullWidth ? "mx-auto" : "flex-1")}>{props.children}</span>
            {props.hint && <HintPill variant={variant} hint={props.hint} />}
        </button>
    );
}

export default UiActionButton;
