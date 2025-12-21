"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { DifficultyPill } from "@/helpers/difficulty";
import ReactMarkdown from "react-markdown";
import MasterCard from "@/components/ui/MasterCard";
import { useGameStore } from "@/stores/gameStore";

type Quest = {
    id: string;
    title: string;
    description: string | null;
    brief: string | null;
    status: "todo" | "doing" | "done";
    room_code: string | null;
    difficulty?: number | null;
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
    const [missionMd, setMissionMd] = useState<string | null>(null);
    const [quest, setQuest] = useState<Quest | null>(null);
    const [busy, setBusy] = useState(false);

    // ✅ actions centralisées store (toast + journal + renown)
    const startQuest = useGameStore((s) => s.startQuest);
    const finishQuest = useGameStore((s) => s.finishQuest);

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
            setMissionMd(json.mission_md ?? json.mission?.mission_md ?? null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterQuestId]);

    // ✅ wrappers: délègue au store, garde le state local à jour
    const onStart = async () => {
        if (!chapterQuestId || !quest) return;

        setBusy(true);
        try {
            const cq = await startQuest(chapterQuestId, {
                id: quest.id,
                title: quest.title,
                room_code: quest.room_code,
                difficulty: quest.difficulty ?? null,
            } as any);

            if (cq) setChapterQuest(cq);
        } finally {
            setBusy(false);
        }
    };

    const onFinish = async () => {
        if (!chapterQuestId || !quest) return;

        setBusy(true);
        try {
            const cq = await finishQuest(chapterQuestId, {
                id: quest.id,
                title: quest.title,
                room_code: quest.room_code,
                difficulty: quest.difficulty ?? null,
            } as any);

            if (cq) {
                setChapterQuest(cq);
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
        <RpgShell title="Quête" returnButton={false}>
            {loading || !quest || !chapterQuest ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement de la quête…
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* LEFT */}
                    <div className="flex flex-col gap-5">
                        <Panel title="Quête" emoji="🎯">
                            <div className="flex flex-col gap-3">
                                <div className="text-white/90 font-semibold">{quest.title}</div>

                                <div className="flex flex-wrap gap-2">
                                    {quest.room_code ? (
                                        <Pill>🚪 {quest.room_code}</Pill>
                                    ) : (
                                        <Pill>🗺️ sans pièce</Pill>
                                    )}

                                    {quest.difficulty ? (
                                        <DifficultyPill difficulty={quest.difficulty} />
                                    ) : (
                                        <Pill>🎚️ —</Pill>
                                    )}
                                </div>
                            </div>
                        </Panel>

                        <MasterCard title="Ordre de mission" emoji="🎯">
                            {missionMd ? (
                                <div
                                    className="prose prose-invert max-w-none rpg-text-sm
                                        prose-p:my-4
                                        prose-ul:my-4
                                        prose-li:my-1
                                        prose-strong:text-white
                                    "
                                >
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => <p className="my-4">{children}</p>,
                                            ul: ({ children }) => (
                                                <ul className="my-4 list-disc pl-6">{children}</ul>
                                            ),
                                            li: ({ children }) => (
                                                <li className="my-1">{children}</li>
                                            ),
                                            strong: ({ children }) => (
                                                <strong className="text-white">{children}</strong>
                                            ),
                                        }}
                                    >
                                        {missionMd}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="rpg-text-sm text-white/60">
                                    Aucun brief généré pour l’instant.
                                </div>
                            )}
                        </MasterCard>
                    </div>

                    {/* RIGHT */}
                    <Panel title="Actions" emoji="⚔️" subtitle="Décide de la suite.">
                        <div className="flex flex-col gap-3">
                            {chapterQuest.status === "todo" && (
                                <>
                                    <ActionButton variant="solid" onClick={onStart} disabled={busy}>
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
                                        onClick={onFinish}
                                        disabled={busy}
                                    >
                                        ✅ Terminer la quête
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
