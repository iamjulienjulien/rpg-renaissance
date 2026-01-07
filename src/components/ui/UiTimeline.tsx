"use client";

import * as React from "react";

function cn(...classes: Array<any>) {
    return classes.filter(Boolean).join(" ");
}

export type UiTimelineDensity = "compact" | "comfortable";
export type UiTimelineOrder = "asc" | "desc";

export type UiTimelineTone = "neutral" | "accent" | "success" | "danger" | "warning";

export type UiTimelineItem = {
    id: string;

    /** Date/heure ou label court (ex: "Aujourd’hui", "10:42") */
    time?: React.ReactNode;

    /** Petit label optionnel (ex: "Jour 3", "Étape 2") */
    meta?: React.ReactNode;

    /** Emoji ou icône principale (ex: 📓 / 🎭 / 🏁) */
    icon?: React.ReactNode;

    /** Titre court (ex: "Décision prise", "MJ", "Message") */
    title?: React.ReactNode;

    /** Sous-titre court */
    subtitle?: React.ReactNode;

    /** Contenu libre (texte, cartes, bulles, etc.) */
    content?: React.ReactNode;

    /** Alignement visuel (si tu veux différencier “toi” vs “MJ”) */
    side?: "left" | "right" | "full";

    /** Ton visuel */
    tone?: UiTimelineTone;

    /** Marqueur d’importance (affiche un halo + point plus visible) */
    isHighlight?: boolean;

    /** Désactivé (ex: éléments historiques non pertinents) */
    disabled?: boolean;

    /** Actions à droite dans l’entête d’item (ex: bouton copier) */
    rightSlot?: React.ReactNode;

    /** ClassName optionnel par item */
    className?: string;
};

export type UiTimelineProps = {
    items: UiTimelineItem[];

    /** ordre chronologique */
    order?: UiTimelineOrder;

    /** densité verticale */
    density?: UiTimelineDensity;

    /** afficher la colonne “time” */
    showTime?: boolean;

    /** afficher les traits de liaison */
    showRail?: boolean;

    /** largeur max */
    className?: string;

    /** rendu custom du header d’un item (si tu veux) */
    renderHeader?: (item: UiTimelineItem) => React.ReactNode;

    /** rendu custom du contenu d’un item (si tu veux) */
    renderContent?: (item: UiTimelineItem) => React.ReactNode;
};

function toneStyles(tone: UiTimelineTone, highlight: boolean) {
    // pas de couleurs hardcodées trop agressives, on reste dans l’univers UI existant
    if (tone === "accent") {
        return {
            dot: "bg-[hsl(var(--accent)/0.90)] ring-[hsl(var(--accent)/0.28)]",
            glow: highlight
                ? "bg-[radial-gradient(260px_160px_at_20%_20%,hsl(var(--accent)/0.16),transparent_65%)]"
                : "bg-[radial-gradient(220px_120px_at_20%_20%,hsl(var(--accent)/0.10),transparent_70%)]",
            ring: "ring-white/10",
        };
    }

    if (tone === "success") {
        return {
            dot: "bg-emerald-400 ring-emerald-400/25",
            glow: highlight
                ? "bg-[radial-gradient(260px_160px_at_20%_20%,rgba(16,185,129,0.18),transparent_65%)]"
                : "bg-[radial-gradient(220px_120px_at_20%_20%,rgba(16,185,129,0.12),transparent_70%)]",
            ring: "ring-white/10",
        };
    }

    if (tone === "danger") {
        return {
            dot: "bg-rose-400 ring-rose-400/25",
            glow: highlight
                ? "bg-[radial-gradient(260px_160px_at_20%_20%,rgba(244,63,94,0.18),transparent_65%)]"
                : "bg-[radial-gradient(220px_120px_at_20%_20%,rgba(244,63,94,0.12),transparent_70%)]",
            ring: "ring-white/10",
        };
    }

    if (tone === "warning") {
        return {
            dot: "bg-amber-300 ring-amber-300/25",
            glow: highlight
                ? "bg-[radial-gradient(260px_160px_at_20%_20%,rgba(251,191,36,0.18),transparent_65%)]"
                : "bg-[radial-gradient(220px_120px_at_20%_20%,rgba(251,191,36,0.12),transparent_70%)]",
            ring: "ring-white/10",
        };
    }

    // neutral
    return {
        dot: "bg-white/60 ring-white/15",
        glow: highlight
            ? "bg-[radial-gradient(260px_160px_at_20%_20%,rgba(255,255,255,0.12),transparent_65%)]"
            : "bg-[radial-gradient(220px_120px_at_20%_20%,rgba(255,255,255,0.08),transparent_70%)]",
        ring: "ring-white/10",
    };
}

