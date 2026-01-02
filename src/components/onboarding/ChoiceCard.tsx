"use client";

import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function ChoiceCard(p: {
    title: string;
    subtitle?: string | null;
    metaRight?: React.ReactNode;
    selected?: boolean;
    onClick?: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            disabled={p.disabled}
            onClick={p.onClick}
            className={cn(
                "w-full text-left rounded-2xl p-4 ring-1 transition-colors",
                p.selected
                    ? "bg-black/60 ring-white/25"
                    : "bg-black/25 ring-white/10 hover:bg-black/35",
                p.disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-white/90 font-semibold">
                        {p.selected ? "✅ " : "⬜ "}
                        {p.title}
                    </div>
                    {p.subtitle ? (
                        <div className="mt-1 text-sm text-white/65">{p.subtitle}</div>
                    ) : null}
                </div>

                {p.metaRight ? <div className="shrink-0">{p.metaRight}</div> : null}
            </div>
        </button>
    );
}
