"use client";

// React
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// Components
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import MasterCard from "@/components/ui/MasterCard";
import UiModal from "@/components/ui/UiModal";
import { UiMotionDiv } from "@/components/motion/UiMotion";

// Helpers
import { QuestDifficultyPill } from "@/helpers/questDifficulty";
import { QuestStatusPill } from "@/helpers/questStatus";
import { questRoomEmoji, questRoomLabel, QuestRoomPill } from "@/helpers/questRoom";

// Store
import { useGameStore } from "@/stores/gameStore";
import { useUiStore } from "@/stores/uiStore";

type Chapter = {
    id: string;
    adventure_id: string | null;
    title: string;
    pace: "calme" | "standard" | "intense";
    status: "draft" | "active" | "done";
    created_at: string;
    adventure_code?: string | null;
    context_text?: string | null;
};

type Adventure = {
    id: string;
    code: string;
    title: string;
    type?: string | null;
    description?: string | null;
    emoji?: string | null;
    context_text?: string | null;
};

type AdventureQuest = {
    id: string;
    adventure_id: string;
    room_code: string | null;
    status: string | null;
    title: string;
    description: string | null;
    difficulty: number;
    estimate_min: number | null;
    created_at?: string;
};

type ChapterQuest = {
    id: string;
    chapter_id: string;
    adventure_quest_id: string;
    status: "todo" | "doing" | "done";
    room_code: string | null;
    room_title?: string | null;
    created_at: string;
    adventure_quests: AdventureQuest | AdventureQuest[] | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function normalizeQuest(q: ChapterQuest["adventure_quests"]): AdventureQuest | null {
    if (!q) return null;
    if (Array.isArray(q)) return q[0] ?? null;
    return q;
}

function paceEmoji(pace: Chapter["pace"]) {
    if (pace === "calme") return "🌙";
    if (pace === "intense") return "🔥";
    return "⚡";
}

function adventureFallbackEmoji(code?: string | null) {
    if (code === "home_realignment") return "🏠";
    return "🧭";
}

function adventureFallbackTitle(code?: string | null) {
    if (code === "home_realignment") return "Réalignement du foyer";
    if (code) return code;
    return "Aventure";
}

function adventureFallbackDescription(code?: string | null) {
    if (code === "home_realignment") {
        return "Remettre le foyer d’aplomb, pièce par pièce. Un RPG du quotidien où chaque geste compte.";
    }
    return "Une aventure en cours. La suite s’écrit avec tes actions.";
}

async function safeJson(res: Response) {
    return res.json().catch(() => null);
}

export default function AdventurePage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [adventure, setAdventure] = useState<Adventure | null>(null);

    const [chapterItems, setChapterItems] = useState<ChapterQuest[]>([]);
    const [allAdventureQuests, setAllAdventureQuests] = useState<AdventureQuest[]>([]);

    // Quick add backlog
    const [newQuestTitle, setNewQuestTitle] = useState("");
    const [newQuestRoomCode, setNewQuestRoomCode] = useState<string>("");
    const [creating, setCreating] = useState(false);

    const bootstrap = useGameStore((s) => s.bootstrap);
    const rooms = useGameStore((s) => s.rooms);

    // Affectation
    const assignQuestToCurrentChapter = useGameStore((s) => s.assignQuestToCurrentChapter);
    const setStoreChapter = useGameStore((s) => s.setChapter);
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [chapterPulse, setChapterPulse] = useState(false);

    const unassignQuestFromChapter = useGameStore((s) => s.unassignQuestFromChapter);
    const [unassigningId, setUnassigningId] = useState<string | null>(null);

    // Renown modal (store)
    const lastRenownGain = useGameStore((s) => s.lastRenownGain);
    const clearLastRenownGain = useGameStore((s) => s.clearLastRenownGain);

    const congratsById = useGameStore((s) => s.congratsByChapterQuestId);
    const congratsLoadingById = useGameStore((s) => s.congratsLoadingById);

    const cqId = lastRenownGain?.chapterQuestId;
    const congrats = cqId ? congratsById[cqId] : undefined;
    const congratsLoading = cqId ? !!congratsLoadingById[cqId] : false;

    // Drafts + saving (les modals sont dans uiStore, les champs restent ici)
    const [advContextDraft, setAdvContextDraft] = useState("");
    const [advConfigSaving, setAdvConfigSaving] = useState(false);

    const [chapterContextDraft, setChapterContextDraft] = useState("");
    const [chapterConfigSaving, setChapterConfigSaving] = useState(false);

    // Transition (modal dans uiStore)
    const [transitionBusy, setTransitionBusy] = useState(false);
    const [nextTitle, setNextTitle] = useState("");
    const [nextPace, setNextPace] = useState<Chapter["pace"]>("standard");
    const [nextAiContext, setNextAiContext] = useState("");
    const [carryOver, setCarryOver] = useState<ChapterQuest[]>([]);
    const [selectedBacklogIds, setSelectedBacklogIds] = useState<Set<string>>(new Set());

    // UI store: modals
    const isModalOpen = useUiStore((s) => s.isModalOpen);
    const openModal = useUiStore((s) => s.openModal);
    const closeModal = useUiStore((s) => s.closeModal);

    const advConfigOpen = isModalOpen("adventureConfig");
    const chapterConfigOpen = isModalOpen("chapterConfig");
    const renownOpen = isModalOpen("renownGain");
    const transitionOpen = isModalOpen("chapterTransition");

    const loadAll = async (mode: "initial" | "refresh") => {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        try {
            const chRes = await fetch("/api/chapters?latest=1", { cache: "no-store" });
            const chJson = await safeJson(chRes);
            const ch = (chJson?.chapter ?? null) as Chapter | null;

            setChapter(ch);
            setStoreChapter(ch);

            if (!ch?.id || !ch.adventure_id) {
                setAdventure(null);
                setChapterItems([]);
                setAllAdventureQuests([]);
                return;
            }

            const cqRes = await fetch(
                `/api/chapter-quests?chapterId=${encodeURIComponent(ch.id)}`,
                { cache: "no-store" }
            );
            const cqJson = await safeJson(cqRes);
            setChapterItems((cqJson?.items ?? []) as ChapterQuest[]);

            const advRes = await fetch(
                `/api/adventures?id=${encodeURIComponent(ch.adventure_id)}`,
                {
                    cache: "no-store",
                }
            );
            const advJson = await safeJson(advRes);
            setAdventure((advJson?.adventure ?? null) as Adventure | null);

            const aqRes = await fetch(
                `/api/adventure-quests?adventureId=${encodeURIComponent(ch.adventure_id)}`,
                { cache: "no-store" }
            );
            const aqJson = await safeJson(aqRes);
            setAllAdventureQuests((aqJson?.quests ?? []) as AdventureQuest[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void loadAll("initial");
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const chapterGrouped = useMemo(() => {
        const map = new Map<string, Array<{ cq: ChapterQuest; q: AdventureQuest | null }>>();

        for (const cq of chapterItems) {
            const q = normalizeQuest(cq.adventure_quests);
            const key =
                cq.room_title ??
                (q?.room_code ? q.room_code : null) ??
                (cq.room_code ? cq.room_code : null) ??
                "Sans pièce";

            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push({ cq, q });
        }

        const ordered = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
        for (const [, arr] of ordered) {
            arr.sort((a, b) => (a.q?.title ?? "").localeCompare(b.q?.title ?? "", "fr"));
        }
        return ordered;
    }, [chapterItems]);

    const chapterQuestIds = useMemo(
        () => new Set(chapterItems.map((x) => x.adventure_quest_id)),
        [chapterItems]
    );

    const backlog = useMemo(() => {
        return allAdventureQuests
            .filter((q) => !chapterQuestIds.has(q.id) && q.status !== "done")
            .slice()
            .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "fr"));
    }, [allAdventureQuests, chapterQuestIds]);

    const goPrepare = () => {
        const code = adventure?.code ?? chapter?.adventure_code ?? null;
        if (code === "home_realignment") {
            router.push("/adventure/home-realignment");
            return;
        }
        router.push("/new");
    };

    const addBacklogQuest = async () => {
        if (!chapter?.adventure_id) return;

        const title = newQuestTitle.trim();
        if (!title) return;

        setCreating(true);
        try {
            const res = await fetch("/api/adventure-quests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adventure_id: chapter.adventure_id,
                    room_code: newQuestRoomCode || null,
                    title,
                    difficulty: 2,
                    estimate_min: null,
                }),
            });

            const json = await safeJson(res);
            if (!res.ok) {
                console.error(json?.error ?? "Create quest failed");
                return;
            }

            setAllAdventureQuests((prev) => [json.quest as AdventureQuest, ...prev]);
            setNewQuestTitle("");
        } finally {
            setCreating(false);
        }
    };

    const onAssignToChapter = async (q: AdventureQuest) => {
        if (assigningId) return;
        setAssigningId(q.id);
        try {
            const ok = await assignQuestToCurrentChapter(q.id);
            if (ok) {
                setChapterPulse(true);
                window.setTimeout(() => setChapterPulse(false), 650);
                await loadAll("refresh");
            }
        } finally {
            setAssigningId(null);
        }
    };

    const onUnassignFromChapter = async (cq: ChapterQuest, q: AdventureQuest | null) => {
        if (unassigningId) return;
        if (cq.status !== "todo") return;

        setUnassigningId(cq.id);
        try {
            const ok = await unassignQuestFromChapter(cq.id, {
                id: cq.adventure_quest_id,
                title: q?.title ?? "Quest",
                room_code: q?.room_code ?? cq.room_code ?? null,
                difficulty: q?.difficulty ?? null,
                mission_md: null,
            });

            if (ok) await loadAll("refresh");
        } finally {
            setUnassigningId(null);
        }
    };

    // --- open modals (with draft init)
    const openAdventureConfig = () => {
        setAdvContextDraft((adventure?.context_text ?? "").toString());
        openModal("adventureConfig");
    };

    const openChapterConfig = () => {
        setChapterContextDraft((chapter?.context_text ?? "").toString());
        openModal("chapterConfig");
    };

    const openTransition = () => {
        // quêtes non terminées à reporter
        const remaining = chapterItems.filter((cq) => cq.status !== "done");
        setCarryOver(remaining);

        // defaults prochain chapitre
        setNextTitle(chapter?.title ? `${chapter.title} (suite)` : "Nouveau chapitre");
        setNextPace(chapter?.pace ?? "standard");
        setNextAiContext("");

        // reset backlog selection
        setSelectedBacklogIds(new Set());

        openModal("chapterTransition");
    };

    const saveAdventureContext = async () => {
        if (!adventure?.id) return;

        setAdvConfigSaving(true);
        try {
            const res = await fetch("/api/adventures", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: adventure.id,
                    context_text: advContextDraft.trim() || null,
                }),
            });

            const json = await safeJson(res);
            if (!res.ok) {
                console.error(json?.error ?? "Save adventure context failed");
                return;
            }

            setAdventure((prev) =>
                prev ? { ...prev, context_text: advContextDraft.trim() || null } : prev
            );

            await bootstrap();
            await loadAll("refresh");
            closeModal("adventureConfig");
        } finally {
            setAdvConfigSaving(false);
        }
    };

    const saveChapterContext = async () => {
        if (!chapter?.id) return;

        setChapterConfigSaving(true);
        try {
            const res = await fetch("/api/chapters", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: chapter.id,
                    context_text: chapterContextDraft.trim() || null,
                }),
            });

            const json = await safeJson(res);
            if (!res.ok) {
                console.error(json?.error ?? "Save chapter context failed");
                return;
            }

            setChapter((prev) =>
                prev ? { ...prev, context_text: chapterContextDraft.trim() || null } : prev
            );

            await bootstrap();
            await loadAll("refresh");
            closeModal("chapterConfig");
        } finally {
            setChapterConfigSaving(false);
        }
    };

    // Renown: quand store push un gain, on ouvre la modal via uiStore
    useEffect(() => {
        if (!lastRenownGain) return;
        openModal("renownGain");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastRenownGain]);

    const closeRenown = () => {
        closeModal("renownGain");
        window.setTimeout(() => clearLastRenownGain(), 250);
    };

    const advEmoji =
        adventure?.emoji ??
        adventureFallbackEmoji(adventure?.code ?? chapter?.adventure_code ?? null);
    const advTitle =
        adventure?.title ??
        adventureFallbackTitle(adventure?.code ?? chapter?.adventure_code ?? null);
    const advDesc =
        adventure?.description ??
        adventureFallbackDescription(adventure?.code ?? chapter?.adventure_code ?? null);

    return (
        <RpgShell title="Aventure">
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-rpg-text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement…
                </div>
            ) : !chapter ? (
                <Panel
                    title="Aucune aventure en cours"
                    emoji="🕯️"
                    subtitle="Lance une aventure pour démarrer le jeu."
                    right={
                        <ActionButton variant="solid" onClick={() => router.push("/new")}>
                            ✨ Nouvelle aventure
                        </ActionButton>
                    }
                >
                    <div className="rounded-2xl bg-black/30 p-4 rpg-rpg-text-sm text-white/70 ring-1 ring-white/10">
                        Tu n’as pas de chapitre actif. Passe par “Nouvelle aventure”, puis lance un
                        chapitre.
                    </div>
                </Panel>
            ) : (
                <div className="grid gap-4">
                    {/* 1) AVENTURE */}
                    <Panel
                        title="Aventure"
                        emoji="🧭"
                        subtitle="Contexte global (éditable)."
                        right={
                            <div className="flex items-center gap-2">
                                <ActionButton onClick={openAdventureConfig}>
                                    🛠️ Configurer
                                </ActionButton>
                            </div>
                        }
                    >
                        <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-xl font-semibold text-white/90">
                                        {advEmoji} {advTitle}
                                    </div>
                                    <div className="mt-2 max-w-3xl rpg-rpg-text-sm text-white/65">
                                        {advDesc}
                                    </div>

                                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                        <div className="text-white/85 font-semibold">
                                            🧠 Contexte d’aventure
                                        </div>
                                        <div className="mt-2 whitespace-pre-line rpg-rpg-text-sm text-white/60">
                                            {adventure?.context_text?.trim()
                                                ? adventure.context_text
                                                : "Aucun contexte défini. Tu peux en ajouter via “Configurer”."}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Pill>📘 Chapitre: {chapter.title}</Pill>
                                    <Pill>
                                        {paceEmoji(chapter.pace)} {chapter.pace}
                                    </Pill>
                                    <Pill>📍 {chapter.status}</Pill>
                                </div>
                            </div>
                        </div>
                    </Panel>

                    {/* 2) CHAPITRE */}
                    <div
                        className={cn(
                            "transition-transform",
                            chapterPulse ? "scale-[1.01]" : "scale-100"
                        )}
                    >
                        <Panel
                            title="Chapitre"
                            emoji="📚"
                            subtitle="Quêtes jouées du chapitre, classées par pièces."
                            right={
                                <div className="flex items-center gap-2">
                                    <ActionButton onClick={openChapterConfig}>
                                        🛠️ Configurer
                                    </ActionButton>
                                </div>
                            }
                        >
                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-white/90 font-semibold">
                                        📖 {chapter.title}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill>📜 {chapterItems.length} quêtes</Pill>
                                    </div>
                                </div>

                                <div className="mt-2 rpg-rpg-text-sm text-white/60">
                                    Choisis une quête et ouvre sa page pour la jouer.
                                </div>

                                <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                    <div className="text-white/85 font-semibold">
                                        🎯 Contexte du chapitre
                                    </div>
                                    <div className="mt-2 whitespace-pre-line rpg-rpg-text-sm text-white/60">
                                        {chapter?.context_text?.trim()
                                            ? chapter.context_text
                                            : "Aucun contexte de chapitre. Tu peux en ajouter via “Configurer”."}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {chapterItems.length === 0 ? (
                                    <div className="rounded-2xl bg-black/30 p-4 rpg-rpg-text-sm text-white/60 ring-1 ring-white/10">
                                        Aucune quête dans ce chapitre. Va en préparation pour en
                                        sélectionner.
                                    </div>
                                ) : (
                                    chapterGrouped.map(([roomTitle, arr]) => (
                                        <div
                                            key={roomTitle}
                                            className="rounded-2xl bg-black/25 ring-1 ring-white/10"
                                        >
                                            <div className="flex items-center justify-between gap-2 px-4 py-3">
                                                <div className="text-white/90 font-semibold">
                                                    {questRoomEmoji(roomTitle)}{" "}
                                                    {questRoomLabel(roomTitle)}
                                                </div>
                                                <Pill>{arr.length} quêtes</Pill>
                                            </div>

                                            <div className="space-y-2 px-3 pb-3">
                                                {arr.map(({ cq, q }) => (
                                                    <div
                                                        key={cq.id}
                                                        className="flex flex-col gap-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="truncate text-white/90 font-semibold">
                                                                {q?.title ?? "Quête"}
                                                            </div>

                                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                                <QuestStatusPill
                                                                    status={cq.status}
                                                                />
                                                                <QuestDifficultyPill
                                                                    difficulty={q?.difficulty ?? 2}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <ActionButton
                                                                variant="soft"
                                                                disabled={
                                                                    cq.status !== "todo" ||
                                                                    unassigningId === cq.id
                                                                }
                                                                onClick={() =>
                                                                    void onUnassignFromChapter(
                                                                        cq,
                                                                        q
                                                                    )
                                                                }
                                                                hint={
                                                                    cq.status !== "todo"
                                                                        ? "Only TODO"
                                                                        : undefined
                                                                }
                                                            >
                                                                {unassigningId === cq.id
                                                                    ? "⏳"
                                                                    : "➖ Retirer"}
                                                            </ActionButton>
                                                            <ActionButton
                                                                variant="solid"
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/quest?cq=${encodeURIComponent(
                                                                            cq.id
                                                                        )}`
                                                                    )
                                                                }
                                                            >
                                                                👁️ Voir
                                                            </ActionButton>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-4">
                                <ActionButton
                                    variant="solid"
                                    onClick={openTransition}
                                    className="w-full text-center"
                                >
                                    🏁 Clôturer ce chapitre et préparer le suivant
                                </ActionButton>
                            </div>
                        </Panel>
                    </div>

                    {/* 3) BACKLOG */}
                    <Panel
                        title="Quêtes"
                        emoji="📜"
                        subtitle="Backlog: quêtes non affectées au chapitre (prêtes à être sélectionnées)."
                        right={
                            <div className="flex items-center gap-2">
                                <Pill>🧺 {backlog.length} en backlog</Pill>
                                <ActionButton onClick={goPrepare}>🛠️ Gérer</ActionButton>
                            </div>
                        }
                    >
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="rpg-rpg-text-sm text-white/70">
                                Ajoute une quête rapidement ici, ou va en préparation pour organiser
                                par pièces.
                            </div>

                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <select
                                    value={newQuestRoomCode}
                                    onChange={(e) => setNewQuestRoomCode(e.target.value)}
                                    className="rounded-2xl bg-black/30 px-4 py-3 rpg-rpg-text-sm text-white/80 ring-1 ring-white/10 outline-none"
                                >
                                    <option value="">🗺️ Toutes pièces</option>
                                    {Array.from(new Set(rooms)).map((room) => (
                                        <option key={room.code} value={room.code}>
                                            {room.emoji} {room.title}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    value={newQuestTitle}
                                    onChange={(e) => setNewQuestTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") void addBacklogQuest();
                                    }}
                                    placeholder="Ex: Ranger la table basse (5 min)…"
                                    className={cn(
                                        "w-full rounded-2xl bg-black/30 px-4 py-3 rpg-rpg-text-sm text-white/90",
                                        "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                        "focus:ring-2 focus:ring-white/25"
                                    )}
                                />

                                <ActionButton
                                    variant="solid"
                                    disabled={!newQuestTitle.trim() || creating}
                                    onClick={() => void addBacklogQuest()}
                                >
                                    {creating ? "⏳ Ajout…" : "➕ Créer"}
                                </ActionButton>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2">
                            {backlog.length === 0 ? (
                                <div className="rounded-2xl bg-black/30 p-4 rpg-rpg-text-sm text-white/60 ring-1 ring-white/10">
                                    Backlog vide. Crée une quête, ou va en préparation pour générer
                                    via IA 🎲
                                </div>
                            ) : (
                                backlog.map((q) => (
                                    <div
                                        key={q.id}
                                        className="flex flex-col gap-2 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate text-white/90 font-semibold">
                                                {q.title}
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <QuestDifficultyPill
                                                    difficulty={q.difficulty ?? 2}
                                                />
                                                <QuestRoomPill roomCode={q.room_code} />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <ActionButton
                                                variant="solid"
                                                disabled={assigningId === q.id}
                                                onClick={() => void onAssignToChapter(q)}
                                            >
                                                {assigningId === q.id
                                                    ? "⏳ Affectation…"
                                                    : "➕ Affecter à ce chapitre"}
                                            </ActionButton>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Panel>
                </div>
            )}

            {/* ✅ MODAL: CONFIG AVENTURE */}
            <UiModal
                id="adventureConfig"
                maxWidth="2xl"
                eyebrow="🧭 Configuration"
                title="Contexte de l’aventure"
                subtitle="Cadre global, contraintes, ambiance, objectifs long-terme."
                closeOnBackdrop
                closeOnEscape
                footer={
                    <div className="flex justify-end gap-2">
                        <ActionButton onClick={() => closeModal("adventureConfig")}>
                            Annuler
                        </ActionButton>
                        <ActionButton
                            variant="solid"
                            disabled={advConfigSaving}
                            onClick={() => void saveAdventureContext()}
                        >
                            {advConfigSaving ? "⏳ Sauvegarde…" : "✅ Sauvegarder"}
                        </ActionButton>
                    </div>
                }
            >
                {!adventure?.id ? null : (
                    <textarea
                        value={advContextDraft}
                        onChange={(e) => setAdvContextDraft(e.target.value)}
                        placeholder="Ex: semaine chargée, priorité salon + cuisine, sessions courtes…"
                        className="min-h-[180px] w-full rounded-2xl bg-black/30 px-4 py-3 rpg-rpg-text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                    />
                )}
            </UiModal>

            {/* ✅ MODAL: CONFIG CHAPITRE */}
            <UiModal
                id="chapterConfig"
                maxWidth="2xl"
                eyebrow="📚 Configuration"
                title="Contexte du chapitre"
                subtitle="Focus du moment, cible locale, partie précise de l’aventure."
                closeOnBackdrop
                closeOnEscape
                footer={
                    <div className="flex justify-end gap-2">
                        <ActionButton onClick={() => closeModal("chapterConfig")}>
                            Annuler
                        </ActionButton>
                        <ActionButton
                            variant="solid"
                            disabled={chapterConfigSaving}
                            onClick={() => void saveChapterContext()}
                        >
                            {chapterConfigSaving ? "⏳ Sauvegarde…" : "✅ Sauvegarder"}
                        </ActionButton>
                    </div>
                }
            >
                {!chapter?.id ? null : (
                    <textarea
                        value={chapterContextDraft}
                        onChange={(e) => setChapterContextDraft(e.target.value)}
                        placeholder="Ex: focus salon: câbles, poussière, ambiance cozy…"
                        className="min-h-[180px] w-full rounded-2xl bg-black/30 px-4 py-3 rpg-rpg-text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                    />
                )}
            </UiModal>

            {/* ✅ MODAL: RENOWN GAIN */}
            <UiModal
                id="renownGain"
                maxWidth="md"
                closeOnBackdrop
                closeOnEscape
                eyebrow="🏆 Renommée gagnée"
                title={
                    congratsLoading && !congrats?.title
                        ? "🕯️ Le MJ forge tes lauriers…"
                        : (congrats?.title ?? "Bravo")
                }
                subtitle={undefined}
                footer={
                    <div className="flex justify-end">
                        <ActionButton variant="solid" onClick={closeRenown}>
                            ✨ Continuer
                        </ActionButton>
                    </div>
                }
            >
                {renownOpen && lastRenownGain ? (
                    <>
                        <MasterCard title="Félicitations" emoji="🎉">
                            <div className="whitespace-pre-line rpg-rpg-text-sm text-white/70">
                                {congratsLoading && !congrats?.message
                                    ? "✨ ...\n✨ ...\n✨ ..."
                                    : (congrats?.message ?? "Victoire enregistrée.")}
                            </div>
                        </MasterCard>

                        <div className="mt-4 flex items-start justify-between gap-3">
                            <div>
                                <div className="text-2xl font-semibold text-white/90">
                                    +{lastRenownGain.delta}
                                </div>
                                <div className="mt-1 text-sm text-white/60">
                                    {lastRenownGain.reason ?? "Quête terminée"}
                                </div>
                            </div>

                            {lastRenownGain.after.level > (lastRenownGain.before?.level ?? 1) ? (
                                <div className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-emerald-200 ring-1 ring-emerald-400/20">
                                    ✨ LEVEL UP
                                    <div className="text-xs opacity-80">
                                        {lastRenownGain.before?.level ?? 1} →{" "}
                                        {lastRenownGain.after.level}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {(() => {
                            const afterValue = Math.max(0, lastRenownGain.after.value);
                            const into = afterValue % 100;
                            const pct = Math.max(0, Math.min(100, (into / 100) * 100));

                            return (
                                <div className="mt-4">
                                    <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                                        <UiMotionDiv
                                            className="h-full rounded-full bg-white/25"
                                            initial={{ width: "0%" }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 1.6, ease: "easeOut" }}
                                        />
                                    </div>

                                    <div className="mt-2 flex items-center justify-between text-xs text-white/55">
                                        <span>✨ {into}/100</span>
                                        <span>Niv. {lastRenownGain.after.level}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                ) : null}
            </UiModal>

            {/* ✅ MODAL: TRANSITION CHAPITRE (bug scroll réglé ici) */}
            <UiModal
                id="chapterTransition"
                maxWidth="3xl"
                closeOnBackdrop
                closeOnEscape
                eyebrow="📚 Transition de chapitre"
                title={
                    chapter?.title
                        ? `Clôturer “${chapter.title}” et préparer la suite`
                        : "Transition"
                }
                subtitle="Les quêtes non terminées seront automatiquement reportées."
                footer={
                    <div className="flex justify-end gap-2">
                        <ActionButton onClick={() => closeModal("chapterTransition")}>
                            Annuler
                        </ActionButton>

                        <ActionButton
                            variant="solid"
                            disabled={transitionBusy || !nextTitle.trim()}
                            onClick={() => {
                                void (async () => {
                                    if (!chapter?.id || !chapter.adventure_id) return;

                                    setTransitionBusy(true);
                                    try {
                                        const res = await fetch("/api/chapters/transition", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                prev_chapter_id: chapter.id,
                                                adventure_id: chapter.adventure_id,
                                                next: {
                                                    title: nextTitle.trim(),
                                                    pace: nextPace,
                                                    ai_context: nextAiContext.trim() || null,
                                                },
                                                backlog_adventure_quest_ids:
                                                    Array.from(selectedBacklogIds),
                                            }),
                                        });

                                        const json = await safeJson(res);
                                        if (!res.ok) {
                                            console.error(json?.error ?? "Transition failed");
                                            return;
                                        }

                                        await bootstrap();
                                        await loadAll("refresh");
                                        closeModal("chapterTransition");
                                    } finally {
                                        setTransitionBusy(false);
                                    }
                                })();
                            }}
                        >
                            {transitionBusy ? "⏳ Transition…" : "✅ Lancer le prochain chapitre"}
                        </ActionButton>
                    </div>
                }
            >
                {/* 1) Carry-over */}
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-white/85 font-semibold">🔁 Quêtes à reporter</div>
                        <Pill>{carryOver.length}</Pill>
                    </div>

                    {carryOver.length === 0 ? (
                        <div className="mt-3 rpg-rpg-text-sm text-white/60">
                            Rien à reporter. Chapitre clean ✅
                        </div>
                    ) : (
                        <div className="mt-3 space-y-2">
                            {carryOver.map((cq) => {
                                const q = normalizeQuest(cq.adventure_quests);
                                return (
                                    <div
                                        key={cq.id}
                                        className="rounded-2xl bg-black/30 p-3 ring-1 ring-white/10"
                                    >
                                        <div className="text-white/85 font-semibold truncate">
                                            {q?.title ?? "Quête"}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <QuestStatusPill status={cq.status} />
                                            <QuestRoomPill
                                                roomCode={q?.room_code ?? cq.room_code}
                                            />
                                            <QuestDifficultyPill difficulty={q?.difficulty ?? 2} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2) Backlog selection */}
                <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-white/85 font-semibold">
                            🧺 Ajouter depuis le backlog
                        </div>
                        <Pill>{backlog.length} dispo</Pill>
                    </div>

                    {backlog.length === 0 ? (
                        <div className="mt-3 rpg-rpg-text-sm text-white/60">Backlog vide.</div>
                    ) : (
                        <div className="mt-3 space-y-2 max-h-[260px] overflow-auto pr-1">
                            {backlog.map((q) => {
                                const checked = selectedBacklogIds.has(q.id);
                                return (
                                    <button
                                        key={q.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedBacklogIds((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(q.id)) next.delete(q.id);
                                                else next.add(q.id);
                                                return next;
                                            });
                                        }}
                                        className={cn(
                                            "w-full text-left rounded-2xl p-3 ring-1 transition",
                                            checked
                                                ? "bg-white/10 text-white ring-white/15"
                                                : "bg-black/30 text-white/80 ring-white/10 hover:bg-white/5"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="font-semibold truncate">
                                                    {checked ? "✅ " : "➕ "}
                                                    {q.title}
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <QuestRoomPill roomCode={q.room_code} />
                                                    <QuestDifficultyPill
                                                        difficulty={q.difficulty ?? 2}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-xs text-white/50 shrink-0">
                                                {q.id.slice(0, 8)}…
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 3) Next chapter config */}
                <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                    <div className="text-white/85 font-semibold">🧠 Prochain chapitre</div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                        <input
                            value={nextTitle}
                            onChange={(e) => setNextTitle(e.target.value)}
                            placeholder="Titre du prochain chapitre"
                            className="rounded-2xl bg-black/30 px-4 py-3 rpg-rpg-text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                        />

                        <select
                            value={nextPace}
                            onChange={(e) => setNextPace(e.target.value as Chapter["pace"])}
                            className="rounded-2xl bg-black/30 px-4 py-3 rpg-rpg-text-sm text-white/90 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                        >
                            <option value="calme">🌙 calme</option>
                            <option value="standard">⚡ standard</option>
                            <option value="intense">🔥 intense</option>
                        </select>
                    </div>

                    <textarea
                        value={nextAiContext}
                        onChange={(e) => setNextAiContext(e.target.value)}
                        placeholder="Contexte IA pour ce chapitre (objectifs, contraintes, humeur...)"
                        className="mt-3 min-h-[120px] w-full rounded-2xl bg-black/30 px-4 py-3 rpg-rpg-text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                    />
                </div>
            </UiModal>
        </RpgShell>
    );
}
