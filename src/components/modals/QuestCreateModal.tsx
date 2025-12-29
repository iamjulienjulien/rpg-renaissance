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
    defaultAdventureId?: string | null;
    defaultRoomCode?: string | null;
    defaultTarget?: "backlog" | "chapter";
    onCreated?: () => void;
};

type Difficulty = 1 | 2 | 3;
type Target = "backlog" | "chapter";

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
 * 🧳 Context attendu pour questCreate (optionnel)
 * On reste permissif: la modal doit fonctionner sans contexte.
 */
type QuestCreateModalContext =
    | {
          mode?: "default";
      }
    | {
          mode: "chain";
          parent_chapter_quest_id?: string | null;
          parent_adventure_quest_id?: string | null;
          parent_title?: string | null;
          parent_room_code?: string | null;
      };

export default function QuestCreateModal(props: Props) {
    const isOpen = useUiStore((s) => s.isModalOpen("questCreate"));
    const closeModal = useUiStore((s) => s.closeModal);
    const modalCtx = useUiStore((s) => s.getModalContext<QuestCreateModalContext>("questCreate"));

    const rooms = useGameStore((s) => s.rooms);
    const currentChapter = useGameStore((s) => s.currentChapter);
    const currentAdventure = useGameStore((s) => s.currentAdventure);

    const createAdventureQuest = useGameStore((s) => s.createAdventureQuest);
    const assignQuestToCurrentChapter = useGameStore((s) => s.assignQuestToCurrentChapter);

    const adventureId = currentAdventure?.id ?? props.defaultAdventureId ?? null;
    const canAssignToChapter = !!currentChapter?.id;

    // 🔗 chain mode (UI)
    const isChainMode = modalCtx?.mode === "chain";

    // 🔗 garde le contexte en state local (pratique pour l'étape suivante)
    const [chainParentChapterQuestId, setChainParentChapterQuestId] = useState<string | null>(null);
    const [chainParentAdventureQuestId, setChainParentAdventureQuestId] = useState<string | null>(
        null
    );
    const [chainParentTitle, setChainParentTitle] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [roomCode, setRoomCode] = useState<string>("");
    const [difficulty, setDifficulty] = useState<Difficulty>(2);
    const [estimateMin, setEstimateMin] = useState<string>("");

    const [urgency, setUrgency] = useState<QuestUrgency>("normal");
    const [priority] = useState<QuestPriority>("main"); // 🔒 non modifiable pour l’instant

    const [target, setTarget] = useState<Target>(props.defaultTarget ?? "backlog");
    const [busy, setBusy] = useState(false);

    // reset defaults when open (+ applique contexte)
    useEffect(() => {
        if (!isOpen) return;

        // base reset
        setTitle("");
        setDescription("");
        setRoomCode(props.defaultRoomCode ?? "");
        setDifficulty(2);
        setEstimateMin("");
        setUrgency("normal");
        setTarget(props.defaultTarget ?? "backlog");

        // chain reset
        setChainParentChapterQuestId(null);
        setChainParentAdventureQuestId(null);
        setChainParentTitle(null);

        // ✅ appliquer le contexte si présent
        if (modalCtx?.mode === "chain") {
            setChainParentChapterQuestId(modalCtx.parent_chapter_quest_id ?? null);
            setChainParentAdventureQuestId(modalCtx.parent_adventure_quest_id ?? null);
            setChainParentTitle(modalCtx.parent_title ?? null);

            // UX simple: une quête enchaînée est faite pour le chapitre courant
            setTarget("chapter");

            // optionnel: si on a une pièce parent, on peut pré-sélectionner
            if (modalCtx.parent_room_code) {
                setRoomCode(modalCtx.parent_room_code);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const roomOptions = useMemo(() => {
        const list = Array.isArray(rooms) ? rooms.slice() : [];
        list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
        return list;
    }, [rooms]);

    const currentRoom = useMemo(() => {
        if (!roomCode) return null;
        return roomOptions.find((r) => r.code === roomCode) ?? null;
    }, [roomCode, roomOptions]);

    const onClose = () => closeModal("questCreate");

    const onSubmit = async () => {
        if (!adventureId) return;
        const t = title.trim();
        if (!t) return;

        const est = estimateMin.trim() ? Number(estimateMin) : null;
        const safeEst = est != null && Number.isFinite(est) ? Math.max(1, est) : null;

        setBusy(true);
        try {
            const quest = await createAdventureQuest({
                adventure_id: adventureId,
                room_code: roomCode ? roomCode : null,
                title: t,
                description: description.trim() ? description.trim() : null,
                difficulty,
                estimate_min: safeEst,
                urgency, // ✅ NEW
                // priority: gérée serveur pour l’instant (ou bientôt)
                //
                // 🔗 chain: on ne l'envoie pas encore tant que la BDD/routes ne sont pas prêtes.
                parent_chapter_quest_id: chainParentChapterQuestId,
                parent_adventure_quest_id: chainParentAdventureQuestId,
            } as any);

            if (!quest?.id) return;

            // mode chain: target forcée chapter si possible
            const wantChapter = isChainMode ? true : target === "chapter";

            if (wantChapter && canAssignToChapter) {
                await assignQuestToCurrentChapter(quest.id);
            }
            props.onCreated?.();

            onClose();
        } finally {
            setBusy(false);
        }
    };

    const disableSubmit =
        !adventureId || !title.trim() || busy || (isChainMode && !canAssignToChapter);

    const eyebrow = isChainMode ? "⛓️ Chaîne de quêtes" : "📜 Quête";
    const modalTitle = isChainMode ? "Enchaîner une quête" : "Créer une nouvelle quête";

    return (
        <UiModal
            id="questCreate"
            maxWidth="lg"
            eyebrow={eyebrow}
            title={modalTitle}
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
                        {busy ? "⏳ Création…" : isChainMode ? "✅ Enchaîner" : "✅ Créer"}
                    </ActionButton>
                </div>
            }
        >
            {!adventureId ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    ⚠️ Aucune aventure active. Lance une aventure pour créer une quête.
                </div>
            ) : isChainMode && !canAssignToChapter ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    ⚠️ Impossible d’enchaîner: aucun chapitre actif.
                </div>
            ) : (
                <div className="grid gap-3 mt-2">
                    {/* 🔗 Bandeau chain (simple, informatif) */}
                    {isChainMode ? (
                        <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Contexte
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Pill>⛓️ Quête enchaînée</Pill>
                                <Pill>📘 Chapitre courant</Pill>
                                {chainParentAdventureQuestId ? <Pill>🧬 Parent OK</Pill> : null}
                                {chainParentChapterQuestId ? (
                                    <Pill>🪝 Lien chapitre OK</Pill>
                                ) : null}
                            </div>

                            {chainParentTitle?.trim() ? (
                                <div className="mt-2 text-sm text-white/70">
                                    Parent:{" "}
                                    <span className="text-white/90 font-semibold">
                                        {chainParentTitle}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {/* Résumé rapide */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Résumé
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Pill>
                                {isChainMode || target === "chapter"
                                    ? "📘 Chapitre courant"
                                    : "🧺 Backlog"}
                            </Pill>
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

                        {!canAssignToChapter && !isChainMode ? (
                            <div className="mt-2 text-xs text-white/45">
                                📘 Chapitre courant indisponible: aucun chapitre actif.
                            </div>
                        ) : null}
                    </div>

                    {/* Target */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Destination
                        </div>

                        {isChainMode ? (
                            <div className="mt-2 text-sm text-white/70">
                                🔒 Une quête enchaînée est ajoutée au{" "}
                                <span className="text-white/90 font-semibold">
                                    chapitre courant
                                </span>
                                .
                            </div>
                        ) : (
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
                        )}
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

                    {/* Urgency + Priority */}
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
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
                            <div className="mt-2 text-xs text-white/45">
                                Sert au tri, à la planif, et bientôt au pacing.
                            </div>
                        </div>

                        <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Priorité
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full px-3 py-1 text-xs ring-1 bg-white/5 text-white/70 ring-white/10">
                                    🔒 {priorityLabel(priority)}
                                </span>
                            </div>
                            <div className="mt-2 text-xs text-white/45">
                                Non modifiable pour l’instant (quêtes secondaires à venir).
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void onSubmit();
                        }}
                        placeholder={
                            isChainMode
                                ? "Ex: Ensuite… vider le lave-vaisselle (5 min)…"
                                : "Ex: Ranger la table basse (5 min)…"
                        }
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
                            Estimation en minutes (optionnel). Bientôt utile pour pacing et stats.
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
