// src/components/ui/UiGradientPanel.tsx
"use client";

import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiGradientPanelProps<T extends React.ElementType = "div"> = {
    as?: T;

    /** Contenu */
    children: React.ReactNode;

    /** Classes sur le conteneur externe */
    className?: string;

    /** Classes sur le wrapper interne (padding etc.) */
    innerClassName?: string;

    /** Active/désactive le glow */
    glow?: boolean;

    /** Opacité du glow (0..1) */
    glowOpacity?: number;

    /**
     * Background CSS du glow.
     * Par défaut: mélange --accent et --accent-2 (comme ton bloc Home).
     */
    glowStyle?: string;

    /** Override rapide du fond (sinon bg-black/20) */
    backgroundClassName?: string;

    /** Override rapide du ring (sinon ring-white/10) */
    ringClassName?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

const DEFAULT_GLOW =
    "radial-gradient(900px 380px at 15% 20%, hsl(var(--accent) / 0.16), transparent 60%), " +
    "radial-gradient(700px 360px at 85% 30%, hsl(var(--accent-2) / 0.14), transparent 55%)";

export function UiGradientPanel<T extends React.ElementType = "div">(
    props: UiGradientPanelProps<T>
) {
    const {
        as,
        children,
        className,
        innerClassName,
        glow = true,
        glowOpacity = 0.6,
        glowStyle = DEFAULT_GLOW,
        backgroundClassName,
        ringClassName,
        ...rest
    } = props;

    const Comp = (as ?? "div") as React.ElementType;

    return (
        <Comp
            className={cn(
                "relative overflow-hidden rounded-[22px]",
                backgroundClassName ?? "bg-black/20",
                "ring-1",
                ringClassName ?? "ring-white/10",
                className
            )}
            {...rest}
        >
            {glow ? (
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        opacity: glowOpacity,
                        background: glowStyle,
                    }}
                />
            ) : null}

            <div className={cn("relative", innerClassName)}>{children}</div>
        </Comp>
    );
}
