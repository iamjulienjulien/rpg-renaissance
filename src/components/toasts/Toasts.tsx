// src/components/toasts/Toasts.tsx
"use client";

import React from "react";
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

function splitMessageAndPayload(message?: string) {
    const raw = message ?? "";
    const marker = "__PAYLOAD__";
    const idx = raw.indexOf(marker);
    if (idx === -1) return { text: raw, payload: null as any };

    const text = raw.slice(0, idx).trim();
    const json = raw.slice(idx + marker.length).trim();

    try {
        return { text, payload: json ? JSON.parse(json) : null };
    } catch {
        return { text, payload: null };
    }
}

function RewardChip(props: { children: React.ReactNode; tone?: "emerald" | "violet" | "amber" }) {
    const t = props.tone ?? "emerald";
    const map: Record<string, string> = {
        emerald: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/20",
        violet: "bg-violet-400/10 text-violet-200 ring-violet-400/20",
        amber: "bg-amber-400/10 text-amber-200 ring-amber-400/20",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1",
                map[t]
            )}
        >
            {props.children}
        </span>
    );
}

function AchievementToastBody(props: { title: string; message?: string; payload: any }) {
    const { text } = splitMessageAndPayload(props.message);
    const p = props.payload ?? {};
    const ach = p?.achievement ?? null;
    const rewards = Array.isArray(p?.rewards) ? p.rewards : [];

    const renown = rewards.find((r: any) => r?.type === "renown");
    const badges = rewards.filter((r: any) => r?.type === "badge");

    return (
        <div className="mt-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs tracking-[0.22em] uppercase text-white/45">
                        Éclat débloqué
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-white/90">
                        {ach?.icon ? `${ach.icon} ` : ""}
                        {ach?.name ?? props.title}
                    </div>
                </div>

                <div className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-xs text-white/70 ring-1 ring-white/10">
                    ✨
                </div>
            </div>

            {text ? <div className="mt-2 rpg-text-sm text-white/70">{text}</div> : null}

            {rewards.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {renown?.value ? (
                        <RewardChip tone="emerald">🏅 +{Number(renown.value)} renown</RewardChip>
                    ) : null}
                    {badges.map((b: any) => (
                        <RewardChip key={String(b.code ?? Math.random())} tone="violet">
                            🏷️ badge: {String(b.code)}
                        </RewardChip>
                    ))}
                    {rewards.some((r: any) => r?.type === "title") ? (
                        <RewardChip tone="amber">👑 nouveau titre</RewardChip>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

export default function Toasts() {
    const toasts = useToastStore((s) => s.toasts);
    const dismiss = useToastStore((s) => s.dismiss);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed right-4 top-4 z-[60] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2">
            {toasts.map((t) => {
                const { text, payload } = splitMessageAndPayload(t.message);
                const isAchievement = !!payload?.achievement;

                return (
                    <div
                        key={t.id}
                        className={cn(
                            "relative overflow-hidden rounded-3xl bg-black/70 p-4 ring-1 backdrop-blur-xl",
                            toneRing(t.tone),
                            isAchievement ? "ring-emerald-400/25" : null
                        )}
                    >
                        <div
                            className={cn(
                                "pointer-events-none absolute inset-0 opacity-80",
                                isAchievement
                                    ? "bg-[radial-gradient(240px_140px_at_20%_20%,rgba(16,185,129,0.28),transparent_65%)]"
                                    : toneGlow(t.tone)
                            )}
                        />

                        <div className="relative flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="text-lg" aria-hidden>
                                        {isAchievement ? "✨" : toneEmoji(t.tone)}
                                    </div>
                                    <div className="truncate rpg-text-sm font-semibold text-white/90">
                                        {t.title}
                                    </div>
                                </div>

                                {!isAchievement && text ? (
                                    <div className="mt-2 rpg-text-sm text-white/70">{text}</div>
                                ) : null}

                                {isAchievement ? (
                                    <AchievementToastBody
                                        title={t.title}
                                        message={t.message}
                                        payload={payload}
                                    />
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
                );
            })}
        </div>
    );
}
