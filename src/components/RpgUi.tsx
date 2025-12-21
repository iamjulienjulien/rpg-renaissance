"use client";

import React from "react";
import { useUiStore } from "@/stores/uiStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

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
        <div className="rounded-2xl bg-black/25 p-5 ring-1 ring-white/10">
            {title && (
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[11px] tracking-[0.18em] text-white/55">
                            {emoji ? `${emoji} ` : ""}
                            {title ? title.toUpperCase() : ""}
                        </div>
                        {subtitle ? (
                            <div className="mt-2 rpg-text-sm text-white/60">{subtitle}</div>
                        ) : null}
                    </div>
                    {right ? <div className="shrink-0">{right}</div> : null}
                </div>
            )}

            <div className={!title ? "" : subtitle ? "mt-4" : "mt-2"}>{children}</div>
        </div>
    );
}

/**
 * Actions globales (store UI)
 * -> tu peux les appeler depuis n'importe quel bouton sans prop onClick.
 */
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

export function ActionButton(props: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "soft" | "solid" | "master";
    disabled?: boolean;

    /**
     * Optionnel: branche directement sur le store UI
     * Exemple: <ActionButton action="togglePalette">⌘K</ActionButton>
     */
    action?: UiAction;

    /**
     * Optionnel: petit hint UX (affiché à droite si fourni)
     * Exemple: hint="⌘K"
     */
    hint?: string;
}) {
    const disabled = !!props.disabled;

    const storeAction = useUiAction(props.action);
    const onClick = props.onClick ?? storeAction;

    // 🌈 Variante MASTER (inspirée de MasterCard)
    if (props.variant === "master") {
        return (
            <button
                type="button"
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                className={cn(
                    "rounded-[20px] p-[1.5px]",
                    "bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-emerald-400",
                    "transition hover:brightness-110 active:brightness-95",
                    disabled && "opacity-60 pointer-events-none"
                )}
            >
                <span
                    className={cn(
                        "inline-flex w-full items-center gap-2 rounded-[18px]",
                        "px-4 py-2 rpg-text-sm font-semibold",
                        "bg-black/90 backdrop-blur",
                        "text-white/90 ring-1 ring-white/10",
                        "hover:bg-black/85"
                    )}
                >
                    <span>{props.children}</span>

                    {props.hint ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80 ring-1 ring-white/15">
                            {props.hint}
                        </span>
                    ) : null}
                </span>
            </button>
        );
    }

    // ✅ Variants existants (inchangés)
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2 rpg-text-sm ring-1 transition",
                props.variant === "solid"
                    ? "bg-white/10 text-white ring-white/15 hover:bg-white/15"
                    : "bg-white/5 text-white/80 ring-white/10 hover:bg-white/10",
                disabled && "opacity-60 pointer-events-none"
            )}
        >
            <span>{props.children}</span>

            {props.hint ? (
                <span className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-white/60 ring-1 ring-white/10">
                    {props.hint}
                </span>
            ) : null}
        </button>
    );
}

export function Pill({
    children,
    /**
     * Optionnel: rend le pill “cliquable” et peut pointer vers un action store
     */
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

    const base = "rounded-full px-3 py-1 text-xs ring-1";
    const tone = disabled
        ? "bg-white/5 text-white/60 ring-white/10"
        : "bg-white/10 text-white ring-white/15 hover:bg-white/15";

    if (disabled) {
        return <span className={cn(base, tone)}>{children}</span>;
    }

    return (
        <button
            type="button"
            title={title}
            onClick={click}
            className={cn(base, tone, "transition")}
        >
            {children}
        </button>
    );
}
