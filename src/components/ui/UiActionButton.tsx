"use client";

import React from "react";
import { useUiAction, type UiAction } from "@/components/RpgUi";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UIActionButtonProps = {
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

const SIZE: Record<NonNullable<UIActionButtonProps["size"]>, string> = {
    xs: "text-xs px-3 py-1.5 rounded-xl",
    sm: "text-sm px-3.5 py-2 rounded-2xl",
    md: "rpg-text-sm px-4 py-2 rounded-2xl",
    lg: "text-base px-5 py-2.5 rounded-2xl",
    xl: "text-base px-6 py-3 rounded-3xl",
};

function HintPill({ variant, hint }: { variant: UIActionButtonProps["variant"]; hint: string }) {
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

export function UIActionButton(props: UIActionButtonProps) {
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
                            ? "rounded-[12px]"
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
                    "bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-emerald-400",
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
                            ? "rounded-[12px]"
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
                "inline-flex items-center gap-2 ring-1 transition",
                sizeCls,
                isSolid
                    ? active
                        ? "bg-[hsl(var(--accent)/0.2)] ring-[hsl(var(--accent)/0.4)]"
                        : "bg-[hsl(var(--accent)/0.12)] ring-[hsl(var(--accent)/0.25)]"
                    : active
                      ? "bg-[hsl(var(--panel-2)/0.95)] ring-[hsl(var(--accent)/0.35)]"
                      : "bg-[hsl(var(--panel-2)/0.35)] ring-[hsl(var(--ring))]",
                "text-[hsl(var(--text))]",
                disabled && "opacity-60 pointer-events-none"
            )}
        >
            <span className={cn(fullWidth ? "mx-auto" : "flex-1")}>{props.children}</span>
            {props.hint && <HintPill variant={variant} hint={props.hint} />}
        </button>
    );
}

export default UIActionButton;
