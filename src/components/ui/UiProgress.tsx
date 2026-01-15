// src/components/ui/UiProgress.tsx
"use client";

import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🎨 GRADIENTS (match UiGradientPanel)
============================================================================ */

export type UiProgressGradient =
    | "aurora"
    | "ember"
    | "cosmic"
    | "mythic"
    | "royal"
    | "mono"
    | "theme"
    | "custom";

export type UiProgressColor =
    | "white"
    | "black"
    | "gray"
    | "cyan"
    | "emerald"
    | "amber"
    | "rose"
    | "violet"
    | "blue"
    | "custom";

const GRADIENTS: Record<Exclude<UiProgressGradient, "custom">, string> = {
    aurora: "linear-gradient(90deg, rgba(34,211,238,0.95), rgba(217,70,239,0.95), rgba(52,211,153,0.95))",
    ember: "linear-gradient(90deg, rgba(251,191,36,0.95), rgba(244,63,94,0.95), rgba(139,92,246,0.95))",
    cosmic: "linear-gradient(90deg, rgba(99,102,241,0.95), rgba(217,70,239,0.95), rgba(34,211,238,0.95))",
    mythic: "linear-gradient(90deg, rgba(52,211,153,0.95), rgba(45,212,191,0.95), rgba(14,165,233,0.95))",
    royal: "linear-gradient(90deg, rgba(139,92,246,0.95), rgba(99,102,241,0.95), rgba(236,72,153,0.95))",
    mono: "linear-gradient(90deg, rgba(255,255,255,0.55), rgba(255,255,255,0.35), rgba(255,255,255,0.45))",
    theme: "linear-gradient(90deg, hsl(var(--accent) / 0.95), hsl(var(--accent-2) / 0.95))",
};

const COLORS: Record<Exclude<UiProgressColor, "custom">, string> = {
    white: "rgba(255,255,255,0.32)",
    black: "rgba(0,0,0,0.65)",
    gray: "rgba(255,255,255,0.22)",
    cyan: "rgba(34,211,238,0.55)",
    emerald: "rgba(52,211,153,0.55)",
    amber: "rgba(251,191,36,0.55)",
    rose: "rgba(244,63,94,0.55)",
    violet: "rgba(139,92,246,0.55)",
    blue: "rgba(59,130,246,0.55)",
};

/* ============================================================================
🧠 HELPERS
============================================================================ */

function clamp01(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
}

function clampPct(n: number) {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
}

function toPct(opts: { value?: number; max?: number; pct?: number }) {
    if (typeof opts.pct === "number") return clampPct(opts.pct);
    const max = typeof opts.max === "number" && opts.max > 0 ? opts.max : 100;
    const value = typeof opts.value === "number" ? opts.value : 0;
    return clampPct((value / max) * 100);
}

/* ============================================================================
🧩 TYPES
============================================================================ */

export type UiProgressProps = {
    /** Soit pct directement, soit value/max */
    pct?: number;
    value?: number;
    max?: number;

    /** Accessibilité */
    ariaLabel?: string;

    /** Affichage */
    showLabel?: boolean; // affiche "xx%"
    label?: React.ReactNode; // override texte de label
    labelClassName?: string;
    labelPlacement?: "right" | "below"; // "below" utile en mobile

    /** Look */
    size?: "xs" | "sm" | "md";
    rounded?: boolean;
    striped?: boolean;
    animateStripes?: boolean;

    /** Style track + bar */
    trackClassName?: string;
    barClassName?: string;

    /** Fond du track (si tu veux override) */
    trackBgClassName?: string; // ex: "bg-white/5"
    trackRingClassName?: string; // ex: "ring-white/10"

    /** Couleurs */
    tone?: "solid" | "soft";
    gradient?: UiProgressGradient;
    gradientStyle?: string; // utilisé si gradient="custom"
    color?: UiProgressColor; // si tu ne veux pas de gradient
    colorValue?: string; // utilisé si color="custom"
    useGradient?: boolean; // default true si gradient défini

    /** Animations */
    animated?: boolean; // transition width
    durationMs?: number;

    /** Disabled */
    disabled?: boolean;

    /** Events */
    onValueChange?: (pct: number) => void;

    /** Container */
    className?: string;
};

