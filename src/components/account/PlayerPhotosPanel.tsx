// src/components/account/PlayerPhotosPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UiPanel } from "../ui";
import { UiActionButton } from "../ui";
import { useGameStore } from "@/stores/gameStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function PlayerPhotosPanel() {
    const currentPlayer = useGameStore((s) => s.currentPlayer);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);
    const deletePlayerPhoto = useGameStore((s) => (s as any).deletePlayerPhoto as any);

    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        // best-effort: si /account arrive avant le bootstrap complet
        if (!currentPlayer) {
            void getCurrentPlayer().catch(() => null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const photos = useMemo(() => {
        const list = (currentPlayer?.photos ?? []) as any[];
        return list
            .filter((p) => p?.kind === "portrait_source")
            .sort((a, b) => String(b?.created_at ?? "").localeCompare(String(a?.created_at ?? "")));
    }, [currentPlayer?.photos]);

    const onDelete = async (photoId: string) => {
        if (!deletePlayerPhoto) return;
        const id = (photoId ?? "").trim();
        if (!id) return;

        setBusyId(id);
        try {
            await deletePlayerPhoto(id);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <UiPanel
            title="Portraits"
            emoji="📸"
            subtitle="Photos utilisées comme sources pour générer ton avatar."
        >
            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                {photos.length === 0 ? (
                    <div className="text-sm text-white/60">
                        Aucun portrait enregistré pour le moment.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {photos.map((p) => {
                            const id = String(p?.id ?? "");
                            const url =
                                (p as any)?.signed_url ??
                                (p as any)?.public_url ??
                                (p as any)?.url ??
                                null;

                            const isBusy = busyId === id;

                            return (
                                <div
                                    key={id}
                                    className="relative overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/10"
                                >
                                    <div className="aspect-[4/5] w-full bg-black/30">
                                        {url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={url}
                                                alt={p?.alt_text ?? "Portrait"}
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
                                            {p?.caption ?? p?.alt_text ?? "Portrait source"}
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-[11px] text-white/35">
                                                {p?.created_at
                                                    ? new Date(p.created_at).toLocaleDateString()
                                                    : ""}
                                            </div>

                                            <UiActionButton
                                                variant="danger"
                                                onClick={() => void onDelete(id)}
                                                disabled={!id || isBusy}
                                                size="xs"
                                            >
                                                {isBusy ? "⏳" : "🗑️"}
                                            </UiActionButton>
                                        </div>
                                    </div>

                                    {isBusy ? (
                                        <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center text-sm text-white/80">
                                            Suppression…
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-3 text-xs text-white/45">
                    Astuce: garde 1 à 3 portraits nets (visage bien visible), ça améliore les
                    générations.
                </div>
            </div>
        </UiPanel>
    );
}