export function UiTimeline({
    items,
    order = "asc",
    density = "comfortable",
    showTime = true,
    showRail = true,
    className,
    renderHeader,
    renderContent,
}: UiTimelineProps) {
    const list = React.useMemo(() => {
        const arr = [...items];
        if (order === "desc") arr.reverse();
        return arr;
    }, [items, order]);

    const padY = density === "compact" ? "py-2.5" : "py-4";
    const gapY = density === "compact" ? "gap-3" : "gap-4";

    return (
        <div className={cn("w-full", className)}>
            <ol className={cn("flex flex-col", gapY)}>
                {list.map((item, idx) => {
                    const side = item.side ?? "full";
                    const tone = item.tone ?? "neutral";
                    const styles = toneStyles(tone, !!item.isHighlight);

                    const isFirst = idx === 0;
                    const isLast = idx === list.length - 1;

                    return (
                        <li
                            key={item.id}
                            className={cn(
                                "relative",
                                item.disabled && "opacity-60",
                                side === "right" && "self-end",
                                side === "left" && "self-start",
                                side === "full" && "self-stretch",
                                item.className
                            )}
                        >
                            <div className="grid grid-cols-[66px_24px_1fr] items-stretch">
                                {/* Time column */}
                                <div className={cn("pr-3 text-right", !showTime && "opacity-0")}>
                                    {item.time ? (
                                        <div className="text-xs text-white/55">{item.time}</div>
                                    ) : (
                                        <div className="text-xs text-white/25"> </div>
                                    )}
                                    {item.meta ? (
                                        <div className="mt-1 text-[11px] text-white/35">
                                            {item.meta}
                                        </div>
                                    ) : null}
                                </div>

                                {/* Rail + dot */}
                                <div className="relative flex justify-center">
                                    {showRail ? (
                                        <>
                                            {/* upper segment */}
                                            <div
                                                className={cn(
                                                    "absolute left-1/2 top-0 -translate-x-1/2 w-px bg-white/10",
                                                    isFirst ? "h-1/2 opacity-0" : "h-1/2"
                                                )}
                                            />
                                            {/* lower segment */}
                                            <div
                                                className={cn(
                                                    "absolute left-1/2 bottom-0 -translate-x-1/2 w-px bg-white/10",
                                                    isLast ? "h-1/2 opacity-0" : "h-1/2"
                                                )}
                                            />
                                        </>
                                    ) : null}

                                    <div
                                        className={cn(
                                            "relative mt-[2px] h-3.5 w-3.5 rounded-full ring-2",
                                            styles.dot
                                        )}
                                    />
                                </div>

                                {/* Content card */}
                                <div className={cn("min-w-0", side !== "full" && "max-w-[520px]")}>
                                    <div
                                        className={cn(
                                            "relative overflow-hidden rounded-[22px] ring-1 backdrop-blur-md",
                                            "bg-black/25",
                                            styles.ring
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "pointer-events-none absolute inset-0 opacity-70",
                                                styles.glow
                                            )}
                                        />

                                        <div className={cn("relative px-4", padY)}>
                                            {/* Header */}
                                            {renderHeader ? (
                                                renderHeader(item)
                                            ) : item.title ||
                                              item.subtitle ||
                                              item.icon ||
                                              item.rightSlot ? (
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            {item.icon ? (
                                                                <div className="shrink-0 text-lg leading-none">
                                                                    {item.icon}
                                                                </div>
                                                            ) : null}

                                                            {item.title ? (
                                                                <div className="text-sm font-semibold text-white/90">
                                                                    {item.title}
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        {item.subtitle ? (
                                                            <div className="mt-1 text-xs text-white/55">
                                                                {item.subtitle}
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    {item.rightSlot ? (
                                                        <div className="shrink-0">
                                                            {item.rightSlot}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            {/* Body */}
                                            {renderContent ? (
                                                <div
                                                    className={cn(
                                                        (item.title || item.subtitle) && "mt-3"
                                                    )}
                                                >
                                                    {renderContent(item)}
                                                </div>
                                            ) : item.content ? (
                                                <div
                                                    className={cn(
                                                        (item.title || item.subtitle) && "mt-3"
                                                    )}
                                                >
                                                    <div className="text-sm text-white/80 leading-relaxed">
                                                        {item.content}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
