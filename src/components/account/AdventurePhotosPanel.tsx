// src/components/account/AdventurePhotosPanel.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { UiPanel, UiActionButton } from "../ui";
import { useGameStore } from "@/stores/gameStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function AdventurePhotosPanel() {
    const currentPlayer = useGameStore((s) => s.currentPlayer);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);

    useEffect(() => {
        // best-effort: si /account arrive avant le bootstrap complet
        if (!currentPlayer) {
            void getCurrentPlayer().catch(() => null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const photos = useMemo(() => {
        const list = (currentPlayer?.adventure_photos ?? []) as any[];
        return list.sort((a, b) =>
            String(b?.created_at ?? "").localeCompare(String(a?.created_at ?? ""))
        );
    }, [currentPlayer?.adventure_photos]);

    return (
        <UiPanel
            title="Photos d’aventure"
            emoji="🗺️"
            subtitle="Souvenirs visuels de tes quêtes, chapitres et moments marquants."
        >
            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                {photos.length === 0 ? (
                    <div className="text-sm text-white/60">
                        Aucune photo d’aventure enregistrée pour le moment.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {photos.map((p) => {
                            const id = String(p?.id ?? "");
                            const url = p?.signed_url ?? null;

                            return (
                                <div
                                    key={id}
                                    className="relative overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/10"
                                >
                                    <div className="aspect-4/5 w-full bg-black/30">
                                        {url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={url}
                                                alt={p?.caption ?? "Photo d’aventure"}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                                                (Aperçu indisponible)
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 space-y-2">
                                        <div className="text-xs text-white/55 line-clamp-2">
                                            {p?.caption ?? p?.ai_description ?? "Photo d’aventure"}
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-[11px] text-white/35">
                                                {p?.created_at
                                                    ? new Date(p.created_at).toLocaleDateString()
                                                    : ""}
                                            </div>

                                            {p?.is_cover ? (
                                                <div className="text-[11px] text-amber-300/80">
                                                    ⭐ Couverture
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-3 text-xs text-white/45">
                    Ces photos documentent ton aventure et servent de mémoire visuelle (journal,
                    récap, souvenirs).
                </div>
            </div>
        </UiPanel>
    );
}
