"use client";

import { CurrentCharacterPill } from "@/helpers/adventure";
import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type MasterCardProps = {
    title?: string;
    emoji?: string;
    badgeText?: string; // ex: "Maître du jeu"
    badgeEmoji?: string;
    rightSlot?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
};

export default function MasterCard({
    title = "Ordre de mission",
    emoji = "🎯",
    badgeText,
    badgeEmoji,
    rightSlot,
    children,
    className,
}: MasterCardProps) {
    const hasHeader = Boolean(title || rightSlot || badgeText);

    return (
        <div
            className={cn(
                // 🌈 Bordure uniquement
                "rounded-[22px] p-[1.5px]",
                "bg-gradient-to-br",
                "from-cyan-400 via-fuchsia-500 to-emerald-400",
                className
            )}
        >
            {/* 🖤 Carte interne */}
            <div className="rounded-[20px] bg-black/90 backdrop-blur px-5 py-4 ring-1 ring-white/10">
                {hasHeader && (
                    <div className="flex items-start justify-between gap-3">
                        <div className="w-full">
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-white/90 font-semibold">
                                    {emoji} {title}
                                </span>

                                {badgeText ? (
                                    <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/80 ring-1 ring-white/15">
                                        {badgeEmoji} {badgeText}
                                    </span>
                                ) : (
                                    <CurrentCharacterPill />
                                )}
                            </div>
                        </div>

                        {rightSlot ? <div>{rightSlot}</div> : null}
                    </div>
                )}

                <div className={cn(hasHeader ? "mt-4" : undefined)}>{children}</div>
            </div>
        </div>
    );
}
