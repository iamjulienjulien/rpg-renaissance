"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UiModal } from "@/components/ui/UiModal";
import { ActionButton, Pill } from "@/components/RpgUi";
import { useUiStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores/gameStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type Difficulty = 1 | 2 | 3;
type QuestUrgency = "low" | "normal" | "high";
type QuestPriority = "secondary" | "main";

function difficultyLabel(d: Difficulty) {
    if (d === 1) return "🟢 Facile";
    if (d === 3) return "🔴 Difficile";
    return "🟡 Standard";
}

function urgencyLabel(u: QuestUrgency) {
    if (u === "low") return "🧊 basse";
    if (u === "high") return "🔥 haute";
    return "⚡ normale";
}

function priorityLabel(p: QuestPriority) {
    if (p === "secondary") return "🌿 secondaire";
    return "🏁 principale";
}

/**
 * Contexte attendu pour questEdit
 * Minimal: quest_id
 * Optionnel: prefill (si tu veux ouvrir avant même que le store ait la quête)
 */
type QuestEditModalContext = {
    quest_id: string;

    // optionnel: prefill
    title?: string | null;
    description?: string | null;
    room_code?: string | null;
    difficulty?: number | null;
    estimate_min?: number | null;
    urgency?: QuestUrgency | null;
};

type Props = {
    onUpdated?: () => void;
};

export default function QuestEditModal(props: Props) {
    const isOpen = useUiStore((s) => s.isModalOpen("questEdit"));
    const closeModal = useUiStore((s) => s.closeModal);
    const modalCtx = useUiStore((s) => s.getModalContext<QuestEditModalContext>("questEdit"));

    const rooms = useGameStore((s) => s.rooms);
    const chapterItems = useGameStore((s) => s.currentChapterQuests);
    const backlog = useGameStore((s) => s.adventureBacklog);

    const updateAdventureQuest = useGameStore((s) => s.updateAdventureQuest);

    const questId = modalCtx?.quest_id?.trim() ?? "";

    // 🔎 retrouve la quête depuis store (chapter ou backlog)
    const quest = useMemo(() => {
        if (!questId) return null;

        const fromBacklog = (Array.isArray(backlog) ? backlog : []).find((q) => q.id === questId);
        if (fromBacklog) return fromBacklog;

        // chapterItems: la quête est dans cq.adventure_quests (souvent array)
        const fromChapter = (Array.isArray(chapterItems) ? chapterItems : [])
            .map((cq) => {
                const q = cq.adventure_quests as any;
                if (!q) return null;
                if (Array.isArray(q)) return q[0] ?? null;
                return q;
            })
            .find((q: any) => q?.id === questId);

        return (fromChapter as any) ?? null;
    }, [questId, backlog, chapterItems]);

    // UI state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [roomCode, setRoomCode] = useState<string>("");
    const [difficulty, setDifficulty] = useState<Difficulty>(2);
    const [estimateMin, setEstimateMin] = useState<string>("");

    const [urgency, setUrgency] = useState<QuestUrgency>("normal");
    const [priority, setPriority] = useState<QuestPriority>("main"); // 🔒 non modifiable pour l’instant

    const [busy, setBusy] = useState(false);

    // reset + hydrate when open
    useEffect(() => {
        if (!isOpen) return;

        const q: any = quest ?? null;

        const initialTitle = (q?.title ?? modalCtx?.title ?? "").toString();
        const initialDesc = (q?.description ?? modalCtx?.description ?? "").toString();
        const initialRoom = (q?.room_code ?? modalCtx?.room_code ?? "").toString();
        const initialDifficulty = Number(q?.difficulty ?? modalCtx?.difficulty ?? 2) as Difficulty;
        const initialEstimate = q?.estimate_min ?? modalCtx?.estimate_min ?? null;
        const initialUrgency = (q?.urgency ?? modalCtx?.urgency ?? "normal") as QuestUrgency;
        const initialPriority = (q?.priority ?? "main") as QuestPriority;

        setTitle(initialTitle);
        setDescription(initialDesc);
        setRoomCode(initialRoom);
        setDifficulty([1, 2, 3].includes(initialDifficulty) ? initialDifficulty : 2);
        setEstimateMin(
            typeof initialEstimate === "number" && Number.isFinite(initialEstimate)
                ? String(initialEstimate)
                : ""
        );
        setUrgency(
            initialUrgency === "low" || initialUrgency === "high" || initialUrgency === "normal"
                ? initialUrgency
                : "normal"
        );
        setPriority(initialPriority === "secondary" ? "secondary" : "main");

        setBusy(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, questId]);

    const roomOptions = useMemo(() => {
        const list = Array.isArray(rooms) ? rooms.slice() : [];
        list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
        return list;
    }, [rooms]);

    const currentRoom = useMemo(() => {
        if (!roomCode) return null;
        return roomOptions.find((r) => r.code === roomCode) ?? null;
    }, [roomCode, roomOptions]);

    const onClose = () => closeModal("questEdit");

    const onSubmit = async () => {
        if (!questId) return;

        const t = title.trim();
        if (!t) return;

        const est = estimateMin.trim() ? Number(estimateMin) : null;
        const safeEst = est != null && Number.isFinite(est) ? Math.max(1, est) : null;

        setBusy(true);
        try {
            const updated = await updateAdventureQuest({
                id: questId,
                title: t,
                description: description.trim() ? description.trim() : null,
                room_code: roomCode ? roomCode : null,
                difficulty,
                estimate_min: safeEst,
                urgency,
                // priority: verrouillé pour l'instant
            });

            if (!updated?.id) return;

            props.onUpdated?.();

            onClose();
        } finally {
            setBusy(false);
        }
    };

    const disableSubmit = !questId || !title.trim() || busy;

    return (
        <UiModal
            id="questEdit"
            maxWidth="lg"
            eyebrow="🛠️ Quête"
            title="Modifier la quête"
            closeOnBackdrop
            closeOnEscape
            footer={
                <div className="flex items-center justify-between gap-2">
                    <ActionButton onClick={onClose}>Annuler</ActionButton>
                    <ActionButton
                        variant="solid"
                        disabled={disableSubmit}
                        onClick={() => void onSubmit()}
                    >
                        {busy ? "⏳ Sauvegarde…" : "✅ Sauvegarder"}
                    </ActionButton>
                </div>
            }
        >
            {!questId ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    ⚠️ Aucune quête ciblée.
                </div>
            ) : (
                <div className="grid gap-3 mt-2">
                    {/* Résumé */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Résumé
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Pill>
                                🚪{" "}
                                {currentRoom
                                    ? `${currentRoom.emoji} ${currentRoom.title}`
                                    : "Toutes pièces"}
                            </Pill>
                            <Pill>{difficultyLabel(difficulty)}</Pill>
                            <Pill>⏱️ {urgencyLabel(urgency)}</Pill>
                            <Pill>🔒 {priorityLabel(priority)}</Pill>
                        </div>
                        {!quest ? (
                            <div className="mt-2 text-xs text-white/45">
                                Note: la quête n’est pas trouvée dans le store (édition quand même
                                possible via l’API).
                            </div>
                        ) : null}
                    </div>

                    {/* Room + Difficulty */}
                    <div className="grid gap-2 sm:grid-cols-[1fr_170px]">
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
                            onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}
                            className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                        >
                            <option value={1}>🟢 Facile</option>
                            <option value={2}>🟡 Standard</option>
                            <option value={3}>🔴 Difficile</option>
                        </select>
                    </div>

                    {/* Urgency */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Urgence
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(["low", "normal", "high"] as QuestUrgency[]).map((u) => (
                                <button
                                    key={u}
                                    type="button"
                                    onClick={() => setUrgency(u)}
                                    className={cn(
                                        "rounded-full px-3 py-1 text-xs ring-1 transition",
                                        urgency === u
                                            ? "bg-white/10 text-white ring-white/15"
                                            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
                                    )}
                                >
                                    {u === "low"
                                        ? "🧊 Basse"
                                        : u === "high"
                                          ? "🔥 Haute"
                                          : "⚡ Normale"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void onSubmit();
                        }}
                        placeholder="Titre de la quête"
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
                        placeholder="Description (optionnel)"
                        className="min-h-[120px] w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                    />

                    {/* Estimate */}
                    <div className="grid gap-2 sm:grid-cols-[1fr_240px]">
                        <div className="text-sm text-white/60">
                            Estimation en minutes (optionnel).
                        </div>
                        <input
                            value={estimateMin}
                            onChange={(e) => setEstimateMin(e.target.value.replace(/[^\d]/g, ""))}
                            placeholder="Estimation (min)"
                            inputMode="numeric"
                            className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                        />
                    </div>
                </div>
            )}
        </UiModal>
    );
}
