"use client";

import React from "react";
import { ActionButton } from "@/components/RpgUi";
import { QuestDifficultyPill } from "@/helpers/questDifficulty";
import { QuestStatusPill } from "@/helpers/questStatus";
import type { AdventureQuest, ChapterQuestFull } from "@/types/game";

export default React.memo(function ChapterQuestCard(props: {
    cq: ChapterQuestFull;
    q: AdventureQuest | null;
    unassigning: boolean;
    onUnassign: (cq: ChapterQuestFull, q: AdventureQuest | null) => void;
    onOpenQuest: (chapterQuestId: string) => void;
}) {
    const { cq, q, unassigning, onUnassign, onOpenQuest } = props;

    return (
        <div className="flex flex-col gap-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="truncate text-white/90 font-semibold">{q?.title ?? "Quête"}</div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <QuestStatusPill status={cq.status} />
                    <QuestDifficultyPill difficulty={q?.difficulty ?? 2} />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <ActionButton
                    variant="soft"
                    disabled={cq.status !== "todo" || unassigning}
                    onClick={() => onUnassign(cq, q)}
                >
                    {unassigning ? "⏳" : "⏸️ Mettre en attente"}
                </ActionButton>

                <ActionButton variant="solid" onClick={() => onOpenQuest(cq.id)}>
                    ▶️ Entrer dans la quête
                </ActionButton>
            </div>
        </div>
    );
});
