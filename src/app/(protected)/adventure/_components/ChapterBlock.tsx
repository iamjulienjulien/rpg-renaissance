"use client";

import React, { useMemo } from "react";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { questRoomEmoji, questRoomLabel } from "@/helpers/questRoom";
import type { AdventureQuest, Chapter, ChapterQuestFull } from "@/types/game";
import ChapterQuestCard from "./ChapterQuestCard";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default React.memo(function ChapterBlock(props: {
    chapter: Chapter;
    chapterItems: ChapterQuestFull[];
    grouped: Array<[string, Array<{ cq: ChapterQuestFull; q: AdventureQuest | null }>]>;
    pulse: boolean;
    unassigningId: string | null;

    onOpenChapterConfig: () => void;
    onOpenTransition: () => void;
    onUnassignFromChapter: (cq: ChapterQuestFull, q: AdventureQuest | null) => void;
    onOpenQuest: (chapterQuestId: string) => void;
}) {
    const {
        chapter,
        chapterItems,
        grouped,
        pulse,
        unassigningId,
        onOpenChapterConfig,
        onOpenTransition,
        onUnassignFromChapter,
        onOpenQuest,
    } = props;

    const count = chapterItems.length;

    const header = useMemo(() => {
        return (
            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-white/90 font-semibold">📖 {chapter.title}</div>
                    <div className="flex flex-wrap gap-2">
                        <Pill>📜 {count} quêtes</Pill>
                    </div>
                </div>

                <div className="mt-2 rpg-rpg-text-sm text-white/60">
                    Choisis une quête et ouvre sa page pour la jouer.
                </div>

                <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                    <div className="text-white/85 font-semibold">🗺️ Mise en scène</div>
                    <div className="mt-2 whitespace-pre-line rpg-rpg-text-sm text-white/60">
                        {(chapter as any)?.context_text?.trim()
                            ? (chapter as any).context_text
                            : "Aucun contexte de chapitre. Tu peux en ajouter via “Configurer”."}
                    </div>
                </div>
            </div>
        );
    }, [chapter, count]);

    return (
        <div className={cn("transition-transform", pulse ? "scale-[1.01]" : "scale-100")}>
            <Panel
                title="Chapitres"
                emoji="📚"
                subtitle="Les actes de cette aventure, organisés par territoires."
                right={
                    <div className="flex items-center gap-2">
                        <ActionButton onClick={onOpenChapterConfig}>
                            ⚙️ Ordonner les chapitres
                        </ActionButton>
                    </div>
                }
            >
                {header}

                <div className="mt-4 space-y-3">
                    {count === 0 ? (
                        <div className="rounded-2xl bg-black/30 p-4 rpg-rpg-text-sm text-white/60 ring-1 ring-white/10">
                            Aucune quête dans ce chapitre. Va en préparation pour en sélectionner.
                        </div>
                    ) : (
                        grouped.map(([roomTitle, arr]) => (
                            <div
                                key={roomTitle}
                                className="rounded-2xl bg-black/25 ring-1 ring-white/10"
                            >
                                <div className="flex items-center justify-between gap-2 px-4 py-3">
                                    <div className="text-white/90 font-semibold">
                                        {questRoomEmoji(roomTitle)} {questRoomLabel(roomTitle)}
                                    </div>
                                    <Pill>
                                        {arr.length} quête{arr.length > 1 ? "s" : ""}
                                    </Pill>
                                </div>

                                <div className="space-y-2 px-3 pb-3">
                                    {arr.map(({ cq, q }) => (
                                        <ChapterQuestCard
                                            key={cq.id}
                                            cq={cq}
                                            q={q}
                                            unassigning={unassigningId === cq.id}
                                            onUnassign={onUnassignFromChapter}
                                            onOpenQuest={onOpenQuest}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-4">
                    <ActionButton
                        variant="solid"
                        onClick={onOpenTransition}
                        className="w-full text-center"
                    >
                        🏁 Clore l’acte et préparer la suite
                    </ActionButton>
                </div>
            </Panel>
        </div>
    );
});
