// src/components/ui/UiModal.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { ViewportPortal } from "@/components/ViewportPortal";
import { UiAnimatePresence, UiMotionDiv } from "@/components/motion/UiMotion";
import { ActionButton } from "@/components/RpgUi";
import { useUiStore, type UiModalId } from "@/stores/uiStore";
import { useUiSettingsStore, type UiTheme } from "@/stores/uiSettingsStore";
import { UiActionButton } from ".";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type UiModalProps = {
    id: UiModalId;

    eyebrow?: string;
    title?: string;
    subtitle?: string;
    emoji?: string;

    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;

    headerRight?: React.ReactNode;
    footer?: React.ReactNode;

    children: React.ReactNode;
};

function widthClass(maxWidth: UiModalProps["maxWidth"]) {
    if (maxWidth === "sm") return "max-w-sm";
    if (maxWidth === "md") return "max-w-md";
    if (maxWidth === "lg") return "max-w-lg";
    if (maxWidth === "xl") return "max-w-xl";
    if (maxWidth === "2xl") return "max-w-2xl";
    if (maxWidth === "3xl") return "max-w-3xl";
    if (maxWidth === "full") return "max-w-6xl";
    return "max-w-2xl";
}

function themePanelClass(theme: UiTheme) {
    // On reste sobre: variations de matière + ombres, pas de couleurs explicites.
    if (theme === "cyber-ritual") {
        return cn(
            "bg-black/35 ring-white/15",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_40px_rgba(255,255,255,0.06)]"
        );
    }
    if (theme === "forest-sigil") {
        return cn(
            "bg-black/30 ring-white/15",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_14px_60px_rgba(0,0,0,0.45)]"
        );
    }
    if (theme === "ashen-codex") {
        return cn(
            "bg-black/40 ring-white/15",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_18px_70px_rgba(0,0,0,0.55)]"
        );
    }
    if (theme === "winter-noel") {
        return cn(
            "bg-white/6 ring-white/18",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_18px_70px_rgba(0,0,0,0.45)]"
        );
    }
    // classic
    return cn(
        "bg-white/5 ring-white/15",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_18px_70px_rgba(0,0,0,0.55)]"
    );
}

export function UiModal(props: UiModalProps) {
    const {
        id,
        eyebrow,
        title,
        subtitle,
        emoji,
        maxWidth = "2xl",
        closeOnBackdrop = true,
        closeOnEscape = true,
        headerRight,
        footer,
        children,
    } = props;

    const theme = useUiSettingsStore((s) => s.theme);
    const isOpen = useUiStore((s) => s.isModalOpen(id));
    const closeModal = useUiStore((s) => s.closeModal);
    const anyModalOpen = useUiStore((s) => s.anyModalOpen);

    const { modalStack } = useUiStore();

    const panelClass = useMemo(() => themePanelClass(theme), [theme]);

    useEffect(() => {
        const body = document.body;

        // console.log("anyOpenModal", anyModalOpen());

        // aucun modal ouvert → on restaure le body
        if (!anyModalOpen()) {
            body.style.overflow = "";
            body.style.paddingRight = "";
            return;
        }

        // au moins une modal ouverte → on lock
        const prevOverflow = body.style.overflow;
        const prevPaddingRight = body.style.paddingRight;

        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        body.style.overflow = "hidden";
        if (scrollbarWidth > 0) {
            body.style.paddingRight = `${scrollbarWidth}px`;
        }

        // cleanup si le composant démonte pendant qu'une modal est ouverte
        return () => {
            body.style.overflow = prevOverflow;
            body.style.paddingRight = prevPaddingRight;
        };
    }, [anyModalOpen]);

    // ✅ ESC => close
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeModal(id);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, closeOnEscape, closeModal, id]);

    useEffect(() => {
        // console.log("modalStack", modalStack);
    }, [modalStack]);

    const onBackdrop = () => {
        if (!closeOnBackdrop) return;
        closeModal(id);
    };

    return (
        <UiAnimatePresence>
            {isOpen ? (
                <ViewportPortal>
                    {/* Overlay scrollable */}
                    <UiMotionDiv
                        className="fixed inset-0 z-200 bg-black/55 backdrop-blur-[3px] overflow-y-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onMouseDown={onBackdrop}
                    >
                        {/* Wrapper centré + safe viewport height */}
                        <div className="min-h-svh w-full p-4 grid place-items-center">
                            {/* Panel */}
                            <UiMotionDiv
                                className={cn(
                                    "w-full",
                                    widthClass(maxWidth),
                                    "rounded-[28px] ring-1 backdrop-blur-md",
                                    panelClass
                                )}
                                initial={{ y: 16, scale: 0.985, opacity: 0 }}
                                animate={{ y: 0, scale: 1, opacity: 1 }}
                                exit={{ y: 10, scale: 0.985, opacity: 0 }}
                                transition={{ duration: 0.22 }}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                {(eyebrow || title || subtitle || headerRight) && (
                                    <div className="p-5 pb-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                {eyebrow ? (
                                                    <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                                        {eyebrow}
                                                    </div>
                                                ) : null}

                                                {title ? (
                                                    <div className="mt-2 font-uiserif text-lg text-white/70 font-semibold">
                                                        {emoji ? `${emoji} ` : ""}
                                                        {title}
                                                    </div>
                                                ) : null}

                                                {subtitle ? (
                                                    <div className="mt-1 font-uiserif text-sm text-white/60">
                                                        {subtitle}
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {headerRight}
                                                <UiActionButton
                                                    variant="ghost"
                                                    onClick={() => closeModal(id)}
                                                >
                                                    ✖
                                                </UiActionButton>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Body scrollable (le coeur du fix) */}
                                <div className="px-5 pb-5 pt-3 max-h-[calc(100svh-15rem)] overflow-y-auto">
                                    {children}
                                </div>

                                {/* Footer optionnel */}
                                {footer ? (
                                    <div className="px-5 pb-5 pt-0">
                                        <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
                                            {footer}
                                        </div>
                                    </div>
                                ) : null}
                            </UiMotionDiv>
                        </div>
                    </UiMotionDiv>
                </ViewportPortal>
            ) : null}
        </UiAnimatePresence>
    );
}
