"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import RoomsSelector from "@/components/RoomsSelector";
import { QuestDifficultyPill } from "@/helpers/questDifficulty";

import { useGameStore } from "@/stores/gameStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function difficultyLabel(d: number) {
    if (d <= 1) return "1 • Facile";
    if (d === 2) return "2 • Standard";
    return "3 • Difficile";
}

export default function StartAdventureSetupPage() {
    const router = useRouter();
    const params = useParams<{ instance_code: string }>();

    const instanceCode = useMemo(() => {
        const raw = params?.instance_code;
        return typeof raw === "string" ? raw : "";
    }, [params]);

    const bootstrapStartAdventure = useGameStore((s) => s.bootstrapStartAdventure);
    const refreshStartAdventure = useGameStore((s) => s.refreshStartAdventure);

    const loading = useGameStore((s) => s.startAdventureLoading);

    const adventure = useGameStore((s) => s.startAdventureData.adventure);
    const rooms = useGameStore((s) => s.startAdventureData.rooms);
    const backlog = useGameStore((s) => s.startAdventureData.backlog);

    const contextText = useGameStore((s) => s.startAdventureData.context_text);
    const setContextText = useGameStore((s) => s.setStartAdventureContextText);
    const saveContext = useGameStore((s) => s.saveStartAdventureContext);

    const addBacklogQuest = useGameStore((s) => s.addBacklogQuestToStartAdventure);
    const generateBacklog = useGameStore((s) => s.generateBacklogForStartAdventure);
    const launchFirstChapter = useGameStore((s) => s.launchStartAdventureFirstChapter);

    // Form UI local
    const [roomCode, setRoomCode] = useState<string>("");
    const [questTitle, setQuestTitle] = useState("");
    const [questDifficulty, setQuestDifficulty] = useState<1 | 2 | 3>(2);
    const [creatingQuest, setCreatingQuest] = useState(false);

    const [generating, setGenerating] = useState(false);
    const [aiCount, setAiCount] = useState<5 | 8 | 12>(5);

    const [contextSaving, setContextSaving] = useState(false);
    const [startingChapter, setStartingChapter] = useState(false);

    useEffect(() => {
        if (!instanceCode) return;
        void bootstrapStartAdventure(instanceCode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instanceCode]);

    useEffect(() => {
        if (!roomCode) return;
        const stillExists = rooms.some((r) => r.code === roomCode);
        if (!stillExists) setRoomCode("");
    }, [rooms, roomCode]);

    const onAddQuest = async () => {
        if (!adventure?.id) return;
        const t = questTitle.trim();
        if (!t || creatingQuest) return;

        setCreatingQuest(true);
        try {
            const ok = await addBacklogQuest({
                room_code: roomCode || null,
                title: t,
                difficulty: questDifficulty,
            });

            if (ok) {
                setQuestTitle("");
                setQuestDifficulty(2);
            }
        } finally {
            setCreatingQuest(false);
        }
    };

    const onGenerateAi = async () => {
        if (!adventure?.id) return;

        if (rooms.length === 0) {
            alert("Ajoute/active au moins une pièce avant de générer des quêtes 🏠");
            return;
        }

        setGenerating(true);
        try {
            const n = await generateBacklog({ perRoomCount: aiCount });
            alert(`🎲 ${n} quêtes ajoutées au backlog ✅`);
        } finally {
            setGenerating(false);
        }
    };

    const onSaveContext = async () => {
        setContextSaving(true);
        try {
            await saveContext();
        } finally {
            setContextSaving(false);
        }
    };

    const onStartFirstChapter = async () => {
        if (!adventure?.id) return;

        if (backlog.length === 0) {
            alert("Ajoute au moins une quête au backlog avant de démarrer 📜");
            return;
        }

        setStartingChapter(true);
        try {
            const chapterCode = await launchFirstChapter();
            if (!chapterCode) return;
            router.push(`/start/chapter/${encodeURIComponent(chapterCode)}`);
        } finally {
            setStartingChapter(false);
        }
    };

    const canAdd = !!questTitle.trim() && !creatingQuest && !!adventure?.id;

    const bannerTitle = adventure?.type_title
        ? `${adventure.type_title} · ${adventure.title}`
        : (adventure?.title ?? "Aventure");

    return (
        <RpgShell
            title="Avant le départ"
            subtitle="Active tes pièces, forge ton backlog, puis lance le premier chapitre."
            rightSlot={null}
        >
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement…
                </div>
            ) : !instanceCode ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    URL invalide: instance_code manquant.
                </div>
            ) : !adventure ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    Aventure introuvable pour: <b>{instanceCode}</b>
                </div>
            ) : (
                <div className="grid gap-4">
                    {/* ✅ Bannière */}
                    <div className="rounded-[28px] bg-black/25 p-5 ring-1 ring-white/10">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    🧭 Préparation d’aventure
                                </div>
                                <div className="mt-2 text-lg font-semibold text-white/90 truncate">
                                    {bannerTitle}
                                </div>
                                {adventure.description ? (
                                    <div className="mt-2 text-sm text-white/65">
                                        {adventure.description}
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Pill>🏷️ {instanceCode}</Pill>
                                {rooms.length ? <Pill>🚪 {rooms.length} pièces</Pill> : null}
                                <Pill>📜 {backlog.length} quêtes</Pill>
                            </div>
                        </div>
                    </div>

                    {/* ✅ Cartes */}
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        {/* ✅ Pièces: auto-refresh via callback */}
                        <RoomsSelector
                            adventureId={adventure.id}
                            onChanged={() => void refreshStartAdventure()}
                        />

                        {/* ✅ Backlog */}
                        <Panel
                            title="Backlog de quêtes"
                            emoji="📜"
                            subtitle="Définis les missions avant de jouer. L’IA viendra booster ça."
                            right={<Pill>{backlog.length} quêtes</Pill>}
                        >
                            <div className="space-y-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="text-xs tracking-[0.18em] text-white/55">
                                            🗺️ PIÈCE
                                        </div>
                                        <select
                                            value={roomCode}
                                            onChange={(e) => setRoomCode(e.target.value)}
                                            className="w-full rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/80 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                                        >
                                            <option value="">🗺️ Toutes pièces</option>
                                            {rooms.map((r) => (
                                                <option key={r.id} value={r.code}>
                                                    🚪 {r.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs tracking-[0.18em] text-white/55">
                                            🎚️ DIFFICULTÉ
                                        </div>
                                        <select
                                            value={String(questDifficulty)}
                                            onChange={(e) =>
                                                setQuestDifficulty(
                                                    (Number(e.target.value) as 1 | 2 | 3) ?? 2
                                                )
                                            }
                                            className="w-full rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/80 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                                        >
                                            <option value="1">🟢 {difficultyLabel(1)}</option>
                                            <option value="2">🟡 {difficultyLabel(2)}</option>
                                            <option value="3">🔴 {difficultyLabel(3)}</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs tracking-[0.18em] text-white/55">
                                        ✍️ QUÊTE
                                    </div>

                                    <textarea
                                        value={questTitle}
                                        onChange={(e) => setQuestTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                                e.preventDefault();
                                                void onAddQuest();
                                            }
                                        }}
                                        rows={3}
                                        placeholder="Ex: Vider le plan de travail (10 min)…"
                                        className={cn(
                                            "w-full resize-y rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/90",
                                            "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                            "focus:ring-2 focus:ring-white/25"
                                        )}
                                    />

                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                        <div className="text-xs text-white/45">
                                            Astuce: ⌘/Ctrl + Entrée pour ajouter.
                                        </div>
                                        <ActionButton
                                            onClick={() => void onAddQuest()}
                                            variant="solid"
                                            disabled={!canAdd}
                                        >
                                            {creatingQuest ? "⏳ Ajout…" : "➕ Ajouter"}
                                        </ActionButton>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                {backlog.length === 0 ? (
                                    <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                                        Aucun backlog. Ajoute quelques quêtes ou attends l’IA 🎲
                                    </div>
                                ) : (
                                    backlog.map((q) => {
                                        const roomLabel = q.room_code
                                            ? (rooms.find((r) => r.code === q.room_code)?.title ??
                                              q.room_code)
                                            : null;

                                        return (
                                            <div
                                                key={q.id}
                                                className="w-full rounded-2xl bg-black/25 p-4 text-left ring-1 ring-white/10"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="text-white/90">
                                                        📌 {q.title}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {roomLabel ? (
                                                            <Pill>🚪 {roomLabel}</Pill>
                                                        ) : (
                                                            <Pill>🗺️ sans pièce</Pill>
                                                        )}
                                                        <QuestDifficultyPill
                                                            difficulty={q.difficulty ?? 2}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Panel>

                        {/* ✅ IA */}
                        <Panel
                            title="IA"
                            emoji="🧠"
                            subtitle="Génère un backlog propre, pièce par pièce."
                            right={
                                <div className="flex items-center gap-2">
                                    <Pill>🎲 {aiCount}/pièce</Pill>
                                    <ActionButton
                                        variant="solid"
                                        onClick={() => void onGenerateAi()}
                                        disabled={
                                            !adventure?.id || rooms.length === 0 || generating
                                        }
                                    >
                                        {generating ? "⏳ Génération…" : "🎲 Générer"}
                                    </ActionButton>
                                </div>
                            }
                        >
                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 rpg-text-sm text-white/70">
                                L’IA propose des quêtes concrètes et courtes pour chaque pièce
                                active.
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <ActionButton
                                    variant={aiCount === 5 ? "solid" : "soft"}
                                    onClick={() => setAiCount(5)}
                                >
                                    5
                                </ActionButton>
                                <ActionButton
                                    variant={aiCount === 8 ? "solid" : "soft"}
                                    onClick={() => setAiCount(8)}
                                >
                                    8
                                </ActionButton>
                                <ActionButton
                                    variant={aiCount === 12 ? "solid" : "soft"}
                                    onClick={() => setAiCount(12)}
                                >
                                    12
                                </ActionButton>

                                <Pill>💡 Conseil: commence par 5</Pill>
                                <Pill>🧼 Ciblé, pas parfait</Pill>
                            </div>
                        </Panel>

                        {/* ✅ Contexte aventure */}
                        <Panel
                            title="Contexte d’aventure"
                            emoji="🧾"
                            subtitle="Pourquoi cette aventure, qui est concerné, contraintes, objectifs…"
                            right={<Pill>{contextSaving ? "💾" : "✍️"}</Pill>}
                        >
                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                <textarea
                                    value={contextText}
                                    onChange={(e) => setContextText(e.target.value)}
                                    placeholder={
                                        "Ex:\n- Je fais cette aventure pour retrouver une maison stable.\n- Foyer: 2 adultes + 1 enfant.\n- Contraintes: 20 min max / jour.\n- Sensible: éviter le bruit le soir.\n"
                                    }
                                    className="min-h-[180px] w-full resize-none rounded-2xl bg-black/25 px-4 py-3 rpg-text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/35 focus:ring-2 focus:ring-white/25"
                                />

                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <div className="text-xs text-white/45">
                                        Ce contexte sera utilisé par le MJ pour les missions et
                                        encouragements.
                                    </div>

                                    <ActionButton
                                        variant="solid"
                                        disabled={contextSaving}
                                        onClick={() => void onSaveContext()}
                                    >
                                        {contextSaving ? "⏳ Sauvegarde…" : "💾 Sauvegarder"}
                                    </ActionButton>
                                </div>
                            </div>
                        </Panel>
                    </div>

                    {/* ✅ CTA final full width (sous tout) */}
                    <ActionButton
                        variant="solid"
                        onClick={() => void onStartFirstChapter()}
                        disabled={!adventure?.id || backlog.length === 0 || startingChapter}
                        className="w-full justify-center py-4 rounded-3xl text-base"
                    >
                        {startingChapter ? "⏳ Démarrage…" : "🚀 Démarrer le premier chapitre"}
                    </ActionButton>

                    <div className="text-xs text-white/50 text-center">
                        Astuce: vise 8–15 quêtes réparties sur les pièces. Ensuite, feu vert. 🔥
                    </div>
                </div>
            )}
        </RpgShell>
    );
}
