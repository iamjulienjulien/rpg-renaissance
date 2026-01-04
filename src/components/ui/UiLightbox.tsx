"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { UiAnimatePresence, UiMotionDiv } from "@/components/motion/UiMotion";
import { ActionButton, Pill } from "@/components/RpgUi";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiLightboxItem = {
    id: string;
    url: string;
    alt?: string;
    caption?: string | null;
    description?: string | null;
    categoryEmoji?: string; // ex: 🌅
    categoryLabel?: string; // ex: Photo initiale
    isCover?: boolean;
};

type Props = {
    open: boolean;
    items: UiLightboxItem[];
    startIndex: number;
    onClose: () => void;
    onIndexChange?: (index: number) => void;
};

export default function UiLightbox({ open, items, startIndex, onClose, onIndexChange }: Props) {
    const [mounted, setMounted] = useState(false);
    const [index, setIndex] = useState(0);

    useEffect(() => setMounted(true), []);

    // (re)sync index à l'ouverture
    useEffect(() => {
        if (!open) return;
        setIndex(Math.max(0, Math.min(startIndex, Math.max(0, items.length - 1))));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, startIndex]);

    // console.log(items);

    const count = items.length;

    const current = useMemo(() => {
        if (!count) return null;
        return items[Math.max(0, Math.min(index, count - 1))] ?? null;
    }, [items, index, count]);

    const prev = () => {
        if (!count) return;
        setIndex((i) => {
            const nextIndex = (i - 1 + count) % count; // ✅ boucle
            onIndexChange?.(nextIndex);
            return nextIndex;
        });
    };

    const next = () => {
        if (!count) return;
        setIndex((i) => {
            const nextIndex = (i + 1) % count; // ✅ boucle
            onIndexChange?.(nextIndex);
            return nextIndex;
        });
    };

    // keyboard
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") prev();
            if (e.key === "ArrowRight") next();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, count]);

    // lock scroll
    useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [open]);

    if (!mounted) return null;
    if (!open || !current) return null;

    console.log("current", current);

    return createPortal(
        <UiAnimatePresence>
            <UiMotionDiv
                className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-[4px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onMouseDown={onClose}
            >
                <UiMotionDiv
                    className={cn("absolute inset-0 p-4", "grid place-items-center")}
                    initial={{ opacity: 0, scale: 0.985, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.985, y: 10 }}
                    transition={{ duration: 0.18 }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {/* container */}
                    <div className="w-full max-w-5xl">
                        {/* top bar */}
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs text-white/70">
                                    <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                                        {current.categoryEmoji ? current.categoryEmoji + " " : null}
                                        {current.categoryLabel ? current.categoryLabel : null}
                                    </span>
                                    {current.isCover ? (
                                        <span>
                                            <span className="text-white/35">•</span>
                                            <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                                                ⭐ Cover
                                            </span>
                                        </span>
                                    ) : null}
                                    <span className="text-white/35">•</span>
                                    <Pill>
                                        {Math.max(1, Math.min(index + 1, count))}/{count}
                                    </Pill>
                                </div>

                                {current.caption ? (
                                    <div className="mt-2 text-sm font-semibold text-white/90">
                                        {current.caption}
                                    </div>
                                ) : null}
                                {current.description ? (
                                    <div className="mt-2 text-xs font-semibold text-white/90">
                                        {current.description}
                                    </div>
                                ) : null}
                            </div>

                            <ActionButton onClick={onClose}>✖</ActionButton>
                        </div>

                        {/* image stage */}
                        <div className="relative overflow-hidden rounded-[28px] bg-black/30 ring-1 ring-white/10">
                            {/* nav buttons */}
                            {count > 1 ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={prev}
                                        className={cn(
                                            "absolute left-3 top-1/2 -translate-y-1/2 z-[2]",
                                            "h-11 w-11 rounded-full",
                                            "bg-black/45 ring-1 ring-white/10 backdrop-blur-md",
                                            "text-white/90 hover:bg-black/55 transition"
                                        )}
                                        aria-label="Photo précédente"
                                    >
                                        ◀
                                    </button>

                                    <button
                                        type="button"
                                        onClick={next}
                                        className={cn(
                                            "absolute right-3 top-1/2 -translate-y-1/2 z-[2]",
                                            "h-11 w-11 rounded-full",
                                            "bg-black/45 ring-1 ring-white/10 backdrop-blur-md",
                                            "text-white/90 hover:bg-black/55 transition"
                                        )}
                                        aria-label="Photo suivante"
                                    >
                                        ▶
                                    </button>
                                </>
                            ) : null}

                            {/* image */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={current.url}
                                alt={current.alt ?? "Photo"}
                                className="block w-full max-h-[78vh] object-contain"
                                draggable={false}
                            />
                        </div>

                        {/* hint */}
                        {count > 1 ? (
                            <div className="mt-3 text-center text-[11px] text-white/45">
                                ← → pour naviguer · Esc pour fermer
                            </div>
                        ) : (
                            <div className="mt-3 text-center text-[11px] text-white/45">
                                Esc pour fermer
                            </div>
                        )}
                    </div>
                </UiMotionDiv>
            </UiMotionDiv>
        </UiAnimatePresence>,
        document.body
    );
}
