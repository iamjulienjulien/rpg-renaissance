"use client";

import React from "react";
import { ActionButton, Panel } from "@/components/RpgUi";
import type { AdventureQuest } from "@/types/game";
import BacklogQuestCard from "./BacklogQuestCard";

export default React.memo(function BacklogBlock(props: {
    backlog: AdventureQuest[];
    loading: boolean;
    assigningId: string | null;
    onOpenCreate: () => void;
    onAssign: (q: AdventureQuest) => void;
}) {
    const { backlog, loading, assigningId, onOpenCreate, onAssign } = props;

    return (
        <Panel
            title="Quêtes en réserve"
            emoji="🧺"
            subtitle="Des missions en attente d’un moment propice."
            right={
                <div className="flex items-center gap-2">
                    <ActionButton variant="solid" onClick={onOpenCreate}>
                        ✨ Forger une nouvelle quête
                    </ActionButton>
                </div>
            }
        >
            <div className="mt-4 space-y-2">
                {loading ? (
                    <div className="rounded-2xl bg-black/30 p-4 rpg-rpg-text-sm text-white/60 ring-1 ring-white/10">
                        ⏳ Chargement du backlog…
                    </div>
                ) : backlog.length === 0 ? (
                    <div className="rounded-2xl bg-black/30 p-4 rpg-rpg-text-sm text-white/60 ring-1 ring-white/10">
                        Backlog vide. Crée une quête, ou va en préparation pour générer via IA 🎲
                    </div>
                ) : (
                    backlog.map((q) => (
                        <BacklogQuestCard
                            key={q.id}
                            q={q}
                            assigning={assigningId === q.id}
                            onAssign={onAssign}
                        />
                    ))
                )}
            </div>
        </Panel>
    );
});
