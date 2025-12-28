"use client";

import React, { useEffect, useMemo, useState } from "react";
import UiModal from "@/components/ui/UiModal";
import { ActionButton, Pill } from "@/components/RpgUi";
import { useUiStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores/gameStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type Props = {
    // si tu veux l’utiliser partout, on passe juste un “fallback”
    // depuis la page racine (ex: currentAdventure?.id)
    defaultAdventureId?: string | null;

    // permet d’ouvrir la modal “pré-remplie” depuis un contexte
    defaultRoomCode?: string | null;

    // Par défaut: "backlog". Si la page sait qu’on veut assigner direct.
    defaultTarget?: "backlog" | "chapter";
};

export default function QuestCreateModal(props: Props) {
    const isOpen = useUiStore((s) => s.isModalOpen("questCreate"));
    const closeModal = useUiStore((s) => s.closeModal);

    const rooms = useGameStore((s) => s.rooms);
    const currentChapter = useGameStore((s) => s.currentChapter);
    const currentAdventure = useGameStore((s) => s.currentAdventure);

    const createAdventureQuest = useGameStore((s) => s.createAdventureQuest);
    const assignQuestToCurrentChapter = useGameStore((s) => s.assignQuestToCurrentChapter);

    const adventureId = currentAdventure?.id ?? props.defaultAdventureId ?? null;

    const canAssignToChapter = !!currentChapter?.id;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [roomCode, setRoomCode] = useState<string>("");
    const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
    const [estimateMin, setEstimateMin] = useState<string>("");

    const [target, setTarget] = useState<"backlog" | "chapter">(props.defaultTarget ?? "backlog");
    const [busy, setBusy] = useState(false);

    // reset defaults when open
    useEffect(() => {
        if (!isOpen) return;
        setTitle("");
        setDescription("");
        setRoomCode(props.defaultRoomCode ?? "");
        setDifficulty(2);
        setEstimateMin("");
        setTarget(props.defaultTarget ?? "backlog");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const roomOptions = useMemo(() => {
        const list = Array.isArray(rooms) ? rooms.slice() : [];
        list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
        return list;
    }, [rooms]);

    const onClose = () => closeModal("questCreate");

    const onSubmit = async () => {
        if (!adventureId) return;
        const t = title.trim();
        if (!t) return;

        setBusy(true);
        try {
            const quest = await createAdventureQuest({
                adventure_id: adventureId,
                room_code: roomCode ? roomCode : null,
                title: t,
                description: description.trim() ? description.trim() : null,
                difficulty,
                estimate_min: estimateMin.trim() ? Number(estimateMin) : null,
            });

            if (!quest?.id) return;

            if (target === "chapter" && canAssignToChapter) {
                await assignQuestToCurrentChapter(quest.id);
            }

            onClose();
        } finally {
            setBusy(false);
        }
    };

    const disableSubmit = !adventureId || !title.trim() || busy;

    return (
        <UiModal
            id="questCreate"
            maxWidth="lg"
            eyebrow="📜 Quête"
            title="Créer une nouvelle quête"
            // subtitle="Depuis n’importe où. Backlog ou chapitre courant."
            closeOnBackdrop
            closeOnEscape
            // headerRight={
            //     <div className="flex items-center gap-2">
            //         <Pill>{currentChapter?.id ? "📘 Chapitre actif" : "📘 Aucun chapitre"}</Pill>
            //     </div>
            // }
            footer={
                <div className="flex items-center justify-between gap-2">
                    <ActionButton onClick={onClose}>Annuler</ActionButton>
                    <ActionButton
                        variant="solid"
                        disabled={disableSubmit}
                        onClick={() => void onSubmit()}
                    >
                        {busy ? "⏳ Création…" : "✅ Créer"}
                    </ActionButton>
                </div>
            }
        >
            {!adventureId ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    ⚠️ Aucune aventure active. Lance une aventure pour créer une quête.
                </div>
            ) : (
                <div className="grid gap-3 mt-2">
                    {/* Target */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Destination
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setTarget("backlog")}
                                className={cn(
                                    "rounded-full px-3 py-1 text-xs ring-1 transition",
                                    target === "backlog"
                                        ? "bg-white/10 text-white ring-white/15"
                                        : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
                                )}
                            >
                                🧺 Backlog
                            </button>

                            <button
                                type="button"
                                disabled={!canAssignToChapter}
                                onClick={() => setTarget("chapter")}
                                className={cn(
                                    "rounded-full px-3 py-1 text-xs ring-1 transition",
                                    target === "chapter"
                                        ? "bg-white/10 text-white ring-white/15"
                                        : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                    !canAssignToChapter && "opacity-50 cursor-not-allowed"
                                )}
                                title={!canAssignToChapter ? "Aucun chapitre actif" : undefined}
                            >
                                📘 Chapitre courant
                            </button>
                        </div>
                    </div>

                    {/* Room */}
                    <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                        <select
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value)}
                            className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                        >
                            <option value="">🗺️ Toutes pièces</option>
                            {roomOptions.map((r) => (
                                <option key={r.code} value={r.code}>
                                    {r.emoji} {r.title}
                                </option>
                            ))}
                        </select>

                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}
                            className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                        >
                            <option value={1}>🟢 Facile</option>
                            <option value={2}>🟡 Standard</option>
                            <option value={3}>🔴 Difficile</option>
                        </select>
                    </div>

                    {/* Title */}
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void onSubmit();
                        }}
                        placeholder="Ex: Ranger la table basse (5 min)…"
                        className={cn(
                            "w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                            "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                            "focus:ring-2 focus:ring-white/25"
                        )}
                    />

                    {/* Description */}
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Détails (optionnel). Ex: vider les câbles, dépoussiérer, remettre les plaids…"
                        className="min-h-[120px] w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                    />

                    {/* Estimate */}
                    <div className="grid gap-2 sm:grid-cols-[1fr_240px]">
                        <div className="text-sm text-white/60">
                            Petite estimation en minutes (optionnel). Utile bientôt pour le pacing
                            et la renommée.
                        </div>
                        <input
                            value={estimateMin}
                            onChange={(e) => setEstimateMin(e.target.value.replace(/[^\d]/g, ""))}
                            placeholder="Estimation (min)"
                            className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                        />
                    </div>
                </div>
            )}
        </UiModal>
    );
}
