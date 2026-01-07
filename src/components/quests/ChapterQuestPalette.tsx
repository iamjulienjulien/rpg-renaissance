"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores/gameStore";
import { ActionButton, Pill } from "@/components/RpgUi";
import type { ChapterQuestFull } from "@/types/game";
import { UiPill } from "../ui";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧭 HELPERS
============================================================================ */

function questStatusMeta(status: ChapterQuestFull["status"]) {
    switch (status) {
        case "done":
            return { emoji: "✅", label: "Terminée", tone: "success" };
        case "doing":
            return { emoji: "🔥", label: "Active", tone: "theme" };
        // case "failed":
        //     return { emoji: "❌", label: "Échouée", tone: "danger" };
        // case "locked":
        //     return { emoji: "🔒", label: "Verrouillée", tone: "neutral" };
        default:
            return { emoji: "📜", label: "En attente", tone: "neutral" };
    }
}

/* ============================================================================
🧩 COMPONENT
============================================================================ */

export default function ChapterQuestPalette() {
    const router = useRouter();

    const open = useUiStore((s) => s.questsPaletteOpen);
    const close = useUiStore((s) => s.closeQuestsPalette);

    const chapterQuests = useGameStore((s) => s.currentChapterQuests);

    const sortedQuests = useMemo(() => {
        if (!chapterQuests) return [];
        return [...chapterQuests].sort((a, b) => a.created_at.localeCompare(b.created_at));
    }, [chapterQuests]);

    if (!open) return null;

    const goQuest = (questId: string) => {
        close();
        router.push(`/quest?cq=${questId}`);
    };

    return (
        <div className="fixed inset-0 z-50">
            {/* Overlay */}
            <button
                className="absolute inset-0 bg-black/60"
                onClick={close}
                aria-label="Close quest palette"
            />

            {/* Panel */}
            <div className="absolute left-1/2 top-24 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 rounded-3xl bg-black/70 p-4 ring-1 ring-white/15 backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-white/80">
                        🗺️ Quêtes du chapitre
                        <span className="ml-2 text-xs text-white/50">
                            Naviguer rapidement entre les quêtes
                        </span>
                    </div>
                    <ActionButton onClick={close}>✖</ActionButton>
                </div>

                {/* Content */}
                <div className="mt-4 grid gap-2 max-h-[60vh] overflow-y-auto">
                    {sortedQuests.length === 0 && (
                        <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/50 ring-1 ring-white/10">
                            Aucune quête disponible pour ce chapitre.
                        </div>
                    )}

                    {sortedQuests.map((q) => {
                        const meta = questStatusMeta(q.status);
                        const aq = Array.isArray(q.adventure_quests)
                            ? q.adventure_quests[0]
                            : q.adventure_quests;

                        return (
                            <button
                                key={q.id}
                                onClick={() => goQuest(q.id)}
                                className={cn(
                                    "w-full rounded-2xl px-4 py-3 text-left ring-1 ring-white/10",
                                    "bg-white/5 hover:bg-white/10 hover:ring-white/20 transition"
                                )}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-sm text-white/90">
                                            <span>{meta.emoji}</span>
                                            <span className="font-medium truncate">
                                                {q.room_title ?? aq?.title ?? "Quête sans titre"}
                                            </span>
                                        </div>

                                        <div className="mt-1 text-xs text-white/45">
                                            {q.room_code
                                                ? `Salle ${q.room_code}`
                                                : "Salle inconnue"}
                                        </div>
                                    </div>

                                    <UiPill tone={meta.tone as any}>{meta.label}</UiPill>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
