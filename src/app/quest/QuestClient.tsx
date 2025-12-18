"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import ReactMarkdown from "react-markdown";

type Quest = {
    id: string;
    title: string;
    description: string | null;
    brief: string | null;
    status: "todo" | "doing" | "done";
    room_code: string | null;
};

type ChapterQuest = {
    id: string;
    quest_id: string;
    chapter_id: string;
    status: "todo" | "doing" | "done";
};

export default function QuestClient() {
    const router = useRouter();
    const sp = useSearchParams();

    // ex: /quest?cq=uuid
    const chapterQuestId = sp.get("cq");

    const [loading, setLoading] = useState(true);
    const [chapterQuest, setChapterQuest] = useState<ChapterQuest | null>(null);
    const [quest, setQuest] = useState<Quest | null>(null);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        if (!chapterQuestId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/chapter-quests/${encodeURIComponent(chapterQuestId)}`, {
                cache: "no-store",
            });
            const json = await res.json();

            if (!res.ok) {
                console.error(json?.error ?? "Load failed");
                return;
            }

            setChapterQuest(json.chapterQuest);
            setQuest(json.quest);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterQuestId]);

    const updateStatus = async (status: "doing" | "done" | "todo") => {
        if (!chapterQuest) return;

        setBusy(true);
        try {
            const res = await fetch(`/api/chapter-quests/${chapterQuest.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            const json = await res.json();
            if (!res.ok) {
                console.error(json?.error ?? "Update failed");
                return;
            }

            setChapterQuest(json.chapterQuest);
            if (status === "done") {
                router.push("/quests");
            }
        } finally {
            setBusy(false);
        }
    };

    if (!chapterQuestId) {
        return (
            <RpgShell title="Quête">
                <Panel title="Erreur" emoji="⚠️" subtitle="Paramètre manquant.">
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
                    {quest?.room_code ? (
                        <Pill>🚪 {quest.room_code}</Pill>
                    ) : (
                        <Pill>🗺️ sans pièce</Pill>
                    )}
                </div>
            }
        >
            {loading || !quest || !chapterQuest ? (
                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement de la quête…
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* LEFT */}
                    <Panel title={quest.title} emoji="🎯" subtitle="Ordre de mission">
                        {quest.brief ? (
                            <div className="prose prose-invert max-w-none text-sm">
                                <ReactMarkdown>{quest.brief}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="text-sm text-white/60">
                                Aucun brief généré pour l’instant.
                            </div>
                        )}
                    </Panel>

                    {/* RIGHT */}
                    <Panel title="Actions" emoji="⚔️" subtitle="Décide de la suite.">
                        <div className="flex flex-col gap-3">
                            {chapterQuest.status === "todo" && (
                                <>
                                    <ActionButton
                                        variant="solid"
                                        onClick={() => updateStatus("doing")}
                                        disabled={busy}
                                    >
                                        ▶️ Démarrer la quête
                                    </ActionButton>

                                    <ActionButton onClick={() => router.push("/quests")}>
                                        ↩️ Retour au chapitre
                                    </ActionButton>
                                </>
                            )}

                            {chapterQuest.status === "doing" && (
                                <>
                                    <ActionButton
                                        variant="solid"
                                        onClick={() => updateStatus("done")}
                                        disabled={busy}
                                    >
                                        ✅ Terminer la quête
                                    </ActionButton>

                                    <ActionButton
                                        onClick={() => updateStatus("todo")}
                                        disabled={busy}
                                    >
                                        🏳️ Abandonner
                                    </ActionButton>

                                    <ActionButton onClick={() => router.push("/quests")}>
                                        ↩️ Retour au chapitre
                                    </ActionButton>
                                </>
                            )}

                            {chapterQuest.status === "done" && (
                                <ActionButton
                                    variant="solid"
                                    onClick={() => router.push("/quests")}
                                >
                                    ↩️ Retour au chapitre
                                </ActionButton>
                            )}
                        </div>
                    </Panel>
                </div>
            )}
        </RpgShell>
    );
}
