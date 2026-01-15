"use client";

import React, { useState } from "react";
import {
    UiActionButton,
    type UiActionButtonProps,
    UiActionButtonGroup,
    type UiActionButtonGroupButton,
    type UiActionButtonGroupProps,
} from "@/components/ui";
import { type UiAction } from "@/components/RpgUi";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UiToolbarItem =
    | {
          type: "button";
          key?: string;
          label: React.ReactNode;
          onClick?: () => void;
          action?: UiAction;
          variant?: UiActionButtonProps["variant"];
          size?: UiActionButtonProps["size"];
          disabled?: boolean;
          active?: boolean;
          hint?: string;
          fullWidth?: boolean;
          className?: string;
          text?: string;
      }
    | {
          type: "group";
          key?: string;
          variant?: UiActionButtonGroupProps["variant"];
          size?: UiActionButtonGroupProps["size"];
          fullWidth?: boolean;
          buttons: UiActionButtonGroupButton[];
          className?: string;
      }
    | {
          type: "dropdown";
          key?: string;
          label: React.ReactNode;
          variant?: UiActionButtonProps["variant"];
          size?: UiActionButtonProps["size"];
          fullWidth?: boolean;
          items: Array<{
              key?: string;
              label: React.ReactNode;
              onClick?: () => void;
              action?: UiAction;
              disabled?: boolean;
              hint?: string;
          }>;
      };

export type UiToolbarProps = {
    items: UiToolbarItem[];
    className?: string;
    align?: "left" | "right" | "between";

    /** Toolbar en pleine largeur, items répartis */
    fullWidth?: boolean;
};

export const UiToolbarPropsTable = [
    {
        name: "items",
        type: "UiToolbarItem[]",
        description:
            "Liste des éléments affichés dans la toolbar. Chaque item peut être un bouton simple, un groupe de boutons ou un menu déroulant.",
        default: "—",
        required: true,
    },
    {
        name: "align",
        type: '"left" | "right" | "between"',
        description:
            "Définit l’alignement horizontal des éléments dans la toolbar (gauche, droite ou réparti).",
        default: '"left"',
        required: false,
    },
    {
        name: "fullWidth",
        type: "boolean",
        description:
            "Si true, la toolbar occupe toute la largeur disponible et les items peuvent s’étendre.",
        default: "false",
        required: false,
    },
    {
        name: "className",
        type: "string",
        description: "Classes CSS supplémentaires appliquées au conteneur principal de la toolbar.",
        default: "—",
        required: false,
    },
];

/* ============================================================================
🧱 MAIN
============================================================================ */

export default function UiToolbar({
    items,
    className,
    align = "left",
    fullWidth = false,
}: UiToolbarProps) {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    return (
        <div
            className={cn(
                "flex items-stretch gap-2",
                fullWidth && "w-full",
                align === "between" && "justify-between",
                align === "right" && "justify-end",
                align === "left" && "justify-start",
                className
            )}
        >
            {items.map((item, idx) => {
                const key = item.key ?? String(idx);
                const stretch = fullWidth && item.fullWidth !== false;

                /* ------------------------------------------------------------
                 BUTTON
                ------------------------------------------------------------ */
                if (item.type === "button") {
                    return (
                        <div key={key} className={cn(stretch && "flex-1")}>
                            <UiActionButton
                                variant={item.variant}
                                size={item.size}
                                onClick={item.onClick}
                                action={item.action}
                                disabled={item.disabled}
                                active={item.active}
                                hint={item.hint}
                                fullWidth={stretch}
                                className={item.className}
                                // text={item.text ? item.text : ""}
                            >
                                {item.label}
                            </UiActionButton>
                        </div>
                    );
                }

                /* ------------------------------------------------------------
                 GROUP
                ------------------------------------------------------------ */
                if (item.type === "group") {
                    return (
                        <div key={key} className={cn(stretch && "flex-1")}>
                            <UiActionButtonGroup
                                buttons={item.buttons}
                                variant={item.variant}
                                size={item.size}
                                fullWidth={stretch}
                                className={item.className}
                            />
                        </div>
                    );
                }

                /* ------------------------------------------------------------
                 DROPDOWN
                ------------------------------------------------------------ */
                if (item.type === "dropdown") {
                    const isOpen = openDropdown === key;

                    return (
                        <div key={key} className={cn("relative", stretch && "flex-1")}>
                            <UiActionButton
                                variant={item.variant ?? "soft"}
                                size={item.size}
                                active={isOpen}
                                fullWidth={stretch}
                                onClick={() => setOpenDropdown(isOpen ? null : key)}
                            >
                                {item.label}
                            </UiActionButton>

                            {isOpen && (
                                <div className="absolute right-0 z-50 mt-2 min-w-45 rounded-2xl bg-[hsl(var(--panel-2)/0.95)] backdrop-blur ring-1 ring-[hsl(var(--ring))] shadow-lg">
                                    <div className="flex flex-col p-1">
                                        {item.items.map((it, i) => (
                                            <UiActionButton
                                                key={it.key ?? i}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    it.onClick?.();
                                                    setOpenDropdown(null);
                                                }}
                                                action={it.action}
                                                disabled={it.disabled}
                                                hint={it.hint}
                                                className="justify-start"
                                            >
                                                {it.label}
                                            </UiActionButton>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
