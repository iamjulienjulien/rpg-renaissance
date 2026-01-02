"use client";

import React from "react";

export function InlineNotice(p: {
    tone?: "info" | "warning" | "error" | "success";
    children: React.ReactNode;
}) {
    const tone = p.tone ?? "info";
    const styles =
        tone === "error"
            ? "bg-red-500/10 text-red-200 ring-red-400/20"
            : tone === "warning"
              ? "bg-yellow-500/10 text-yellow-200 ring-yellow-400/20"
              : tone === "success"
                ? "bg-emerald-500/10 text-emerald-200 ring-emerald-400/20"
                : "bg-black/30 text-white/70 ring-white/10";

    return (
        <div className={["rounded-2xl p-4 rpg-text-sm ring-1", styles].join(" ")}>{p.children}</div>
    );
}

export function EmptyState(p: { emoji?: string; title: string; subtitle?: string }) {
    return (
        <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
            <div className="text-lg text-white/90 font-semibold">
                {p.emoji ? `${p.emoji} ` : ""}
                {p.title}
            </div>
            {p.subtitle ? <div className="mt-2 text-sm text-white/65">{p.subtitle}</div> : null}
        </div>
    );
}
