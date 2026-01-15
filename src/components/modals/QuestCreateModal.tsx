// src/components/modals/QuestCreateModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores/gameStore";

import {
    UiModal,
    UiActionButton,
    UiActionButtonGroup,
    type UiActionButtonGroupButton,
    UiChip,
    UiPanel,
    UiGradientPanel,
    UiFormText,
    type UiFormTextTone,
    UiFormSelect,
    UiPill,
} from "@/components/ui";
import Helpers from "@/helpers";

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

/**
 * 🧳 Context attendu pour questCreate (optionnel)
 * On reste permissif: la modal doit fonctionner sans contexte.
 */
type QuestCreateModalContext =
    | { mode?: "default" }
    | {
          mode: "chain";
          parent_chapter_quest_id?: string | null;
          parent_adventure_quest_id?: string | null;
          parent_title?: string | null;
          parent_room_code?: string | null;
      };

function difficultyLabel(d: Difficulty) {
    if (d === 1) return "🟢 Facile";
    if (d === 3) return "🔴 Difficile";
    return "🟡 Standard";
}
function urgencyLabel(u: QuestUrgency) {
    if (u === "low") return "🧊 Basse";
    if (u === "high") return "🔥 Haute";
    return "⚡ Normale";
}
function priorityLabel(p: QuestPriority) {
    return p === "secondary" ? "🌿 Secondaire" : "🏁 Principale";
}

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

    const isChainMode = modalCtx?.mode === "chain";

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

        setTitle("");
        setDescription("");
        setRoomCode(props.defaultRoomCode ?? "");
        setDifficulty(2);
        setEstimateMin("");
        setUrgency("normal");
        setTarget(props.defaultTarget ?? "backlog");

        setChainParentChapterQuestId(null);
        setChainParentAdventureQuestId(null);
        setChainParentTitle(null);

        if (modalCtx?.mode === "chain") {
            setChainParentChapterQuestId(modalCtx.parent_chapter_quest_id ?? null);
            setChainParentAdventureQuestId(modalCtx.parent_adventure_quest_id ?? null);
            setChainParentTitle(modalCtx.parent_title ?? null);

            // UX: chain => chapitre
            setTarget("chapter");

            if (modalCtx.parent_room_code) setRoomCode(modalCtx.parent_room_code);
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

    const disableSubmit =
        !adventureId ||
        !title.trim() ||
        busy ||
        (isChainMode && !canAssignToChapter) ||
        (!isChainMode && target === "chapter" && !canAssignToChapter);

    const submitTone: UiFormTextTone = !title.trim() ? "neutral" : "theme";

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
                urgency,
                parent_chapter_quest_id: chainParentChapterQuestId,
                parent_adventure_quest_id: chainParentAdventureQuestId,
            } as any);

            if (!quest?.id) return;

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

    // --- UI Options (UiFormSelect)
    const targetItems = useMemo(
        () => [
            {
                value: "backlog",
                label: "🧺 Backlog",
                description: "Tu la prends quand tu veux.",
                disabled: false,
            },
            {
                value: "chapter",
                label: "📘 Chapitre courant",
                description: canAssignToChapter
                    ? "Elle rejoint ton chapitre actif."
                    : "Aucun chapitre actif.",
                disabled: !canAssignToChapter,
            },
        ],
        [canAssignToChapter]
    );

    const roomItems = useMemo(() => {
        const base = [
            {
                value: "",
                label: "🗺️ Toutes pièces",
                // description: "Pas de lieu précis.",
            },
        ];

        const mapped = roomOptions.map((r: any) => ({
            value: String(r.code),
            label: `${r.emoji ?? "🚪"} ${r.title ?? r.code}`,
        }));

        return base.concat(mapped);
    }, [roomOptions]);

    const difficultyItems = useMemo(
        () => [
            { value: "1", label: "🟢 Facile", hint: "Petit pas, victoire rapide." },
            { value: "2", label: "🟡 Standard", hint: "Rythme normal." },
            { value: "3", label: "🔴 Difficile", hint: "Focus, effort, gros gain." },
        ],
        []
    );

    // --- Controls via UiActionButtonGroup
    const urgencyButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<{ k: QuestUrgency; label: string; hint: string }> = [
            { k: "low", label: "🧊 Basse", hint: "Plus tard" },
            { k: "normal", label: "⚡ Normale", hint: "Cette semaine" },
            { k: "high", label: "🔥 Haute", hint: "Prioritaire" },
        ];

        return items.map((x) => ({
            key: x.k,
            children: x.label,
            hint: urgency === x.k ? "✓" : x.hint,
            active: urgency === x.k,
            onClick: () => setUrgency(x.k),
        }));
    }, [urgency]);

    const modalEyebrow = isChainMode ? "⛓️ Chaîne de quêtes" : "📜 Atelier de quêtes";
    const modalTitle = isChainMode ? "Enchaîner une quête" : "Forger une nouvelle quête";

    return (
        <UiModal
            id="questCreate"
            maxWidth="3xl"
            eyebrow={modalEyebrow}
            title={modalTitle}
            closeOnBackdrop
            closeOnEscape
            footer={
                <div className="flex items-center justify-between gap-2">
                    <UiActionButton variant="soft" onClick={onClose}>
                        Annuler
                    </UiActionButton>

                    <UiActionButton
                        variant="solid"
                        disabled={disableSubmit}
                        onClick={() => void onSubmit()}
                        hint={busy ? "…" : isChainMode ? "⛓️" : "✅"}
                    >
                        {busy ? "⏳ Forging…" : isChainMode ? "✅ Enchaîner" : "✅ Créer la quête"}
                    </UiActionButton>
                </div>
            }
        >
            {!adventureId ? (
                <UiPanel
                    title="Aventure requise"
                    emoji="⚠️"
                    subtitle="Pour créer des quêtes, démarre d’abord une aventure."
                >
                    <div className="text-sm text-white/65">
                        Astuce: depuis l’accueil, lance une aventure puis reviens ici.
                    </div>
                </UiPanel>
            ) : isChainMode && !canAssignToChapter ? (
                <UiPanel
                    title="Chapitre requis"
                    emoji="⚠️"
                    subtitle="Une quête enchaînée doit être attachée à un chapitre actif."
                >
                    <div className="text-sm text-white/65">
                        Ouvre ou crée un chapitre, puis relance l’enchaînement.
                    </div>
                </UiPanel>
            ) : (
                <div className="mt-2 grid gap-3">
                    {/* HERO SUMMARY (sexy) */}
                    {false && (
                        <UiGradientPanel innerClassName="p-4">
                            <div className="grid gap-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-[11px] tracking-[0.22em] text-white/55">
                                        ⚙️ PARAMÈTRES RAPIDES
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* <UiChip tone="theme" icon="🧭">
                                        aventure active
                                    </UiChip> */}

                                        {/* <UiChip tone="neutral" icon="🚪">
                                        {currentRoom
                                            ? `${currentRoom.emoji} ${currentRoom.title}`
                                            : "toutes pièces"}
                                    </UiChip> */}
                                        <Helpers.Chip.room roomCode={roomCode} />
                                        <Helpers.Chip.priority priority={priority} />
                                        <Helpers.Chip.difficulty difficulty={difficulty} />

                                        {/* <UiChip tone="neutral" icon="🎚️">
                                        {difficultyLabel(difficulty)}
                                    </UiChip> */}

                                        <UiChip tone="neutral" icon="⏱️">
                                            {urgencyLabel(urgency)}
                                        </UiChip>

                                        {/* <UiChip tone="neutral" icon="🔒">
                                        {priorityLabel(priority)}
                                    </UiChip> */}
                                    </div>
                                </div>

                                {isChainMode ? (
                                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-sm font-semibold text-white/85">
                                                ⛓️ Mode chaîne
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <UiPill tone="theme">📘 Chapitre courant</UiPill>
                                                {chainParentAdventureQuestId ? (
                                                    <UiPill tone="neutral">🧬 parent lié</UiPill>
                                                ) : null}
                                            </div>
                                        </div>

                                        {chainParentTitle?.trim() ? (
                                            <div className="mt-2 text-sm text-white/70">
                                                Parent:{" "}
                                                <span className="font-semibold text-white/90">
                                                    {chainParentTitle}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="mt-2 text-sm text-white/60">
                                                Crée la prochaine marche. Une action simple, nette,
                                                gagnable.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-sm text-white/60">
                                        Donne-lui un titre clair, choisis le lieu, et lance-la dans
                                        ton flux. Une quête doit donner envie de dire “ok, go”.
                                    </div>
                                )}
                            </div>
                        </UiGradientPanel>
                    )}

                    {/* DESTINATION */}
                    <UiPanel
                        title="Destination"
                        emoji="🧺"
                        // subtitle="Où cette quête doit atterrir dans ton aventure."
                    >
                        {isChainMode ? (
                            <div className="text-sm text-white/70">
                                🔒 Une quête enchaînée rejoint automatiquement le{" "}
                                <span className="font-semibold text-white/90">
                                    chapitre courant
                                </span>
                                .
                            </div>
                        ) : (
                            <UiFormSelect
                                // label="Où cette quête doit atterrir dans ton aventure."
                                placeholder="Sélectionner…"
                                value={target}
                                onChange={(v: any) => setTarget((v ?? "backlog") as Target)}
                                options={targetItems as any}
                                clearable={false}
                                searchable={false}
                                // hint={
                                //     target === "chapter"
                                //         ? "Parfait pour avancer l’histoire maintenant."
                                //         : "Idéal pour vider la tête sans pression."
                                // }
                            />
                        )}
                    </UiPanel>

                    {/* CORE FORM */}
                    <UiPanel
                        title="La quête"
                        emoji="📜"
                        // subtitle="Un titre net + une intention simple. Le reste est optionnel."
                    >
                        <div className="grid gap-3">
                            <UiFormText
                                label="Titre"
                                placeholder={
                                    isChainMode
                                        ? "Ex: Ensuite… vider le lave-vaisselle"
                                        : "Ex: Ranger la table basse"
                                }
                                value={title}
                                onChange={setTitle}
                                required
                                tone={submitTone}
                                leftIcon="✍️"
                                clearable
                                onClear={() => setTitle("")}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") void onSubmit();
                                }}
                                // hint="Astuce: commence par un verbe. Court = plus facile à faire."
                                maxLength={80}
                                showCounter={false}
                            />

                            <UiFormText
                                label="Détails (optionnel)"
                                tone="neutral"
                                placeholder="Ex: vider les câbles, dépoussiérer, remettre les plaids…"
                                value={description}
                                onChange={setDescription}
                                multiline
                                rows={5}
                                autoResize
                                autoResizeMinRows={4}
                                autoResizeMaxRows={10}
                                leftIcon="🗒️"
                                clearable
                                onClear={() => setDescription("")}
                                // hint="Garde-le concret: ce qu’on doit voir une fois terminé."
                                maxLength={500}
                                showCounter={false}
                            />
                        </div>
                    </UiPanel>

                    {/* SETTINGS */}
                    <UiPanel
                        title="Réglages"
                        emoji="🎛️"
                        // subtitle="Lieu, difficulté, urgence, estimation. De quoi guider le pacing."
                    >
                        <div className="grid gap-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <UiFormSelect
                                    label="Lieu"
                                    placeholder="Toutes pièces"
                                    value={roomCode}
                                    onChange={(v: any) => setRoomCode(String(v ?? ""))}
                                    options={roomItems as any}
                                    clearable={false}
                                    // hint="Si tu hésites: laisse vide, tu t’en occuperas en chemin."
                                />

                                <UiFormSelect
                                    label="Difficulté"
                                    placeholder="Standard"
                                    value={String(difficulty)}
                                    onChange={(v: any) =>
                                        setDifficulty(Number(v ?? 2) as Difficulty)
                                    }
                                    options={difficultyItems as any}
                                    clearable={false}
                                    // hint="La difficulté influence le ressenti… et bientôt les récompenses."
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs tracking-[0.18em] text-white/55">
                                        URGENCE
                                    </div>
                                    {/* <UiChip tone="neutral" icon="⏱️">
                                        {urgencyLabel(urgency)}
                                    </UiChip> */}
                                </div>

                                <UiActionButtonGroup
                                    variant="soft"
                                    size="sm"
                                    fullWidth
                                    buttons={urgencyButtons}
                                />

                                {/* <div className="text-xs text-white/45">
                                    Sert au tri, à la planif, et bientôt au “rythme” narratif.
                                </div> */}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[1fr_220px] sm:items-end">
                                {/* <div className="text-sm text-white/60">
                                    Estimation (minutes). Optionnel, mais pratique pour te donner un
                                    “petit contrat” clair.
                                </div> */}

                                <UiFormText
                                    label="Estimation (minutes)"
                                    tone="neutral"
                                    placeholder="Ex: 5"
                                    value={estimateMin}
                                    onChange={(v) => setEstimateMin(v.replace(/[^\d]/g, ""))}
                                    leftIcon="⏳"
                                    // inputClassName="tabular-nums"
                                    // hint="1 à 999"
                                />
                            </div>
                        </div>
                    </UiPanel>
                </div>
            )}
        </UiModal>
    );
}
