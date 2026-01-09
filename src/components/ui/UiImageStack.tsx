// src/components/ui/UiImageStack.tsx
"use client";

import React, { useMemo } from "react";
import UiImage, { type UiImageFilter, type UiImageThumbnail, type UiImageRadius } from "./UiImage";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UiImageStackItem = {
    id?: string;
    src: string;
    alt: string;
    /** Optional per-item customizations */
    filter?: UiImageFilter;
    thumbnail?: UiImageThumbnail;
};

export type UiImageStackSize = "xs" | "sm" | "md" | "lg" | "xl";

export type UiImageStackShape = "square" | "circle";

export type UiImageStackProps = {
    items: UiImageStackItem[];

    /** How many thumbnails to actually show (rest goes to +N) */
    maxVisible?: number; // default 3

    /** Visual */
    size?: UiImageStackSize; // default "md"
    shape?: UiImageStackShape; // default "square"
    radius?: UiImageRadius; // default depends on shape
    thumbnail?: UiImageThumbnail; // default "soft"
    filter?: UiImageFilter; // default "soft"
    border?: "none" | "subtle" | "solid" | "strong"; // forwarded to UiImage
    shadow?: boolean;
    overlap?: number; // px, default depends on size
    reversed?: boolean; // show last on top

    /** Layout */
    className?: string;
    itemClassName?: string;

    /** Badge */
    showCountBadge?: boolean; // default true
    badgeClassName?: string;

    /** Actions */
    onClick?: () => void;
    onItemClick?: (item: UiImageStackItem, index: number) => void;
    ariaLabel?: string;
};

const sizePx: Record<UiImageStackSize, number> = {
    xs: 28,
    sm: 34,
    md: 42,
    lg: 52,
    xl: 64,
};

const defaultOverlap: Record<UiImageStackSize, number> = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
};

/* ============================================================================
🧩 COMPONENT
============================================================================ */

export default function UiImageStack({
    items,
    maxVisible = 3,

    size = "md",
    shape = "square",
    radius,
    thumbnail = "soft",
    filter = "soft",
    border = "subtle",
    shadow = true,
    overlap,
    reversed = false,

    className,
    itemClassName,

    showCountBadge = true,
    badgeClassName,

    onClick,
    onItemClick,
    ariaLabel,
}: UiImageStackProps) {
    const px = sizePx[size];
    const ov = typeof overlap === "number" ? overlap : defaultOverlap[size];
    const r: UiImageRadius = radius ?? (shape === "circle" ? "full" : size === "xs" ? "lg" : "2xl");

    const safeItems = Array.isArray(items) ? items.filter((x) => x?.src) : [];

    const { visible, remaining } = useMemo(() => {
        const list = reversed ? [...safeItems].reverse() : safeItems;
        const v = list.slice(0, Math.max(0, maxVisible));
        const rem = Math.max(0, list.length - v.length);
        return { visible: v, remaining: rem };
    }, [safeItems, maxVisible, reversed]);

    const clickable = typeof onClick === "function";

    return (
        <div
            aria-label={ariaLabel}
            className={cn(
                "flex items-center",
                clickable && "cursor-pointer select-none",
                className
            )}
            onClick={onClick}
        >
            <div className="relative flex items-center">
                {visible.map((it, idx) => {
                    const key = it.id ?? `${it.src}-${idx}`;
                    const z = 50 + idx; // stable stacking
                    const isFirst = idx === 0;

                    return (
                        <div
                            key={key}
                            className={cn("relative", !isFirst && `-ml-[${ov}px]`, itemClassName)}
                            style={{
                                marginLeft: idx === 0 ? 0 : -ov,
                                zIndex: z,
                                width: px,
                                height: px,
                            }}
                            onClick={(e) => {
                                if (!onItemClick) return;
                                e.stopPropagation();
                                onItemClick(it, idx);
                            }}
                        >
                            <UiImage
                                src={it.src}
                                alt={it.alt}
                                aspect="auto"
                                useNextImage
                                radius={r}
                                thumbnail={it.thumbnail ?? thumbnail}
                                filter={it.filter ?? filter}
                                border={border as any}
                                shadow={shadow}
                                className={cn(
                                    "h-full w-full",
                                    shape === "circle" && "rounded-full"
                                )}
                            />
                        </div>
                    );
                })}

                {showCountBadge && remaining > 0 ? (
                    <div
                        className={cn(
                            "relative grid place-items-center",
                            "text-[11px] font-semibold text-white/85",
                            "bg-black/55 ring-1 ring-white/15 backdrop-blur",
                            shadow &&
                                "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_14px_30px_rgba(0,0,0,0.45)]",
                            badgeClassName
                        )}
                        style={{
                            marginLeft: visible.length === 0 ? 0 : -ov,
                            width: px,
                            height: px,
                            borderRadius: shape === "circle" ? 9999 : 18,
                            zIndex: 999,
                        }}
                        title={`${remaining} de plus`}
                    >
                        +{remaining}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

/* ============================================================================
✨ EXAMPLES

<UiImageStack
  items={[
    { src: p1, alt: "Portrait 1" },
    { src: p2, alt: "Portrait 2" },
    { src: p3, alt: "Portrait 3" },
    { src: p4, alt: "Portrait 4" },
  ]}
  maxVisible={3}
  size="md"
  shape="square"
  thumbnail="soft"
  filter="soft"
  onClick={() => setOpen(true)}
/>

<UiImageStack
  items={avatars}
  size="lg"
  shape="circle"
  filter="glow"
  thumbnail="glass"
  reversed
  onItemClick={(it) => console.log(it)}
/>

============================================================================ */
