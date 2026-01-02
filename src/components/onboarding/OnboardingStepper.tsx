"use client";

import React from "react";
import { Pill } from "@/components/RpgUi";

type Step = {
    key: string;
    label: string;
    emoji?: string;
};

export function OnboardingStepper(p: { steps: Step[]; activeKey: string; className?: string }) {
    const idx = Math.max(
        0,
        p.steps.findIndex((s) => s.key === p.activeKey)
    );
    const progress = p.steps.length <= 1 ? 1 : (idx + 1) / p.steps.length;

    return (
        <div
            className={["rounded-[28px] bg-black/25 p-5 ring-1 ring-white/10", p.className]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                    🧭 Onboarding
                </div>

                <div className="flex flex-wrap gap-2">
                    <Pill>
                        Étape {idx + 1}/{p.steps.length}
                    </Pill>
                    <Pill>{Math.round(progress * 100)}%</Pill>
                </div>
            </div>

            <div className="mt-4 h-2 rounded-full bg-black/30 ring-1 ring-white/10 overflow-hidden">
                <div className="h-full bg-white/20" style={{ width: `${progress * 100}%` }} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {p.steps.map((s, i) => {
                    const active = s.key === p.activeKey;
                    const done = i < idx;

                    return (
                        <span
                            key={s.key}
                            className={[
                                "px-3 py-1 rounded-full text-xs ring-1",
                                active
                                    ? "bg-black/55 text-white/90 ring-white/25"
                                    : done
                                      ? "bg-black/35 text-white/70 ring-white/15"
                                      : "bg-black/20 text-white/55 ring-white/10",
                            ].join(" ")}
                        >
                            {done ? "✅ " : active ? "➡️ " : "• "}
                            {s.emoji ? `${s.emoji} ` : ""}
                            {s.label}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
