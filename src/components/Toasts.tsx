"use client";

import React, { useEffect } from "react";
import { useToastStore } from "@/stores/toastStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function toneEmoji(tone: string) {
    if (tone === "success") return "✅";
    if (tone === "error") return "⛔";
    if (tone === "warning") return "⚠️";
    return "💬";
}

function toneRing(tone: string) {
    if (tone === "success") return "ring-emerald-400/20";
    if (tone === "error") return "ring-rose-400/25";
    if (tone === "warning") return "ring-amber-400/25";
    return "ring-white/15";
}

function toneGlow(tone: string) {
    if (tone === "success")
        return "bg-[radial-gradient(200px_120px_at_20%_20%,rgba(16,185,129,0.25),transparent_65%)]";
    if (tone === "error")
        return "bg-[radial-gradient(200px_120px_at_20%_20%,rgba(244,63,94,0.25),transparent_65%)]";
    if (tone === "warning")
        return "bg-[radial-gradient(200px_120px_at_20%_20%,rgba(245,158,11,0.22),transparent_65%)]";
    return "bg-[radial-gradient(220px_130px_at_20%_20%,rgba(255,255,255,0.12),transparent_70%)]";
}

export default function Toasts() {
    const toasts = useToastStore((s) => s.toasts);
    const dismiss = useToastStore((s) => s.dismiss);

    useEffect(() => {
        if (toasts.length === 0) return;

        const timers = toasts.map((t) => window.setTimeout(() => dismiss(t.id), t.durationMs));

        return () => {
            for (const tm of timers) window.clearTimeout(tm);
        };
    }, [toasts, dismiss]);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed right-4 top-4 z-[60] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cn(
                        "relative overflow-hidden rounded-3xl bg-black/70 p-4 ring-1 backdrop-blur-xl",
                        toneRing(t.tone)
                    )}
                >
                    <div
                        className={cn(
                            "pointer-events-none absolute inset-0 opacity-80",
                            toneGlow(t.tone)
                        )}
                    />

                    <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <div className="text-lg" aria-hidden>
                                    {toneEmoji(t.tone)}
                                </div>
                                <div className="truncate rpg-text-sm font-semibold text-white/90">
                                    {t.title}
                                </div>
                            </div>

                            {t.message ? (
                                <div className="mt-2 rpg-text-sm text-white/70">{t.message}</div>
                            ) : null}
                        </div>

                        <button
                            onClick={() => dismiss(t.id)}
                            className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-white/10"
                        >
                            ✖
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
