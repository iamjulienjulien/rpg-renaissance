"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { usePlantsList } from "@/hooks/inventory";

export default function InventoryPage() {
    const router = useRouter();
    const { plants, loading } = usePlantsList({ auto: true });

    const plantsCountLabel = useMemo(() => {
        const n = plants.length;
        return n <= 1 ? `${n} plante` : `${n} plantes`;
    }, [plants.length]);

    return (
        <RpgShell
            title="Inventaire"
            subtitle="Ce que tu observes, cultives et conserves dans le monde réel."
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>⌨️ I</Pill>
                    <Pill>🌱 {loading ? "…" : plantsCountLabel}</Pill>
                </div>
            }
        >
            <div className="grid gap-4 lg:grid-cols-3">
                {/* 🌿 PLANTS */}
                <Panel
                    title="Mes plantes"
                    emoji="🌿"
                    subtitle="Plantes observées, cultivées ou simplement présentes."
                    right={
                        <ActionButton
                            variant="solid"
                            onClick={() => router.push("/inventory/plants")}
                        >
                            Ouvrir
                        </ActionButton>
                    }
                >
                    <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                        <div className="text-white/85 font-semibold">🌱 Plantes</div>
                        <div className="mt-1 text-sm text-white/60">
                            {loading
                                ? "⏳ Chargement…"
                                : `${plantsCountLabel} dans ton inventaire.`}
                        </div>

                        <div className="mt-3 flex justify-end">
                            <ActionButton onClick={() => router.push("/inventory/plants")}>
                                ➕ Ajouter / ✍️ Modifier
                            </ActionButton>
                        </div>
                    </div>
                </Panel>

                {/* 📚 LIVRES */}
                <Panel title="Mes livres" emoji="📚" subtitle="Bibliothèque personnelle.">
                    <div className="rpg-text-sm text-white/50">🔒 Disponible prochainement.</div>
                </Panel>

                {/* 💿 VINYLS */}
                <Panel title="Mes vinyles" emoji="💿" subtitle="Collection musicale.">
                    <div className="rpg-text-sm text-white/50">🔒 Disponible prochainement.</div>
                </Panel>
            </div>
        </RpgShell>
    );
}
