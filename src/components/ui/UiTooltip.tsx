"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type Props = {
    content: React.ReactNode;
    children: React.ReactNode;
    side?: "top" | "bottom";
    align?: "start" | "center" | "end";
    className?: string;

    maxWidthClassName?: string;
    widthClassName?: string;
    singleLine?: boolean;
    disabled?: boolean;

    /** (optionnel) distance trigger → tooltip */
    offsetPx?: number;
};

type Pos = { top: number; left: number };

export default function UiTooltip({
    content,
    children,
    side = "top",
    align = "center",
    className,
    maxWidthClassName,
    widthClassName,
    singleLine = false,
    disabled,
    offsetPx = 8,
}: Props) {
    const triggerRef = useRef<HTMLSpanElement | null>(null);
    const tipRef = useRef<HTMLDivElement | null>(null);

    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<Pos>({ top: 0, left: 0 });

    useEffect(() => setMounted(true), []);

    const computePos = () => {
        const trigger = triggerRef.current;
        const tip = tipRef.current;
        if (!trigger || !tip) return;

        const t = trigger.getBoundingClientRect();
        const tipRect = tip.getBoundingClientRect();

        // vertical
        const top = side === "bottom" ? t.bottom + offsetPx : t.top - tipRect.height - offsetPx;

        // horizontal (align)
        let left = 0;
        if (align === "start") left = t.left;
        else if (align === "end") left = t.right - tipRect.width;
        else left = t.left + t.width / 2 - tipRect.width / 2;

        // clamp dans le viewport (petite marge)
        const margin = 8;
        const maxLeft = window.innerWidth - tipRect.width - margin;
        left = Math.min(Math.max(left, margin), Math.max(maxLeft, margin));

        const maxTop = window.innerHeight - tipRect.height - margin;
        const clampedTop = Math.min(Math.max(top, margin), Math.max(maxTop, margin));

        setPos({ top: clampedTop, left });
    };

    // recompute quand on ouvre + quand content change
    useEffect(() => {
        if (!open) return;

        // 2 passes: la 1ère pour monter, la 2ème pour avoir la vraie taille
        const raf1 = requestAnimationFrame(() => {
            computePos();
            const raf2 = requestAnimationFrame(() => computePos());
            return () => cancelAnimationFrame(raf2);
        });

        return () => cancelAnimationFrame(raf1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, side, align, content]);

    // reposition sur scroll/resize tant que open
    useEffect(() => {
        if (!open) return;

        const onMove = () => computePos();
        window.addEventListener("scroll", onMove, true);
        window.addEventListener("resize", onMove);

        return () => {
            window.removeEventListener("scroll", onMove, true);
            window.removeEventListener("resize", onMove);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const tip = useMemo(() => {
        if (!mounted || !open || disabled) return null;

        return createPortal(
            <div
                ref={tipRef}
                className={cn(
                    "pointer-events-none fixed z-[120]",
                    "opacity-0 scale-[0.98] translate-y-[-2px]",
                    "transition duration-150 ease-out",
                    "will-change-transform"
                )}
                style={{
                    top: pos.top,
                    left: pos.left,
                    opacity: 1,
                    transform: "translateY(0) scale(1)",
                }}
                role="tooltip"
            >
                <div
                    className={cn(
                        "rounded-2xl bg-black/80 px-3 py-2",
                        "text-[12px] leading-snug text-white/90 text-centers",
                        "ring-1 ring-white/10 backdrop-blur-md shadow-xl",
                        widthClassName,
                        maxWidthClassName ?? "max-w-[240px]",
                        singleLine && "whitespace-nowrap truncate"
                    )}
                >
                    {content}
                </div>
            </div>,
            document.body
        );
    }, [
        mounted,
        open,
        disabled,
        pos.top,
        pos.left,
        content,
        widthClassName,
        maxWidthClassName,
        singleLine,
    ]);

    if (disabled) return <>{children}</>;

    return (
        <>
            <span
                ref={triggerRef}
                // className={cn("relative inline-flex", className)}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
            >
                {children}
            </span>
            {tip}
        </>
    );
}
