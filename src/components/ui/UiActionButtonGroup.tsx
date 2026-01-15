// src/components/ui/UiActionButtonGroup.tsx
"use client";

import React from "react";
import UiActionButton, { type UiActionButtonProps } from "@/components/ui/UiActionButton";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiActionButtonGroupButton = {
    key?: string;
    children: React.ReactNode;

    onClick?: () => void;
    disabled?: boolean;
    active?: boolean;
    hint?: string;

    text?: string;

    /** Optionnel: override size par bouton (sinon le group size) */
    size?: UiActionButtonProps["size"];

    /** Optionnel: si tu veux un bouton plein large dans un group fullWidth */
    fullWidth?: boolean;

    /** Optionnel: classes additionnelles */
    className?: string;
};

export type UiActionButtonGroupProps = {
    /** Les boutons (au lieu de children) */
    buttons: UiActionButtonGroupButton[];

    /** Variant imposé pour tous les boutons du group */
    variant?: "soft" | "solid" | "danger";

    /** Taille imposée (sauf override bouton.size) */
    size?: UiActionButtonProps["size"];

    /** Alignement / wrap */
    className?: string;

    /** Si true: prend toute la largeur */
    fullWidth?: boolean;
};

export const UiActionButtonGroupPropsTable = [
    {
        name: "buttons",
        type: "UiActionButtonGroupButton[]",
        description:
            "Liste des boutons du groupe. Chaque bouton décrit son contenu, son état (active, disabled), et ses handlers.",
        default: "—",
        required: true,
    },
    {
        name: "variant",
        type: '"soft" | "solid" | "danger"',
        description:
            "Variant visuel appliqué à tous les boutons du groupe (style global du segmented control).",
        default: '"soft"',
        required: false,
    },
    {
        name: "size",
        type: '"xs" | "sm" | "md" | "lg" | "xl"',
        description: "Taille imposée aux boutons du groupe (sauf override via button.size).",
        default: '"md"',
        required: false,
    },
    {
        name: "className",
        type: "string",
        description: "Classes CSS supplémentaires appliquées au conteneur du groupe.",
        default: "—",
        required: false,
    },
    {
        name: "fullWidth",
        type: "boolean",
        description:
            "Si true, le groupe prend toute la largeur disponible. Les boutons peuvent aussi être étendus individuellement.",
        default: "false",
        required: false,
    },
];

/**
 * UiActionButtonGroup
 * - Segmented control (toolbar)
 * - Force variant + size (sauf override size par bouton)
 * - Collage des segments + séparateur subtil
 */
export function UiActionButtonGroup({
    buttons,
    variant = "soft",
    size = "md",
    className,
    fullWidth,
}: UiActionButtonGroupProps) {
    const radius = size === "xs" ? "rounded-xl" : size === "xl" ? "rounded-3xl" : "rounded-2xl";

    const shell =
        variant === "solid"
            ? "bg-[hsl(var(--panel-2)/0.75)] ring-[hsl(var(--accent)/0.25)]"
            : variant === "danger"
              ? "bg-red-500/10 ring-red-400/25"
              : "bg-[hsl(var(--panel-2)/0.55)] ring-[hsl(var(--ring))]";

    return (
        <div
            role="group"
            className={cn(
                "inline-flex items-stretch",
                fullWidth && "w-full",
                radius,
                "ring-1",
                shell,
                "shadow-[0_0_0_1px_hsl(var(--border)),0_8px_18px_hsl(var(--shadow))]",
                "backdrop-blur",

                // ✅ segmented look: neutralise l'enveloppe des boutons
                "[&>button]:shadow-none [&>button]:ring-0 [&>button]:rounded-none",

                // Spacing: no gap + divider
                "[&>button+button]:ml-0 [&>button+button]:relative",
                "[&>button+button]:before:content-[''] [&>button+button]:before:absolute",
                "[&>button+button]:before:left-0 [&>button+button]:before:top-1/2",
                "[&>button+button]:before:-translate-y-1/2",
                "[&>button+button]:before:w-px",
                // "[&>button+button]:before:h-[65%] [&>button+button]:before:w-px",
                variant === "danger"
                    ? "[&>button+button]:before:bg-red-400/20"
                    : "[&>button+button]:before:bg-white/10",

                // Rounded corners only on ends
                "[&>button:first-child]:rounded-l-2xl [&>button:last-child]:rounded-r-2xl",
                size === "xs" &&
                    "[&>button:first-child]:rounded-l-xl [&>button:last-child]:rounded-r-xl",
                size === "xl" &&
                    "[&>button:first-child]:rounded-l-3xl [&>button:last-child]:rounded-r-3xl",

                // Fill height nicely
                "[&>button]:inline-flex [&>button]:items-center [&>button]:justify-center",

                // Active stays readable in-group
                // "[&>button[aria-pressed='true']]:ring-1",
                variant === "danger"
                    ? "[&>button[aria-pressed='true']]:ring-red-300/30"
                    : "[&>button[aria-pressed='true']]:ring-white/15",

                className
            )}
        >
            {buttons.map((b, idx) => (
                <UiActionButton
                    key={b.key ?? String(idx)}
                    variant={variant}
                    size={b.size ?? size}
                    disabled={b.disabled}
                    active={b.active}
                    hint={b.hint}
                    fullWidth={b.fullWidth}
                    onClick={b.onClick}
                    className={cn("rounded-none", fullWidth && "flex-1", b.className)}
                >
                    <span className={b.text ? `text-${b.text}` : ""}>{b.children}</span>
                </UiActionButton>
            ))}
        </div>
    );
}