const HEIGHTS: Record<NonNullable<UiProgressProps["size"]>, string> = {
    xs: "h-1.5",
    sm: "h-2",
    md: "h-3",
};

/* ============================================================================
🧱 COMPONENT
============================================================================ */

export default function UiProgress(props: UiProgressProps) {
    const {
        pct,
        value,
        max,

        ariaLabel = "Progress",

        showLabel = false,
        label,
        labelClassName,
        labelPlacement = "right",

        size = "sm",
        rounded = true,
        striped = false,
        animateStripes = false,

        trackClassName,
        barClassName,
        trackBgClassName,
        trackRingClassName,

        tone = "soft",
        gradient = "theme",
        gradientStyle,
        color,
        colorValue,
        useGradient = true,

        animated = true,
        durationMs = 500,

        disabled = false,

        onValueChange,

        className,
    } = props;

    const computedPct = toPct({ pct, value, max });
    const pct01 = clamp01(computedPct / 100);

    React.useEffect(() => {
        if (typeof onValueChange === "function") onValueChange(computedPct);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [computedPct]);

    const trackBg = trackBgClassName ?? (tone === "soft" ? "bg-white/5" : "bg-white/10");
    const trackRing = trackRingClassName ?? "ring-white/10";

    const resolvedGradient =
        gradient === "custom" ? (gradientStyle ?? GRADIENTS.theme) : GRADIENTS[gradient];

    const resolvedColor =
        color === "custom" ? (colorValue ?? COLORS.white) : color ? COLORS[color] : COLORS.white;

    const barBackground =
        useGradient && gradient
            ? resolvedGradient
            : `linear-gradient(90deg, ${resolvedColor}, ${resolvedColor})`;

    const stripeBg = striped
        ? {
              backgroundImage:
                  "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.18) 18%, rgba(255,255,255,0.0) 18%, rgba(255,255,255,0.0) 50%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.18) 68%, rgba(255,255,255,0.0) 68%, rgba(255,255,255,0.0) 100%)",
              backgroundSize: "18px 18px",
          }
        : null;

    const stripeAnimClass = striped && animateStripes ? "ui-progress-stripes-anim" : undefined;

    return (
        <div className={cn("w-full", className)}>
            <div
                className={cn(
                    "flex items-center gap-3",
                    labelPlacement === "below" && "flex-col items-stretch gap-2"
                )}
            >
                <div
                    role="progressbar"
                    aria-label={ariaLabel}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(computedPct)}
                    className={cn(
                        "w-full overflow-hidden ring-1",
                        trackBg,
                        trackRing,
                        HEIGHTS[size],
                        rounded ? "rounded-full" : "rounded-md",
                        disabled && "opacity-60",
                        trackClassName
                    )}
                >
                    <div
                        className={cn(
                            "h-full",
                            rounded ? "rounded-full" : "rounded-md",
                            animated && "transition-[width]",
                            stripeAnimClass,
                            barClassName
                        )}
                        style={{
                            width: `${computedPct}%`,
                            transitionDuration: animated ? `${durationMs}ms` : undefined,
                            background: barBackground,
                            ...(stripeBg ?? {}),
                            opacity: disabled ? 0.7 : 1,
                        }}
                    />
                </div>

                {showLabel ? (
                    <div
                        className={cn(
                            "shrink-0 text-xs text-white/60 tabular-nums",
                            labelPlacement === "below" && "text-right",
                            labelClassName
                        )}
                    >
                        {label ?? `${Math.round(computedPct)}%`}
                    </div>
                ) : null}
            </div>

            {/* Local CSS (no dependency) */}
            <style jsx>{`
                .ui-progress-stripes-anim {
                    animation: uiProgressMove 1.2s linear infinite;
                }
                @keyframes uiProgressMove {
                    from {
                        background-position: 0 0;
                    }
                    to {
                        background-position: 18px 18px;
                    }
                }
            `}</style>
        </div>
    );
}

/* ============================================================================
✅ EXAMPLES

<UiProgress value={35} max={100} showLabel gradient="aurora" />
<UiProgress pct={72} size="md" gradient="royal" striped animateStripes />
<UiProgress pct={40} useGradient={false} color="emerald" />
<UiProgress pct={55} gradient="custom" gradientStyle="linear-gradient(90deg,#fff,#aaa)" />

============================================================================ */
