"use client";

import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function UiMetricCard(props: {
    title: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon?: React.ReactNode;
    right?: React.ReactNode;
    tone?: "default" | "good" | "warn" | "danger" | "theme";
    className?: string;
    children?: React.ReactNode;
}) {
    const toneClass =
        props.tone === "good"
            ? "bg-emerald-400/10 ring-emerald-400/20"
            : props.tone === "warn"
              ? "bg-amber-400/10 ring-amber-400/20"
              : props.tone === "danger"
                ? "bg-rose-400/10 ring-rose-400/20"
                : props.tone === "theme"
                  ? "bg-white/8 ring-white/15"
                  : "bg-black/25 ring-white/10";

    return (
        <div
            className={cn(
                "rounded-[22px] p-4 ring-1",
                "backdrop-blur-md",
                toneClass,
                props.className
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs tracking-[0.22em] text-white/55 uppercase">
                        {props.icon ? <span className="text-base">{props.icon}</span> : null}
                        <span className="truncate">{props.title}</span>
                    </div>

                    <div className="mt-2 text-2xl font-semibold text-white/90">{props.value}</div>

                    {props.hint ? (
                        <div className="mt-1 text-xs text-white/50">{props.hint}</div>
                    ) : null}
                </div>

                {props.right ? <div className="shrink-0">{props.right}</div> : null}
            </div>

            {props.children ? <div className="mt-3">{props.children}</div> : null}
        </div>
    );
}
