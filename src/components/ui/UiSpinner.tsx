// src/components/ui/UiSpinner.tsx
"use client";

import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UiSpinnerVariant =
    | "hourglass" // ⏳ emoji tourne (pause)
    | "dots" // • • • pulse
    | "ring" // anneau CSS
    | "bars" // barres verticales
    | "spark" // ✨ pulse/rotate doux
    | "custom"; // via children / icon

export type UiSpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export type UiSpinnerTone =
    | "inherit"
    | "neutral"
    | "theme"
    | "white"
    | "slate"
    | "emerald"
    | "violet"
    | "amber"
    | "rose"
    | "sky"
    | "custom";

export type UiSpinnerSpeed = "slow" | "md" | "fast" | "custom";

export type UiSpinnerProps = {
    /** Style de spinner */
    variant?: UiSpinnerVariant;

    /** Taille globale */
    size?: UiSpinnerSize;

    /** Couleur (pour les spinners CSS) */
    tone?: UiSpinnerTone;
    toneClassName?: string; // si tone="custom"

    /** Vitesse */
    speed?: UiSpinnerSpeed;
    speedMs?: number; // si speed="custom"

    /** Emoji par défaut (hourglass) */
    emoji?: string;

    /** Afficher un label (inline) */
    label?: React.ReactNode;
    labelPosition?: "right" | "left" | "bottom";

    /** Mode overlay (plein écran / conteneur) */
    overlay?: boolean;
    overlayBlur?: boolean;
    overlayClassName?: string;

    /** Layout */
    inline?: boolean; // default true (sinon block)
    center?: boolean; // centre dans son conteneur
    gap?: "xs" | "sm" | "md";

    /** Accessibilité */
    ariaLabel?: string;
    role?: "status" | "progressbar";

    /** Custom icon/children (variant="custom") */
    icon?: React.ReactNode;
    children?: React.ReactNode;

    /** Extra classes */
    className?: string;
};

export const UiSpinnerPropsTable = [
    {
        name: "variant",
        type: '"hourglass" | "dots" | "ring" | "bars" | "spark" | "custom"',
        description: "Style du spinner (emoji, dots, anneau, barres, spark ou rendu custom).",
        default: '"hourglass"',
        required: false,
    },
    {
        name: "size",
        type: '"xs" | "sm" | "md" | "lg" | "xl"',
        description: "Taille globale du spinner (impacte dimensions/typo selon le variant).",
        default: '"md"',
        required: false,
    },
    {
        name: "tone",
        type: '"inherit" | "neutral" | "theme" | "white" | "slate" | "emerald" | "violet" | "amber" | "rose" | "sky" | "custom"',
        description:
            "Couleur du spinner (pour les spinners CSS). Utiliser custom + toneClassName pour une classe libre.",
        default: '"neutral"',
        required: false,
    },
    {
        name: "toneClassName",
        type: "string",
        description: 'Classe(s) Tailwind appliquées si tone="custom" (ex: "text-red-400").',
        default: "—",
        required: false,
    },
    {
        name: "speed",
        type: '"slow" | "md" | "fast" | "custom"',
        description: "Vitesse de l’animation. Utiliser custom + speedMs pour un contrôle fin.",
        default: '"md"',
        required: false,
    },
    {
        name: "speedMs",
        type: "number",
        description: 'Durée en millisecondes si speed="custom" (clamp min ~220ms).',
        default: "—",
        required: false,
    },
    {
        name: "emoji",
        type: "string",
        description: 'Emoji utilisé par le variant "hourglass".',
        default: '"⏳"',
        required: false,
    },
    {
        name: "label",
        type: "React.ReactNode",
        description: "Label optionnel affiché à côté ou sous le spinner.",
        default: "—",
        required: false,
    },
    {
        name: "labelPosition",
        type: '"right" | "left" | "bottom"',
        description: "Position du label par rapport au spinner.",
        default: '"right"',
        required: false,
    },
    {
        name: "overlay",
        type: "boolean",
        description: "Affiche le spinner en overlay plein écran (fixed inset-0).",
        default: "false",
        required: false,
    },
    {
        name: "overlayBlur",
        type: "boolean",
        description: "Active un léger blur de l’arrière-plan quand overlay=true.",
        default: "true",
        required: false,
    },
    {
        name: "overlayClassName",
        type: "string",
        description: "Classes supplémentaires pour le conteneur overlay (fond, z-index, etc.).",
        default: "—",
        required: false,
    },
    {
        name: "inline",
        type: "boolean",
        description: "Affichage inline-flex (true) ou flex (false).",
        default: "true",
        required: false,
    },
    {
        name: "center",
        type: "boolean",
        description: "Centre le contenu dans son conteneur (w-full + justify/align center).",
        default: "false",
        required: false,
    },
    {
        name: "gap",
        type: '"xs" | "sm" | "md"',
        description: "Espace entre le spinner et le label.",
        default: '"sm"',
        required: false,
    },
    {
        name: "ariaLabel",
        type: "string",
        description: "Texte d’accessibilité (aria-label).",
        default: '"Chargement…"',
        required: false,
    },
    {
        name: "role",
        type: '"status" | "progressbar"',
        description: "Rôle ARIA du composant (utile pour lecteurs d’écran).",
        default: '"status"',
        required: false,
    },
    {
        name: "icon",
        type: "React.ReactNode",
        description: 'Icône utilisée pour variant="custom" (si children absent).',
        default: "—",
        required: false,
    },
    {
        name: "children",
        type: "React.ReactNode",
        description: 'Contenu custom utilisé pour variant="custom" (prioritaire sur icon).',
        default: "—",
        required: false,
    },
    {
        name: "className",
        type: "string",
        description: "Classes CSS supplémentaires appliquées au conteneur principal.",
        default: "—",
        required: false,
    },
];

