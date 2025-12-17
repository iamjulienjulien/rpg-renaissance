"use client";

import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function Panel({
    title,
    subtitle,
    emoji,
    right,
    children,
}: {
    title: string;
    subtitle?: string;
    emoji?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl bg-black/25 p-5 ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-[11px] tracking-[0.18em] text-white/55">
                        {emoji ? `${emoji} ` : ""}
                        {title.toUpperCase()}
                    </div>
                    {subtitle ? <div className="mt-2 text-sm text-white/60">{subtitle}</div> : null}
                </div>
                {right ? <div className="shrink-0">{right}</div> : null}
            </div>

            <div className="mt-4">{children}</div>
        </div>
    );
}

export function ActionButton(props: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "soft" | "solid";
    disabled?: boolean;
}) {
    const disabled = !!props.disabled;

    return (
        <button
            onClick={disabled ? undefined : props.onClick}
            disabled={disabled}
            className={cn(
                "rounded-2xl px-4 py-2 text-sm ring-1 transition",
                props.variant === "solid"
                    ? "bg-white/10 text-white ring-white/15 hover:bg-white/15"
                    : "bg-white/5 text-white/80 ring-white/10 hover:bg-white/10",
                disabled && "opacity-60 pointer-events-none"
            )}
        >
            {props.children}
        </button>
    );
}

export function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60 ring-1 ring-white/10">
            {children}
        </span>
    );
}
