"use client";

import React from "react";
import { CurrentCharacterPill } from "@/helpers/adventure";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UiMagicCardGradient =
    | "aurora" // cyan → fuchsia → emerald
    | "ember" // amber → rose → violet
    | "cosmic" // indigo → fuchsia → cyan
    | "mythic" // emerald → teal → sky
    | "royal" // violet → indigo → pink
    | "mono" // subtle white glow
    | "custom"; // via gradientClassName

export type UiMagicCardTone = "soft" | "solid";

type UiMagicCardProps = {
    title?: string;
    emoji?: string;

    /** Badge (sinon fallback CurrentCharacterPill) */
    badgeText?: string;
    badgeEmoji?: string;

    /** Slots */
    rightSlot?: React.ReactNode;
    footer?: React.ReactNode;

    /** Content */
    children: React.ReactNode;

    /** Layout */
    className?: string;
    innerClassName?: string;
    contentClassName?: string;

    /** Header control */
    showHeader?: boolean;
    headerClassName?: string;

    /** Style */
    gradient?: UiMagicCardGradient;
    gradientClassName?: string; // utilisé si gradient="custom"
    tone?: UiMagicCardTone; // influence le fond interne
    blur?: boolean;
    bordered?: boolean;
    glow?: boolean;

    /** Density */
    padded?: boolean;
    size?: "sm" | "md" | "lg";

    /** Accessibility */
    ariaLabel?: string;
};

const gradients: Record<Exclude<UiMagicCardGradient, "custom">, string> = {
    aurora: "from-cyan-400 via-fuchsia-500 to-emerald-400",
    ember: "from-amber-400 via-rose-500 to-violet-500",
    cosmic: "from-indigo-400 via-fuchsia-500 to-cyan-400",
    mythic: "from-emerald-400 via-teal-400 to-sky-400",
    royal: "from-violet-500 via-indigo-500 to-pink-500",
    mono: "from-white/25 via-white/10 to-white/20",
};

const sizeOuter: Record<NonNullable<UiMagicCardProps["size"]>, string> = {
    sm: "rounded-[20px] p-[1.25px]",
    md: "rounded-[22px] p-[1.5px]",
    lg: "rounded-[26px] p-[2px]",
};

const sizeInner: Record<NonNullable<UiMagicCardProps["size"]>, string> = {
    sm: "rounded-[18px] px-4 py-3",
    md: "rounded-[20px] px-5 py-4",
    lg: "rounded-[24px] px-6 py-5",
};

export default function UiMagicCard({
    title = "Ordre de mission",
    emoji = "🎯",
    badgeText,
    badgeEmoji,
    rightSlot,
    footer,
    children,

    className,
    innerClassName,
    contentClassName,

    showHeader = true,
    headerClassName,

    gradient = "aurora",
    gradientClassName,
    tone = "solid",
    blur = true,
    bordered = true,
    glow = true,

    padded = true,
    size = "md",

    ariaLabel,
}: UiMagicCardProps) {
    const hasHeaderContent = Boolean(title || rightSlot || badgeText);
    const hasHeader = showHeader && hasHeaderContent;

    const gradientColors =
        gradient === "custom" ? (gradientClassName ?? gradients.aurora) : gradients[gradient];

    const innerBg = tone === "soft" ? "bg-black/70" : "bg-black/90";

    return (
        <div
            aria-label={ariaLabel}
            className={cn(
                // 🌈 Outer gradient border
                sizeOuter[size],
                bordered && "bg-gradient-to-br",
                bordered && gradientColors,
                !bordered && "bg-transparent",

                // ✨ Optional glow
                glow &&
                    bordered &&
                    "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_40px_rgba(0,0,0,0.55),0_0_28px_rgba(255,255,255,0.08)]",

                className
            )}
        >
            {/* 🖤 Inner card */}
            <div
                className={cn(
                    sizeInner[size],
                    innerBg,
                    blur && "backdrop-blur",
                    bordered && "ring-1 ring-white/10",
                    !bordered && "ring-1 ring-white/10",
                    !padded && "px-0 py-0",
                    innerClassName
                )}
            >
                {hasHeader ? (
                    <div className={cn("flex items-start justify-between gap-3", headerClassName)}>
                        <div className="w-full min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-white/90 font-semibold">
                                    {emoji} {title}
                                </span>

                                {badgeText ? (
                                    <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/80 ring-1 ring-white/15">
                                        {badgeEmoji ? `${badgeEmoji} ` : ""}
                                        {badgeText}
                                    </span>
                                ) : (
                                    <CurrentCharacterPill />
                                )}
                            </div>
                        </div>

                        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
                    </div>
                ) : null}

                <div className={cn(hasHeader ? "mt-4" : undefined, contentClassName)}>
                    {children}
                </div>

                {footer ? <div className="mt-4 pt-4 border-t border-white/10">{footer}</div> : null}
            </div>
        </div>
    );
}

/* ============================================================================
🎨 IDEAS: gradients
============================================================================

- aurora  : cyan → fuchsia → emerald (par défaut, “IA magique”)
- ember   : amber → rose → violet (plus “rituel / feu”)
- cosmic  : indigo → fuchsia → cyan (plus “astral”)
- mythic  : emerald → teal → sky (plus “nature / quête”)
- royal   : violet → indigo → pink (plus “noble / prestige”)
- mono    : liseré blanc subtil (sobre)
- custom  : passe gradientClassName="from-... via-... to-..."

============================================================================ */
