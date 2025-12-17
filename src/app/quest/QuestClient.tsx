"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

export default function QuestClient() {
    const router = useRouter();
    const sp = useSearchParams();

    // Exemple: tu passes cq=<chapterQuestId>
    const cqId = sp.get("cq") ?? "";

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!cqId) {
            setLoading(false);
            return;
        }

        const run = async () => {
            setLoading(true);
            try {
                // TODO: fetch chapter-quest + quest detail
            } finally {
                setLoading(false);
            }
        };

        void run();
    }, [cqId]);

    if (!cqId) {
        return (
            <RpgShell title="Quête" rightSlot={<Pill>⚠️</Pill>}>
                <Panel title="Erreur" emoji="⚠️" subtitle="Paramètre manquant (cq).">
                    <ActionButton variant="solid" onClick={() => router.push("/quests")}>
                        ↩️ Retour aux quêtes
                    </ActionButton>
                </Panel>
            </RpgShell>
        );
    }

    return (
        <RpgShell
            title="Quête"
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>id: {cqId.slice(0, 6)}…</Pill>
                </div>
            }
        >
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement…
                </div>
            ) : (
                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                    TODO: écran quête
                </div>
            )}
        </RpgShell>
    );
}