/* ============================================================================
🎨 MAPS
============================================================================ */

const sizePx: Record<UiSpinnerSize, number> = {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 28,
    xl: 36,
};

const gapMap: Record<NonNullable<UiSpinnerProps["gap"]>, string> = {
    xs: "gap-1.5",
    sm: "gap-2",
    md: "gap-3",
};

const toneMap: Record<Exclude<UiSpinnerTone, "custom">, string> = {
    inherit: "text-inherit",
    neutral: "text-white/70",
    theme: "text-[hsl(var(--accent))]",
    white: "text-white",
    slate: "text-slate-200",
    emerald: "text-emerald-200",
    violet: "text-violet-200",
    amber: "text-amber-200",
    rose: "text-rose-200",
    sky: "text-sky-200",
};

const speedMsMap: Record<Exclude<UiSpinnerSpeed, "custom">, number> = {
    slow: 1400,
    md: 950,
    fast: 650,
};

/* ============================================================================
🧩 COMPONENT
============================================================================ */

export default function UiSpinner({
    variant = "hourglass",
    size = "md",

    tone = "neutral",
    toneClassName,

    speed = "md",
    speedMs,

    emoji = "⏳",

    label,
    labelPosition = "right",

    overlay = false,
    overlayBlur = true,
    overlayClassName,

    inline = true,
    center = false,
    gap = "sm",

    ariaLabel = "Chargement…",
    role = "status",

    icon,
    children,

    className,
}: UiSpinnerProps) {
    const px = sizePx[size];

    const finalTone = tone === "custom" ? (toneClassName ?? toneMap.neutral) : toneMap[tone];

    const ms = speed === "custom" ? Math.max(220, Number(speedMs ?? 900)) : speedMsMap[speed];

    // base container
    const base = cn(
        inline ? "inline-flex" : "flex",
        center && "items-center justify-center w-full",
        !center && "items-center",
        gapMap[gap],
        finalTone,
        className
    );

    const spinnerNode =
        variant === "hourglass" ? (
            <span
                className="inline-flex leading-none"
                style={{
                    fontSize: px,
                    // keyframes scope via style tag below; variable speed
                    animation: `ui-hourglass-spin ${ms}ms linear infinite`,
                }}
            >
                {emoji}
            </span>
        ) : variant === "dots" ? (
            <span
                className="inline-flex items-center"
                style={{
                    height: px,
                }}
                aria-hidden="true"
            >
                <span
                    className="inline-flex"
                    style={{
                        fontSize: Math.max(10, Math.round(px * 0.65)),
                        letterSpacing: "0.28em",
                    }}
                >
                    <span
                        style={{ animation: `ui-dot ${ms}ms ease-in-out infinite` }}
                        className="opacity-40"
                    >
                        •
                    </span>
                    <span
                        style={{
                            animation: `ui-dot ${ms}ms ease-in-out infinite`,
                            animationDelay: `${Math.round(ms * 0.15)}ms`,
                        }}
                        className="opacity-40"
                    >
                        •
                    </span>
                    <span
                        style={{
                            animation: `ui-dot ${ms}ms ease-in-out infinite`,
                            animationDelay: `${Math.round(ms * 0.3)}ms`,
                        }}
                        className="opacity-40"
                    >
                        •
                    </span>
                </span>
            </span>
        ) : variant === "ring" ? (
            <span
                aria-hidden="true"
                className="inline-block rounded-full border-2 border-current border-t-transparent"
                style={{
                    width: px,
                    height: px,
                    animation: `ui-rotate ${ms}ms linear infinite`,
                }}
            />
        ) : variant === "bars" ? (
            <span
                aria-hidden="true"
                className="inline-flex items-end"
                style={{ height: px, width: Math.round(px * 1.2) }}
            >
                {Array.from({ length: 4 }).map((_, i) => (
                    <span
                        key={i}
                        className="inline-block w-[3px] rounded-sm bg-current opacity-70"
                        style={{
                            marginRight: i === 3 ? 0 : 3,
                            height: Math.round(px * 0.35),
                            animation: `ui-bar ${ms}ms ease-in-out infinite`,
                            animationDelay: `${Math.round((ms / 8) * i)}ms`,
                        }}
                    />
                ))}
            </span>
        ) : variant === "spark" ? (
            <span
                aria-hidden="true"
                className="inline-flex leading-none"
                style={{
                    fontSize: px,
                    animation: `ui-spark ${ms}ms ease-in-out infinite`,
                }}
            >
                ✨
            </span>
        ) : (
            <span aria-hidden="true" className="inline-flex leading-none" style={{ fontSize: px }}>
                {children ?? icon ?? "…"}
            </span>
        );

    const labelNode = label ? (
        <span
            className={cn(
                "text-sm",
                tone === "inherit" ? "opacity-80" : "text-white/70",
                labelPosition === "bottom" && "w-full text-center"
            )}
        >
            {label}
        </span>
    ) : null;

    const content =
        label && labelPosition === "left" ? (
            <>
                {labelNode}
                {spinnerNode}
            </>
        ) : label && labelPosition === "bottom" ? (
            <div className="flex flex-col items-center gap-2">
                {spinnerNode}
                {labelNode}
            </div>
        ) : (
            <>
                {spinnerNode}
                {labelNode}
            </>
        );

    if (overlay) {
        return (
            <div
                className={cn(
                    "fixed inset-0 z-50 flex items-center justify-center",
                    overlayBlur ? "backdrop-blur-sm" : "",
                    "bg-black/35",
                    overlayClassName
                )}
                role={role}
                aria-label={ariaLabel}
            >
                <div className={base}>{content}</div>

                {/* local keyframes */}
                <style>{keyframesCss(ms)}</style>
            </div>
        );
    }

    return (
        <span className={base} role={role} aria-label={ariaLabel}>
            {content}
            <style>{keyframesCss(ms)}</style>
        </span>
    );
}

