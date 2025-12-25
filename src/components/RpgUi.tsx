"use client";

import React from "react";
import { useUiStore } from "@/stores/uiStore";
import { useUiSettingsStore } from "@/stores/uiSettingsStore";

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
    const theme = useUiSettingsStore((s) => s.theme);
    const cyber = theme === "cyber-ritual";

    return (
        <div
            className={cn(
                // ✅ CLASSIC (inchangé)
                !cyber && "rounded-2xl bg-black/25 p-5 ring-1 ring-white/10",

                // 🟦 CYBER RITUAL
                cyber &&
                    cn(
                        "rounded-2xl p-5 ring-1",
                        "bg-black/30 ring-cyan-400/20",
                        "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_24px_rgba(34,211,238,0.08)]"
                    )
            )}
        >
            {title && (
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div
                            className={cn(
                                // ✅ CLASSIC (inchangé)
                                !cyber && "text-[11px] tracking-[0.18em] text-white/55",

                                // 🟦 CYBER RITUAL
                                cyber &&
                                    "text-[11px] tracking-[0.22em] text-cyan-200/75 drop-shadow-[0_0_10px_rgba(34,211,238,0.12)]"
                            )}
                        >
                            {emoji ? `${emoji} ` : ""}
                            {title ? title.toUpperCase() : ""}
                        </div>

                        {subtitle ? (
                            <div
                                className={cn(
                                    // ✅ CLASSIC (inchangé)
                                    !cyber && "mt-2 rpg-text-sm text-white/60",

                                    // 🟦 CYBER RITUAL
                                    cyber && "mt-2 rpg-text-sm text-white/65"
                                )}
                            >
                                {subtitle}
                            </div>
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
    className?: string;

    action?: UiAction;
    hint?: string;
}) {
    const theme = useUiSettingsStore((s) => s.theme);
    const cyber = theme === "cyber-ritual";

    const disabled = !!props.disabled;

    const storeAction = useUiAction(props.action);
    const onClick = props.onClick ?? storeAction;

    // 🌈 Variante MASTER (classic inchangé, cyber: un peu plus “rituel”)
    if (props.variant === "master") {
        return (
            <button
                type="button"
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                className={
                    (props.className ?? "") +
                    " " +
                    cn(
                        "rounded-[20px] p-[1.5px]",
                        // ✅ CLASSIC gradient (inchangé)
                        !cyber && "bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-emerald-400",
                        // 🟦 CYBER RITUAL gradient (plus “neon circuit”)
                        cyber && "bg-gradient-to-br from-cyan-300 via-fuchsia-400 to-lime-300",
                        "transition hover:brightness-110 active:brightness-95",
                        disabled && "opacity-60 pointer-events-none"
                    )
                }
            >
                <span
                    className={cn(
                        "inline-flex w-full items-center gap-2 rounded-[18px]",
                        "px-4 py-2 rpg-text-sm font-semibold",
                        // ✅ CLASSIC (inchangé)
                        !cyber &&
                            "bg-black/90 backdrop-blur text-white/90 ring-1 ring-white/10 hover:bg-black/85",
                        // 🟦 CYBER RITUAL
                        cyber &&
                            "bg-black/80 backdrop-blur text-white/90 ring-1 ring-cyan-300/20 hover:bg-black/75"
                    )}
                >
                    <span>{props.children}</span>

                    {props.hint ? (
                        <span
                            className={cn(
                                // ✅ CLASSIC (inchangé)
                                !cyber &&
                                    "rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80 ring-1 ring-white/15",
                                // 🟦 CYBER RITUAL
                                cyber &&
                                    "rounded-full bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-100 ring-1 ring-cyan-300/20"
                            )}
                        >
                            {props.hint}
                        </span>
                    ) : null}
                </span>
            </button>
        );
    }

    // ✅ Variants existants (classic inchangé)
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={
                (props.className ?? "") +
                " " +
                cn(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 rpg-text-sm ring-1 transition",

                    // ✅ CLASSIC (inchangé)
                    !cyber &&
                        (props.variant === "solid"
                            ? "bg-white/10 text-white ring-white/15 hover:bg-white/15"
                            : "bg-white/5 text-white/80 ring-white/10 hover:bg-white/10"),

                    // 🟦 CYBER RITUAL
                    cyber &&
                        (props.variant === "solid"
                            ? "bg-cyan-400/10 text-white ring-cyan-300/25 hover:bg-cyan-400/15"
                            : "bg-white/5 text-white/85 ring-cyan-300/15 hover:bg-white/10"),

                    disabled && "opacity-60 pointer-events-none"
                )
            }
        >
            <span className="w-full">{props.children}</span>

            {props.hint ? (
                <span
                    className={cn(
                        // ✅ CLASSIC (inchangé)
                        !cyber &&
                            "rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-white/60 ring-1 ring-white/10",
                        // 🟦 CYBER RITUAL
                        cyber &&
                            "rounded-full bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-100/80 ring-1 ring-cyan-300/20"
                    )}
                >
                    {props.hint}
                </span>
            ) : null}
        </button>
    );
}

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
    const theme = useUiSettingsStore((s) => s.theme);
    const cyber = theme === "cyber-ritual";

    const disabled = !onClick && !action;
    const storeAction = useUiAction(action);
    const click = onClick ?? storeAction;

    const base = "rounded-full px-3 py-1 text-xs ring-1";

    // ✅ CLASSIC tones (inchangés)
    const classicTone = disabled
        ? "bg-white/5 text-white/60 ring-white/10"
        : "bg-white/10 text-white ring-white/15 hover:bg-white/15";

    // 🟦 CYBER tones
    const cyberTone = disabled
        ? "bg-white/5 text-white/60 ring-cyan-300/10"
        : "bg-cyan-400/10 text-white ring-cyan-300/20 hover:bg-cyan-400/15";

    const tone = cyber ? cyberTone : classicTone;

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
