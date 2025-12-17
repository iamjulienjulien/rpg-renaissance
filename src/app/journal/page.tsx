"use client";

import React, { useEffect, useState } from "react";
import RpgShell from "@/components/RpgShell";
import { Panel, Pill, ActionButton } from "@/components/RpgUi";

type Entry = {
    id: string;
    kind: string;
    title: string;
    content: string | null;
    chapter_id: string | null;
    quest_id: string | null;
    created_at: string;
};

function kindBadge(kind: string) {
    if (kind === "chapter_started") return "✨ Chapitre";
    if (kind === "quest_done") return "✅ Quête";
    if (kind === "quest_reopened") return "↩️ Quête";
    return "📝 Note";
}

export default function JournalPage() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/journal?limit=80", { cache: "no-store" });
            const json = await res.json();
            setEntries(json.entries ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    return (
        <RpgShell
            title="Journal"
            subtitle="Le récit s’écrit tout seul: chapitres lancés, quêtes accomplies, traces gardées."
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>📖 {entries.length}</Pill>
                    <Pill>⌘K</Pill>
                </div>
            }
        >
            <Panel
                title="Chroniques"
                emoji="📖"
                subtitle="Entrées auto-générées (mode dev)."
                right={
                    <ActionButton onClick={load} variant="solid">
                        🔄 Recharger
                    </ActionButton>
                }
            >
                {loading ? (
                    <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                        ⏳ Chargement du journal…
                    </div>
                ) : entries.length === 0 ? (
                    <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                        Rien pour l’instant. Lance un chapitre (✨ Nouvelle aventure) ou termine une
                        quête ✅
                    </div>
                ) : (
                    <div className="space-y-2">
                        {entries.map((e) => (
                            <div
                                key={e.id}
                                className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-sm text-white/90">{e.title}</div>
                                    <div className="flex items-center gap-2">
                                        <Pill>{kindBadge(e.kind)}</Pill>
                                        <Pill>
                                            🕯️ {new Date(e.created_at).toLocaleString("fr-FR")}
                                        </Pill>
                                    </div>
                                </div>

                                {e.content ? (
                                    <div className="mt-2 text-sm text-white/60">{e.content}</div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </RpgShell>
    );
}
