"use client";

import React, { useEffect, useMemo, useState } from "react";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import RoomsSelector from "@/components/RoomsSelector";
import { QuestDifficultyPill } from "@/helpers/questDifficulty";
import { useGameStore } from "@/stores/gameStore";
import UiActionButton from "@/components/ui/UiActionButton";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function difficultyLabel(d: number) {
    if (d <= 1) return "1 • Facile";
    if (d === 2) return "2 • Standard";
    return "3 • Difficile";
}

export default function OnboardingQuestsPage() {
    const bootstrapOnboardingQuests = useGameStore((s) => (s as any).bootstrapOnboardingQuests) as
        | (() => Promise<void>)
        | undefined;

    const refreshStartAdventure = useGameStore((s) => s.refreshStartAdventure);

    const loading = useGameStore((s) => s.startAdventureLoading || s.loading);
    const saving = useGameStore((s) => s.saving);
    const error = useGameStore((s) => s.error);

    const adventure = useGameStore((s) => s.startAdventureData.adventure) ?? null;
    const rooms = useGameStore((s) => s.startAdventureData.rooms);
    const backlog = useGameStore((s) => s.startAdventureData.backlog);

    const addBacklogQuest = useGameStore((s) => s.addBacklogQuestToStartAdventure);
    const generateBacklog = useGameStore((s) => s.generateBacklogForStartAdventure);

    const launchFirstChapter = useGameStore((s) => s.launchStartAdventureFirstChapter);

    // UI local
    const [roomCode, setRoomCode] = useState<string>("");
    const [questTitle, setQuestTitle] = useState("");
    const [questDifficulty, setQuestDifficulty] = useState<1 | 2 | 3>(2);
    const [creatingQuest, setCreatingQuest] = useState(false);

    const [generating, setGenerating] = useState(false);
    const [aiCount, setAiCount] = useState<1 | 3 | 5 | 8 | 12>(5);

    const [starting, setStarting] = useState(false);

    useEffect(() => {
        if (typeof bootstrapOnboardingQuests !== "function") return;
        void bootstrapOnboardingQuests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!roomCode) return;
        const stillExists = rooms.some((r) => r.code === roomCode);
        if (!stillExists) setRoomCode("");
    }, [rooms, roomCode]);

    const bannerTitle = useMemo(() => {
        if (!adventure) return "Préparer le monde";
        const t = (adventure as any)?.type_title;
        const title = adventure.title ?? "Aventure";
        return t ? `${t} · ${title}` : title;
    }, [adventure]);

    const canAdd = !!questTitle.trim() && !creatingQuest && !!adventure?.id;

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
            // on reste simple ici (pas de modal)
            alert("Ajoute/active au moins une pièce avant de générer des quêtes 🏠");
            return;
        }

        setGenerating(true);
        try {
            await generateBacklog({ perRoomCount: aiCount });
        } finally {
            setGenerating(false);
        }
    };

    const onNext = async () => {
        if (!adventure?.id) return;

        if (backlog.length === 0) {
            alert("Ajoute au moins une quête au backlog avant de continuer 📜");
            return;
        }

        setStarting(true);
        try {
            const chapterCode = await launchFirstChapter();
            if (!chapterCode) return;

            // Étape suivante d'onboarding (à créer ensuite)
            // Tu peux aussi envoyer vers /start/chapter/... si tu veux démarrer direct le jeu.
            window.location.href = "/onboarding/finish";
        } finally {
            setStarting(false);
        }
    };

    return (
        <RpgShell
            title="Quêtes"
            subtitle="🏠 Définis tes pièces, puis forge ton premier backlog. Le monde s’ouvre."
            noRightSlot
            returnButton={false}
            largeLogo
        >
            <div className="grid gap-4">
                {/* HERO */}
                <div
                    className={cn(
                        "relative overflow-hidden rounded-[28px] ring-1",
                        "bg-black/30 ring-white/10"
                    )}
                >
                    {/* Background image */}
                    <div
                        className="absolute inset-0 bg-no-repeat bg-position-[right_bottom_-1rem] bg-size-[auto_250px] "
                        style={{
                            backgroundImage: "url('/assets/images/onboarding/quests.png')",
                        }}
                    />

                    {/* Gradient overlay (left → right) */}
                    <div
                        className={cn(
                            "absolute inset-0",
                            "bg-linear-to-r",
                            "from-black via-black/85 to-transparent"
                        )}
                    />

                    {/* Content */}
                    <div className="relative p-6 sm:p-8">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Renaissance
                        </div>

                        <h1 className="mt-4 font-main-title text-3xl sm:text-4xl text-white/95">
                            Façonner le terrain.
                        </h1>

                        <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                            Les pièces posent la carte. Les quêtes allument les premières lanternes.
                        </p>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-2xl bg-red-500/10 p-4 rpg-text-sm text-red-200 ring-1 ring-red-400/20">
                        ⚠️ {error}
                    </div>
                ) : null}

                {loading ? (
                    <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                        ⏳ Chargement…
                    </div>
                ) : !adventure?.id ? (
                    <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                        Aucune aventure active détectée. (Vérifie l’étape 1 / démarrage aventure.)
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {/* ROOMS */}
                        <Panel
                            title="Tes pièces"
                            emoji="🚪"
                            subtitle="Active les zones du foyer concernées par l’aventure."
                            right={
                                rooms.length ? <Pill>{rooms.length} actives</Pill> : <Pill>—</Pill>
                            }
                        >
                            <RoomsSelector
                                adventureId={adventure.id}
                                onChanged={() => void refreshStartAdventure()}
                            />
                        </Panel>

                        {/* BACKLOG */}
                        <Panel
                            title="Premières quêtes"
                            emoji="📜"
                            subtitle="Ajoute quelques missions simples. L’IA peut compléter ensuite."
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
                                        placeholder="Ex: Ranger la table basse (10 min)…"
                                        className={cn(
                                            "w-full resize-y rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/90",
                                            "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                            "focus:ring-2 focus:ring-white/25"
                                        )}
                                    />

                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                                        Aucun backlog. Ajoute quelques quêtes, ou laisse l’IA semer
                                        les graines. 🎲
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

                        {/* IA */}
                        <Panel
                            title="Coup de pouce IA"
                            emoji="🧠"
                            subtitle="Génère des quêtes courtes et concrètes, pièce par pièce."
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
                                L’IA va proposer des missions simples. Tu peux ensuite garder,
                                modifier, ou ignorer. C’est un buffet, pas une obligation. 🍱
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <ActionButton
                                    variant={aiCount === 1 ? "solid" : "soft"}
                                    onClick={() => setAiCount(1)}
                                >
                                    1
                                </ActionButton>
                                <ActionButton
                                    variant={aiCount === 3 ? "solid" : "soft"}
                                    onClick={() => setAiCount(3)}
                                >
                                    3
                                </ActionButton>
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

                        {/* VALIDATION */}
                        <Panel
                            title="Démarrer"
                            emoji="🏁"
                            subtitle="Pièces et backlog sont prêts. Prochaine étape: le premier chapitre."
                        >
                            <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                                <div className="rpg-text-sm text-white/70">
                                    Pièces actives:{" "}
                                    <b className="text-white/85">{rooms.length || "—"}</b>
                                    <br />
                                    Quêtes au backlog:{" "}
                                    <b className="text-white/85">{backlog.length || "—"}</b>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <UiActionButton
                                        variant="master"
                                        size="xl"
                                        disabled={
                                            loading || saving || starting || backlog.length === 0
                                        }
                                        onClick={() => void onNext()}
                                    >
                                        {starting ? "⏳" : "✨ Étape suivante"}
                                    </UiActionButton>
                                </div>

                                {/* {backlog.length === 0 ? (
                                    <div className="mt-3 text-xs text-white/45">
                                        Ajoute au moins une quête (ou génère via IA) pour continuer.
                                    </div>
                                ) : null} */}
                            </div>
                        </Panel>
                    </div>
                )}
            </div>
        </RpgShell>
    );
}
