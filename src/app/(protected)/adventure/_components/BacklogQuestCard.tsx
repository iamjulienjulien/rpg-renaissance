"use client";

import React from "react";
import { ActionButton } from "@/components/RpgUi";
import { QuestDifficultyPill } from "@/helpers/questDifficulty";
import { QuestRoomPill } from "@/helpers/questRoom";
import type { AdventureQuest } from "@/types/game";

export default React.memo(function BacklogQuestCard(props: {
    q: AdventureQuest;
    assigning: boolean;
    onAssign: (q: AdventureQuest) => void;
}) {
    const { q, assigning, onAssign } = props;

    return (
        <div className="flex flex-col gap-2 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="truncate text-white/90 font-semibold">{q.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <QuestRoomPill roomCode={q.room_code ?? null} />
                    <QuestDifficultyPill difficulty={q.difficulty ?? 2} />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <ActionButton variant="solid" disabled={assigning} onClick={() => onAssign(q)}>
                    {assigning ? "⏳" : "➕ Lier à cet acte"}
                </ActionButton>
            </div>
        </div>
    );
});
