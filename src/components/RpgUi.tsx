// src/components/RpgUi.tsx
"use client";

import React from "react";
import { useUiStore } from "@/stores/uiStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧩 PANEL
============================================================================ */

export function Panel({
    title,
    subtitle,
    emoji,
    right,
    children,
}: {
    title?: string;
    subtitle?: string;
    emoji?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                "rounded-2xl p-5 ring-1",
                // ✅ Theme tokens
                "bg-[hsl(var(--panel)/0.75)] ring-[hsl(var(--ring))]",
                // ✅ Subtle depth + glow using --shadow/--glow
                "shadow-[0_0_0_1px_hsl(var(--border)),0_10px_30px_hsl(var(--shadow)),0_0_24px_hsl(var(--glow)/0.08)]",
                "backdrop-blur-md"
            )}
        >
            {title ? (
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div
                            className={cn(
                                "text-[11px] tracking-[0.22em]",
                                "text-[hsl(var(--muted))]",
                                "drop-shadow-[0_0_10px_hsl(var(--glow)/0.10)]"
                            )}
                        >
                            {emoji ? `${emoji} ` : ""}
                            {title.toUpperCase()}
                        </div>

                        {subtitle ? (
                            <div className="mt-2 rpg-text-sm text-[hsl(var(--muted))]">
                                {subtitle}
                            </div>
                        ) : null}
                    </div>

                    {right ? <div className="shrink-0">{right}</div> : null}
                </div>
            ) : null}

            <div className={!title ? "" : subtitle ? "mt-4" : "mt-2"}>{children}</div>
        </div>
    );
}

/* ============================================================================
🎛️ UI ACTIONS (store)
============================================================================ */

type UiAction =
    | "openPalette"
    | "closePalette"
    | "togglePalette"
    | "enableDevMode"
    | "disableDevMode"
    | "toggleDevMode";

function useUiAction(action?: UiAction) {
    const openPalette = useUiStore((s) => s.openCommandPalette);
    const closePalette = useUiStore((s) => s.closeCommandPalette);
    const togglePalette = useUiStore((s) => s.toggleCommandPalette);

    const devMode = useUiStore((s) => s.devMode);
    const setDevMode = useUiStore((s) => s.setDevMode);

    if (!action) return undefined;

    if (action === "openPalette") return () => openPalette();
    if (action === "closePalette") return () => closePalette();
    if (action === "togglePalette") return () => togglePalette();

    if (action === "enableDevMode") return () => setDevMode(true);
    if (action === "disableDevMode") return () => setDevMode(false);
    if (action === "toggleDevMode") return () => setDevMode(!devMode);

    return undefined;
}

/* ============================================================================
🟣 ACTION BUTTON
============================================================================ */

export function ActionButton(props: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "soft" | "solid" | "master";
    disabled?: boolean;
    className?: string;

    action?: UiAction;
    hint?: string;
}) {
    const disabled = !!props.disabled;

    const storeAction = useUiAction(props.action);
    const onClick = props.onClick ?? storeAction;

    // 🌈 MASTER: badge premium, mais basé sur les tokens
    if (props.variant === "master") {
        return (
            <button
                type="button"
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                className={cn(
                    props.className ?? "",
                    "rounded-[20px] p-[1.5px]",
                    // ✅ token-driven gradient (accent + accent-2)
                    "bg-[linear-gradient(135deg,hsl(var(--accent)),hsl(var(--accent-2)))]",
                    "transition hover:brightness-110 active:brightness-95",
                    disabled && "opacity-60 pointer-events-none"
                )}
            >
                <span
                    className={cn(
                        "inline-flex w-full items-center gap-2 rounded-[18px] px-4 py-2",
                        "rpg-text-sm font-semibold",
                        "bg-[hsl(var(--bg)/0.75)] backdrop-blur",
                        "text-[hsl(var(--text))] ring-1 ring-[hsl(var(--ring))]",
                        "hover:bg-[hsl(var(--bg)/0.68)]"
                    )}
                >
                    <span className="m-auto">{props.children}</span>

                    {props.hint ? (
                        <span
                            className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] ring-1",
                                "bg-[hsl(var(--accent)/0.12)]",
                                "text-[hsl(var(--text))]",
                                "ring-[hsl(var(--accent)/0.25)]"
                            )}
                        >
                            {props.hint}
                        </span>
                    ) : null}
                </span>
            </button>
        );
    }

    const isSolid = props.variant === "solid";

    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={cn(
                props.className ?? "",
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2 rpg-text-sm ring-1 transition",
                "text-[hsl(var(--text))]",
                isSolid
                    ? "bg-[hsl(var(--accent)/0.12)] ring-[hsl(var(--accent)/0.25)] hover:bg-[hsl(var(--accent)/0.16)]"
                    : "bg-[hsl(var(--panel-2)/0.55)] ring-[hsl(var(--ring))] hover:bg-[hsl(var(--panel-2)/0.68)]",
                "shadow-[0_0_0_1px_hsl(var(--border)),0_8px_18px_hsl(var(--shadow))]",
                disabled && "opacity-60 pointer-events-none"
            )}
        >
            <span className="w-full">{props.children}</span>

            {props.hint ? (
                <span
                    className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] ring-1",
                        "bg-[hsl(var(--bg)/0.35)]",
                        "text-[hsl(var(--muted))]",
                        "ring-[hsl(var(--border))]"
                    )}
                >
                    {props.hint}
                </span>
            ) : null}
        </button>
    );
}

/* ============================================================================
💊 PILL
============================================================================ */

export function Pill({
    children,
    onClick,
    action,
    title,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    action?: UiAction;
    title?: string;
}) {
    const disabled = !onClick && !action;
    const storeAction = useUiAction(action);
    const click = onClick ?? storeAction;

    const base = cn(
        "rounded-full px-3 py-1 text-xs ring-1 transition",
        "shadow-[0_0_0_1px_hsl(var(--border)),0_6px_14px_hsl(var(--shadow))]"
    );

    if (disabled) {
        return (
            <span
                className={cn(
                    base,
                    "bg-[hsl(var(--panel-2)/0.45)] text-[hsl(var(--muted))] ring-[hsl(var(--ring))]"
                )}
            >
                {children}
            </span>
        );
    }

    return (
        <button
            type="button"
            title={title}
            onClick={click}
            className={cn(
                base,
                "bg-[hsl(var(--panel)/0.65)] text-[hsl(var(--text))] ring-[hsl(var(--ring))] hover:bg-[hsl(var(--panel)/0.78)]"
            )}
        >
            {children}
        </button>
    );
}
