"use client";

import React, { useState } from "react";
import UIActionButton from "@/components/ui/UiActionButton";
import UIActionButtonGroup, {
    type UIActionButtonGroupButton,
    type UIActionButtonGroupProps,
} from "@/components/ui/UiActionButtonGroup";
import { type UIActionButtonProps } from "@/components/ui/UiActionButton";
import { type UiAction } from "@/components/RpgUi";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UIToolbarItem =
    | {
          type: "button";
          key?: string;
          label: React.ReactNode;
          onClick?: () => void;
          action?: UiAction;
          variant?: UIActionButtonProps["variant"];
          size?: UIActionButtonProps["size"];
          disabled?: boolean;
          active?: boolean;
          hint?: string;
          fullWidth?: boolean;
          className?: string;
      }
    | {
          type: "group";
          key?: string;
          variant?: UIActionButtonGroupProps["variant"];
          size?: UIActionButtonGroupProps["size"];
          fullWidth?: boolean;
          buttons: UIActionButtonGroupButton[];
          className?: string;
      }
    | {
          type: "dropdown";
          key?: string;
          label: React.ReactNode;
          variant?: UIActionButtonProps["variant"];
          size?: UIActionButtonProps["size"];
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

export type UIToolbarProps = {
    items: UIToolbarItem[];
    className?: string;
    align?: "left" | "right" | "between";

    /** Toolbar en pleine largeur, items répartis */
    fullWidth?: boolean;
};

/* ============================================================================
🧱 MAIN
============================================================================ */

export default function UIToolbar({
    items,
    className,
    align = "left",
    fullWidth = false,
}: UIToolbarProps) {
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
                            <UIActionButton
                                variant={item.variant}
                                size={item.size}
                                onClick={item.onClick}
                                action={item.action}
                                disabled={item.disabled}
                                active={item.active}
                                hint={item.hint}
                                fullWidth={stretch}
                                className={item.className}
                            >
                                {item.label}
                            </UIActionButton>
                        </div>
                    );
                }

                /* ------------------------------------------------------------
                 GROUP
                ------------------------------------------------------------ */
                if (item.type === "group") {
                    return (
                        <div key={key} className={cn(stretch && "flex-1")}>
                            <UIActionButtonGroup
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
                            <UIActionButton
                                variant={item.variant ?? "soft"}
                                size={item.size}
                                active={isOpen}
                                fullWidth={stretch}
                                onClick={() => setOpenDropdown(isOpen ? null : key)}
                            >
                                {item.label}
                            </UIActionButton>

                            {isOpen && (
                                <div className="absolute right-0 z-50 mt-2 min-w-[180px] rounded-2xl bg-[hsl(var(--panel-2)/0.95)] backdrop-blur ring-1 ring-[hsl(var(--ring))] shadow-lg">
                                    <div className="flex flex-col p-1">
                                        {item.items.map((it, i) => (
                                            <UIActionButton
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
                                            </UIActionButton>
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
