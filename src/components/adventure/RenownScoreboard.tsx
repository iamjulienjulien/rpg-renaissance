"use client";

import React from "react";
import { useGameStore } from "@/stores/gameStore";
import UiProgress from "../ui/UiProgress";

export default function RenownScoreboard() {
    const renown = useGameStore((s) => s.renown);
    const renownLoading = useGameStore((s) => s.renownLoading);

    console.log("renown", renown);

    const value = Math.max(0, renown?.value ?? 0);
    const level = renown?.level ?? 1;

    const into = value % 100;
    const pct = Math.max(0, Math.min(100, Math.round((into / 100) * 100)));

    return (
        <div className="w-[240px] rounded-2xl bg-black/25 px-3 py-2 ring-1 ring-white/10 m-auto">
            <div className="flex items-center justify-between">
                <div className="text-xs text-white/60">🏆 Renommée</div>
                <div className="text-xs text-white/75">
                    {renownLoading ? "⏳" : renown ? `Niv. ${level}` : "—"}
                </div>
            </div>

            {renown ? (
                <>
                    {/* <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                        <div
                            className="h-full rounded-full bg-white/25 transition-[width] duration-500"
                            style={{ width: `${pct}%` }}
                        />
                    </div> */}
                    <UiProgress pct={pct} className="mt-3" />

                    <div className="mt-4 flex items-center justify-between text-[11px] text-white/55">
                        <span>✨ {into}/100</span>
                        <span className="text-white/45">total {value}</span>
                    </div>
                </>
            ) : (
                <div className="mt-2 text-[11px] text-white/45">Aucune donnée (encore) 👀</div>
            )}
        </div>
    );
}
