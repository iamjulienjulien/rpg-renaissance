"use client";

import React from "react";
import { UiModal } from "@/components/ui/UiModal";
import { ActionButton, Pill } from "@/components/RpgUi";
import { QuestDifficultyPill } from "@/helpers/questDifficulty";
import { QuestRoomPill } from "@/helpers/questRoom";
import type { AdventureQuest, ChapterQuestFull } from "@/types/game";

export default React.memo(function ChapterTransitionModal(props: {
    chapterTitle: string | null;

    carryOver: ChapterQuestFull[];

    backlog: AdventureQuest[];
    selectedBacklogIds: Set<string>;
    setSelectedBacklogIds: React.Dispatch<React.SetStateAction<Set<string>>>;

    nextTitle: string;
    setNextTitle: (v: string) => void;

    nextPace: "calme" | "standard" | "intense";
    setNextPace: (v: "calme" | "standard" | "intense") => void;

    nextAiContext: string;
    setNextAiContext: (v: string) => void;

    busy: boolean;
    onClose: () => void;
    onSubmit: () => void;
}) {
    const {
        chapterTitle,
        carryOver,
        backlog,
        selectedBacklogIds,
        setSelectedBacklogIds,
        nextTitle,
        setNextTitle,
        nextPace,
        setNextPace,
        nextAiContext,
        setNextAiContext,
        busy,
        onClose,
        onSubmit,
    } = props;

    console.log("car", carryOver);

    return (
        <UiModal
            id="chapterTransition"
            maxWidth="3xl"
            closeOnBackdrop
            closeOnEscape
            eyebrow="📚 Transition de chapitre"
            title={
                chapterTitle
                    ? `Clôturer “${chapterTitle}” et préparer la suite`
                    : "Transition de chapitre"
            }
            subtitle="Les quêtes non terminées seront automatiquement reportées."
            footer={
                <div className="flex justify-end gap-2">
                    <ActionButton onClick={onClose}>Annuler</ActionButton>
                    <ActionButton
                        variant="solid"
                        disabled={busy || !nextTitle.trim()}
                        onClick={onSubmit}
                    >
                        {busy ? "⏳ Transition…" : "✅ Lancer le prochain chapitre"}
                    </ActionButton>
                </div>
            }
        >
            {/* 1) Carry over */}
            <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                    <div className="font-semibold text-white/85">🔁 Quêtes à reporter</div>
                    <Pill>{carryOver.length}</Pill>
                </div>

                {carryOver.length === 0 ? (
                    <div className="mt-3 rpg-rpg-text-sm text-white/60">
                        Rien à reporter. Chapitre clean ✅
                    </div>
                ) : (
                    <div className="mt-3 space-y-2">
                        {carryOver.map((cq) => (
                            <div
                                key={cq.id}
                                className="rounded-2xl bg-black/30 p-3 ring-1 ring-white/10"
                            >
                                <div className="font-semibold truncate text-white/85">
                                    {(cq as any)?.adventure_quests.title ?? "Quête"}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2) Backlog */}
            <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                    <div className="font-semibold text-white/85">🧺 Ajouter depuis le backlog</div>
                    <Pill>{backlog.length}</Pill>
                </div>

                <div className="mt-3 max-h-[260px] overflow-auto space-y-2 pr-1">
                    {backlog.map((q) => {
                        const checked = selectedBacklogIds.has(q.id);

                        return (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() =>
                                    setSelectedBacklogIds((prev) => {
                                        const next = new Set(prev);
                                        checked ? next.delete(q.id) : next.add(q.id);
                                        return next;
                                    })
                                }
                                className={`w-full rounded-2xl p-3 text-left ring-1 transition ${
                                    checked
                                        ? "bg-white/10 ring-white/20"
                                        : "bg-black/30 ring-white/10 hover:bg-white/5"
                                }`}
                            >
                                <div className="font-semibold truncate">
                                    {checked ? "✅ " : "➕ "}
                                    {q.title}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <QuestRoomPill roomCode={q.room_code ?? null} />
                                    <QuestDifficultyPill difficulty={q.difficulty ?? 2} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3) Next chapter */}
            <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                <div className="font-semibold text-white/85">🧠 Prochain chapitre</div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                    <input
                        value={nextTitle}
                        onChange={(e) => setNextTitle(e.target.value)}
                        placeholder="Titre du prochain chapitre"
                        className="rounded-2xl bg-black/30 px-4 py-3 rpg-rpg-text-sm text-white/90
                                   ring-1 ring-white/10 outline-none
                                   placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                    />

                    <select
                        value={nextPace}
                        onChange={(e) =>
                            setNextPace(e.target.value as "calme" | "standard" | "intense")
                        }
                        className="rounded-2xl bg-black/30 px-4 py-3 rpg-rpg-text-sm text-white/90
                                   ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                    >
                        <option value="calme">🌙 calme</option>
                        <option value="standard">⚡ standard</option>
                        <option value="intense">🔥 intense</option>
                    </select>
                </div>

                <textarea
                    value={nextAiContext}
                    onChange={(e) => setNextAiContext(e.target.value)}
                    placeholder="Contexte IA pour ce chapitre"
                    className="mt-3 min-h-[120px] w-full rounded-2xl bg-black/30 px-4 py-3
                               rpg-rpg-text-sm text-white/90 ring-1 ring-white/10 outline-none
                               placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                />
            </div>
        </UiModal>
    );
});
