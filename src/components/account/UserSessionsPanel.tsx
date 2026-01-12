"use client";

import React, { useEffect } from "react";
import { UiPanel } from "../ui";
import { useGameStore } from "@/stores/gameStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function UserSessionsPanel() {
    const currentPlayer = useGameStore((s) => s.currentPlayer);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);

    const [loading, setLoading] = React.useState(false);

    useEffect(() => {
        // best-effort: si /account arrive avant le bootstrap complet
        if (!currentPlayer) {
            setLoading(true);
            void getCurrentPlayer()
                .catch(() => null)
                .finally(() => setLoading(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sessions = (currentPlayer as any)?.sessions ?? [];
    const activeId = (currentPlayer as any)?.active_session?.id ?? null;

    return (
        <UiPanel title="Parties" emoji="🎮" subtitle="Une seule partie active à la fois.">
            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                {loading ? (
                    <div className="text-sm text-white/60">⏳ Chargement…</div>
                ) : sessions.length ? (
                    <div className="space-y-3">
                        {sessions.map((s: any) => {
                            const isActive = !!s?.is_active || (activeId && s?.id === activeId);

                            return (
                                <div
                                    key={s.id}
                                    className={cn(
                                        "rounded-2xl p-3 ring-1",
                                        isActive
                                            ? "bg-emerald-500/10 ring-emerald-400/20"
                                            : "bg-black/20 ring-white/10"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-white/90 truncate">
                                                {s.title ?? "Partie sans titre"}
                                            </div>

                                            <div className="mt-1 text-xs text-white/60">
                                                Active: {String(!!isActive)}
                                            </div>

                                            <div className="mt-1 text-[11px] text-white/45">
                                                id:{" "}
                                                <span className="text-white/65">{s.id ?? ""}</span>
                                            </div>
                                        </div>

                                        {isActive ? (
                                            <div className="shrink-0 text-xs rounded-full px-2 py-1 bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/20">
                                                ✅ active
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-white/60">
                        Aucune session. (Elle sera créée automatiquement au besoin.)
                    </div>
                )}
            </div>
        </UiPanel>
    );
}