/* ============================================================================
🎞️ KEYFRAMES
============================================================================ */

function keyframesCss(ms: number) {
    // Hourglass: rotation + tiny pause each turn
    // The “pause” comes from easing segments: rotate fast then stall briefly.
    // Use steps-like behavior by holding at 360deg a bit.
    return `
@keyframes ui-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes ui-hourglass-spin {
  0% { transform: rotate(0deg); }
  78% { transform: rotate(360deg); }
  88% { transform: rotate(360deg); }
  100% { transform: rotate(720deg); }
}

@keyframes ui-dot {
  0% { opacity: .25; transform: translateY(0); }
  35% { opacity: .95; transform: translateY(-1px); }
  70% { opacity: .25; transform: translateY(0); }
  100% { opacity: .25; transform: translateY(0); }
}

@keyframes ui-bar {
  0% { height: ${Math.round(0.28 * 20)}px; opacity: .45; }
  35% { height: ${Math.round(0.9 * 20)}px; opacity: .95; }
  70% { height: ${Math.round(0.35 * 20)}px; opacity: .55; }
  100% { height: ${Math.round(0.28 * 20)}px; opacity: .45; }
}

@keyframes ui-spark {
  0% { transform: rotate(0deg) scale(0.98); opacity: .65; filter: blur(0px); }
  45% { transform: rotate(14deg) scale(1.08); opacity: 1; filter: blur(.0px); }
  70% { transform: rotate(-10deg) scale(1.02); opacity: .9; filter: blur(.2px); }
  100% { transform: rotate(0deg) scale(0.98); opacity: .65; filter: blur(0px); }
}
`.trim();
}

/* ============================================================================
✨ EXAMPLES

<UiSpinner /> // default ⏳ spin+pause

<UiSpinner variant="ring" tone="theme" size="lg" label="Génération en cours…" />

<UiSpinner variant="dots" size="sm" tone="neutral" />

<UiSpinner variant="bars" tone="emerald" speed="fast" />

<UiSpinner overlay label="Chargement de ta session…" labelPosition="bottom" />

<UiSpinner variant="custom" icon="🧪" label="Mixage…" />

============================================================================ */
