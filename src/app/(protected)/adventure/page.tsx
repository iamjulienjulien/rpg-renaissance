"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { useGameStore } from "@/stores/gameStore";
import { ViewportPortal } from "@/components/ViewportPortal";

type Chapter = {
    id: string;
    adventure_id: string | null;
    title: string;
    pace: "calme" | "standard" | "intense";
    status: "draft" | "active" | "done";
    created_at: string;
    adventure_code?: string | null;
};

type Adventure = {
    id: string;
    code: string;
    title: string;
    type?: string | null;
    description?: string | null;
    emoji?: string | null;
};

type AdventureQuest = {
    id: string;
    adventure_id: string;
    room_code: string | null;
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

function statusPill(status: ChapterQuest["status"]) {
    if (status === "doing")
        return { label: "🟦 doing", tone: "bg-white/10 text-white ring-white/15" };
    if (status === "done")
        return { label: "✅ done", tone: "bg-white/10 text-white ring-white/15" };
    return { label: "🟥 todo", tone: "bg-white/5 text-white/70 ring-white/10" };
}

function diffPill(d: number) {
    if (d <= 1) return "🟢 diff 1";
    if (d === 2) return "🟡 diff 2";
    return "🔴 diff 3";
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

    // ✅ Affecter une quête au chapitre courant (store)
    const assignQuestToCurrentChapter = useGameStore((s) => s.assignQuestToCurrentChapter);
    const setStoreChapter = useGameStore((s) => s.setChapter);
    const [assigningId, setAssigningId] = useState<string | null>(null);

    // ✅ Renown modal (depuis store)
    const lastRenownGain = useGameStore((s) => s.lastRenownGain);
    const clearLastRenownGain = useGameStore((s) => s.clearLastRenownGain);
    const [showGain, setShowGain] = useState(false);

    useEffect(() => {
        if (!lastRenownGain) return;

        setShowGain(true);

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setShowGain(false);
                window.setTimeout(() => clearLastRenownGain(), 250);
            }
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lastRenownGain, clearLastRenownGain]);

    const loadAll = async (mode: "initial" | "refresh") => {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        try {
            // 1) latest chapter
            const chRes = await fetch("/api/chapters?latest=1", { cache: "no-store" });
            const chJson = await chRes.json();
            const ch = (chJson.chapter ?? null) as Chapter | null;

            setChapter(ch);
            // 🔁 Sync store (le store sert de “source d’action” pour affecter)
            setStoreChapter(ch);

            if (!ch?.id || !ch.adventure_id) {
                setAdventure(null);
                setChapterItems([]);
                setAllAdventureQuests([]);
                return;
            }

            // 2) chapter quests
            const cqRes = await fetch(
                `/api/chapter-quests?chapterId=${encodeURIComponent(ch.id)}`,
                { cache: "no-store" }
            );
            const cqJson = await cqRes.json();
            setChapterItems((cqJson.items ?? []) as ChapterQuest[]);

            // 3) adventure details (best-effort)
            const advRes = await fetch(
                `/api/adventures?id=${encodeURIComponent(ch.adventure_id)}`,
                { cache: "no-store" }
            );
            const advJson = await advRes.json();
            setAdventure((advJson.adventure ?? null) as Adventure | null);

            // 4) all adventure quests (backlog candidates)
            const aqRes = await fetch(
                `/api/adventure-quests?adventureId=${encodeURIComponent(ch.adventure_id)}`,
                { cache: "no-store" }
            );
            const aqJson = await aqRes.json();
            setAllAdventureQuests((aqJson.quests ?? []) as AdventureQuest[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void loadAll("initial");
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
            .filter((q) => !chapterQuestIds.has(q.id))
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

            const json = await res.json().catch(() => null);
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
                await loadAll("refresh"); // refresh UI (backlog -> chapter)
            }
        } finally {
            setAssigningId(null);
        }
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
        <RpgShell
            title="Aventure"
            rightSlot={
                <div className="flex items-center gap-2">
                    <ActionButton onClick={() => void loadAll("refresh")}>
                        {refreshing ? "⏳" : "🔄 Sync"}
                    </ActionButton>
                </div>
            }
        >
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
                        subtitle="Le contexte général de ta session (lecture seule)."
                        right={
                            <div className="flex items-center gap-2">
                                <Pill>🗺️ {adventure?.code ?? chapter.adventure_code ?? "?"}</Pill>
                                <ActionButton onClick={goPrepare}>🛠️ Préparation</ActionButton>
                            </div>
                        }
                    >
                        <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-xs tracking-[0.22em] text-white/55">
                                        {advEmoji} TYPE D’AVENTURE
                                    </div>
                                    <div className="mt-2 text-xl font-semibold text-white/90">
                                        {advEmoji} {advTitle}
                                    </div>
                                    <div className="mt-2 max-w-3xl rpg-rpg-text-sm text-white/65">
                                        {advDesc}
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
                    <Panel
                        title="Chapitre"
                        emoji="📚"
                        subtitle="Quêtes jouées du chapitre, classées par pièces."
                        right={<Pill>📜 {chapterItems.length} quêtes</Pill>}
                    >
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-white/90 font-semibold">
                                    ⚡ {chapter.title}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Pill>
                                        {paceEmoji(chapter.pace)} {chapter.pace}
                                    </Pill>
                                    <Pill>📍 {chapter.status}</Pill>
                                </div>
                            </div>
                            <div className="mt-2 rpg-rpg-text-sm text-white/60">
                                Choisis une quête et ouvre sa page pour la jouer.
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
                                                🚪 {roomTitle}
                                            </div>
                                            <Pill>{arr.length} quêtes</Pill>
                                        </div>

                                        <div className="space-y-2 px-3 pb-3">
                                            {arr.map(({ cq, q }) => {
                                                const st = statusPill(cq.status);

                                                return (
                                                    <div
                                                        key={cq.id}
                                                        className="flex flex-col gap-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="truncate text-white/90 font-semibold">
                                                                {q?.title ?? "Quête"}
                                                            </div>

                                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                                <span
                                                                    className={cn(
                                                                        "rounded-full px-3 py-1 text-xs ring-1",
                                                                        st.tone
                                                                    )}
                                                                >
                                                                    {st.label}
                                                                </span>

                                                                <Pill>
                                                                    {diffPill(q?.difficulty ?? 2)}
                                                                </Pill>

                                                                <Pill>
                                                                    ⏱️{" "}
                                                                    {q?.estimate_min
                                                                        ? `${q.estimate_min} min`
                                                                        : "?"}
                                                                </Pill>

                                                                <Pill>
                                                                    🧾 id: {cq.id.slice(0, 8)}…
                                                                </Pill>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <ActionButton
                                                                variant="solid"
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/quest?cq=${encodeURIComponent(cq.id)}`
                                                                    )
                                                                }
                                                            >
                                                                👁️ Voir
                                                            </ActionButton>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Panel>

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
                            <div className="rpg-rpg-rpg-text-sm text-white/70">
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
                                    {Array.from(
                                        new Set(
                                            allAdventureQuests
                                                .map((q) => q.room_code)
                                                .filter(
                                                    (x): x is string =>
                                                        typeof x === "string" && x.length > 0
                                                )
                                        )
                                    )
                                        .sort((a, b) => a.localeCompare(b, "fr"))
                                        .map((code) => (
                                            <option key={code} value={code}>
                                                🚪 {code}
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
                                                <Pill>{diffPill(q.difficulty ?? 2)}</Pill>
                                                <Pill>
                                                    ⏱️{" "}
                                                    {q.estimate_min ? `${q.estimate_min} min` : "?"}
                                                </Pill>
                                                <Pill>
                                                    {q.room_code
                                                        ? `🚪 ${q.room_code}`
                                                        : "🗺️ sans pièce"}
                                                </Pill>
                                                <Pill>🧾 id: {q.id.slice(0, 8)}…</Pill>
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

            {/* ✅ MODAL RENOWN GAIN */}
            <AnimatePresence>
                {showGain && lastRenownGain ? (
                    <ViewportPortal>
                        <motion.div
                            className="fixed inset-0 z-[120] grid place-items-center bg-black/55 backdrop-blur-[3px] p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onMouseDown={() => {
                                setShowGain(false);
                                window.setTimeout(() => clearLastRenownGain(), 250);
                            }}
                        >
                            <motion.div
                                className="w-full max-w-md rounded-[28px] bg-white/5 p-5 ring-1 ring-white/15"
                                initial={{ y: 16, scale: 0.98, opacity: 0 }}
                                animate={{ y: 0, scale: 1, opacity: 1 }}
                                exit={{ y: 10, scale: 0.98, opacity: 0 }}
                                transition={{ duration: 0.22 }}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                            🏆 Renommée gagnée
                                        </div>
                                        <div className="mt-2 text-2xl font-semibold text-white/90">
                                            +{lastRenownGain.delta}
                                        </div>
                                        <div className="mt-1 text-sm text-white/60">
                                            {lastRenownGain.reason ?? "Quête terminée"}
                                        </div>
                                    </div>

                                    {lastRenownGain.after.level >
                                    (lastRenownGain.before?.level ?? 1) ? (
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
                                                <motion.div
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

                                <div className="mt-5 flex justify-end">
                                    <ActionButton
                                        variant="solid"
                                        onClick={() => {
                                            setShowGain(false);
                                            window.setTimeout(() => clearLastRenownGain(), 250);
                                        }}
                                    >
                                        ✨ Continuer
                                    </ActionButton>
                                </div>
                            </motion.div>
                        </motion.div>
                    </ViewportPortal>
                ) : null}
            </AnimatePresence>
        </RpgShell>
    );
}
