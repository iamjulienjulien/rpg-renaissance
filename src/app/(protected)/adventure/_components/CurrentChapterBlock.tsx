"use client";

import React, { useEffect, useState } from "react";
import { Panel, ActionButton } from "@/components/RpgUi";
import type { Adventure, Chapter } from "@/types/game";
import { UiGradientPanel } from "@/components/ui/UiGradientPanel";
import { UiActionButton, UiPanel, UiPill } from "@/components/ui";
import UiImage from "@/components/ui/UiImage";
import { formatLongDate } from "@/helpers/dateTime";
import Helpers from "@/helpers";
import { useGameStore } from "@/stores/gameStore";

export default React.memo(function CurrentChapterBlock(props: {}) {
    // const { adventure, advEmoji, advTitle, advDesc, onOpenAdventureConfig } = props;

    const { currentChapter, currentChapterQuests } = useGameStore();

    console.log("currentChapter", currentChapter);
    console.log("currentChapterQuests", currentChapterQuests);

    const [chapterQuestsCount, setChapterQuestsCount] = useState<number>(0);
    const [chapterQuestsDoneCount, setChapterQuestsDoneCount] = useState<number>(0);
    const [chapterQuestsDoingCount, setChapterQuestsDoingCount] = useState<number>(0);

    useEffect(() => {
        if (currentChapterQuests.length > 0) {
            setChapterQuestsCount(currentChapterQuests.length);
            setChapterQuestsDoneCount(
                currentChapterQuests.filter((q) => q.status === "done").length
            );
            setChapterQuestsDoingCount(
                currentChapterQuests.filter((q) => q.status === "doing").length
            );
        }
    }, [currentChapterQuests]);

    return (
        // <UiPanel variant="ghost">
        <UiGradientPanel
            eyebrow="📚 Le Chapitre"
            innerClassName="flex"
            gradient="theme"
            glowOpacity={0.5}
        >
            <UiPanel variant="default" className="w-full">
                <div className="text-xl font-semibold text-white/90">{currentChapter?.title}</div>
                <div className="mt-4 flex gap-4">
                    {currentChapter?.created_at && (
                        <UiPill title="Débuté le">
                            🕯️ {formatLongDate(currentChapter?.created_at)}
                        </UiPill>
                    )}
                    {currentChapter?.pace && (
                        <Helpers.Pill.chapterPace pace={currentChapter.pace} />
                    )}

                    <UiPill>{chapterQuestsCount} quêtes</UiPill>
                    <UiPill tone="emerald">✅ {chapterQuestsDoneCount} quêtes terminées</UiPill>
                    <UiPill tone="amber">⏳ {chapterQuestsDoingCount} quêtes en cours</UiPill>
                </div>
            </UiPanel>
        </UiGradientPanel>
    );
});
