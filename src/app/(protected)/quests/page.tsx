"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { useGameStore } from "@/stores/gameStore";
import { useSessionStore } from "@/stores/sessionStore";
import { ViewportPortal } from "@/components/ViewportPortal";

type Chapter = {
    id: string;
    adventure_id: string;
    adventure_code?: string | null;
    title: string;
    pace: string;
    status?: string | null;
    created_at: string;
};

type Adventure = {
    id: string;
    code: string;
    title: string;
    type?: string | null;
};

type AdventureQuest = {
    id: string;
    adventure_id: string;
    room_code: string | null;
    title: string;
    description: string | null;
    difficulty: number;
    estimate_min: number | null;
};

type ChapterQuest = {
    id: string;
    chapter_id: string;
    adventure_quest_id: string;
    status: "todo" | "doing" | "done";
    room_code: string | null;
    created_at: string;
    adventure_quests: AdventureQuest | AdventureQuest[] | null;
    room_title?: string | null;
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

function adventureTypeLabel(code?: string | null, type?: string | null) {
    if (type) return type;
    if (code === "home_realignment") return "Réalignement du foyer";
    return "Aventure";
}

export default function QuestsPage() {
    const router = useRouter();

    // ✅ Zustand: chapitre courant
    const chapter = useGameStore((s) => s.chapter) as Chapter | null;
    const chapterLoading = useGameStore((s) => s.chapterLoading);
    const loadLatestChapter = useGameStore((s) => s.loadLatestChapter);

    // ✅ Local state: données dépendantes du chapitre
    const [refreshing, setRefreshing] = useState(false);
    const [adventure, setAdventure] = useState<Adventure | null>(null);
    const [items, setItems] = useState<ChapterQuest[]>([]);

    type Renown = { value: number; level: number };

    const bootstrap = useGameStore((s) => s.bootstrap);
    const profile = useGameStore((s) => s.profile);

    const activeSessionId = useSessionStore((s) => s.activeSessionId);
    const bootstrapSession = useSessionStore((s) => s.bootstrap);

    const activeCharacter = profile?.character ?? null;

    const [renown, setRenown] = useState<Renown | null>(null);
    const [renownLoading, setRenownLoading] = useState(false);

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

    // ✅ Charge l'essentiel (profil/persos) + session
    useEffect(() => {
        void bootstrap();
        void bootstrapSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ Charge la renommée liée à la session active
    useEffect(() => {
        const run = async () => {
            const sid = useSessionStore.getState().activeSessionId;
            if (!sid) {
                setRenown(null);
                return;
            }

            setRenownLoading(true);
            try {
                const res = await fetch(`/api/renown?session_id=${encodeURIComponent(sid)}`, {
                    cache: "no-store",
                });
                const json = await res.json().catch(() => null);

                if (!res.ok) {
                    setRenown(null);
                    return;
                }

                setRenown((json?.renown ?? null) as Renown | null);
            } finally {
                setRenownLoading(false);
            }
        };

        void run();
    }, [activeSessionId]);

    // 1) Charge le chapitre via store
    useEffect(() => {
        void loadLatestChapter();
    }, [loadLatestChapter]);

    // 2) Quand chapter change, charge les quêtes du chapitre + aventure
    useEffect(() => {
        const run = async () => {
            if (!chapter?.id) {
                setItems([]);
                setAdventure(null);
                return;
            }

            try {
                // Quêtes du chapitre
                const cqRes = await fetch(
                    `/api/chapter-quests?chapterId=${encodeURIComponent(chapter.id)}`,
                    { cache: "no-store" }
                );
                const cqJson = await cqRes.json();
                if (cqRes.ok) setItems((cqJson.items ?? []) as ChapterQuest[]);
                else setItems([]);

                // Détails aventure (best-effort)
                // si tu as déjà un endpoint by id, on le garde
                const advRes = await fetch(
                    `/api/adventures?id=${encodeURIComponent(chapter.adventure_id)}`,
                    { cache: "no-store" }
                );
                const advJson = await advRes.json();
                if (advRes.ok) setAdventure((advJson.adventure ?? null) as Adventure | null);
                else setAdventure(null);
            } catch (e) {
                console.error(e);
                setItems([]);
                setAdventure(null);
            }
        };

        void run();
    }, [chapter?.id, chapter?.adventure_id]);

    const onSync = async () => {
        setRefreshing(true);
        try {
            await loadLatestChapter();

            const sid = useSessionStore.getState().activeSessionId;
            if (sid) {
                const res = await fetch(`/api/renown?session_id=${encodeURIComponent(sid)}`, {
                    cache: "no-store",
                });
                const json = await res.json().catch(() => null);
                if (res.ok) setRenown((json?.renown ?? null) as Renown | null);
            }
        } finally {
            setRefreshing(false);
        }
    };

    const grouped = useMemo(() => {
        const map = new Map<string, Array<{ cq: ChapterQuest; q: AdventureQuest | null }>>();

        for (const cq of items) {
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
    }, [items]);

    const goPrepare = () => {
        if (adventure?.code === "home_realignment") {
            router.push("/adventure/home-realignment");
            return;
        }
        router.push("/new");
    };

    const loading = chapterLoading; // UI: même comportement qu’avant

    return (
        <RpgShell
            title="Quêtes"
            rightSlot={
                <div className="flex items-center gap-2">
                    <ActionButton onClick={() => void onSync()}>
                        {refreshing ? "⏳" : "🔄 Sync"}
                    </ActionButton>
                </div>
            }
        >
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement…
                </div>
            ) : !chapter ? (
                <Panel
                    title="Aucune aventure en cours"
                    emoji="🕯️"
                    subtitle="Lance une aventure pour obtenir un chapitre."
                    right={
                        <ActionButton variant="solid" onClick={() => router.push("/new")}>
                            ✨ Nouvelle aventure
                        </ActionButton>
                    }
                >
                    <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/70 ring-1 ring-white/10">
                        🧭 Tu n’as pas encore de chapitre actif. Passe par “Nouvelle aventure”, puis
                        démarre un chapitre.
                    </div>
                </Panel>
            ) : (
                <div className="grid gap-4">
                    {/* ✅ AVENTURE */}
                    <Panel
                        title="Aventure"
                        emoji="🧭"
                        // subtitle="Contexte courant (lecture seule ici)."
                        right={
                            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                                {/* 🎭 Perso actif */}
                                <div className="rounded-2xl bg-black/25 px-3 py-2 ring-1 ring-white/10">
                                    <div className="flex items-center gap-2">
                                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
                                            <span className="text-lg">
                                                {activeCharacter?.emoji ?? "🧙"}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-xs text-white/60">
                                                Avatar actif
                                            </div>
                                            <div className="truncate text-sm font-semibold text-white/90">
                                                {activeCharacter?.name ?? "Aucun"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 🏆 Renommée */}
                                <div className="w-[240px] rounded-2xl bg-black/25 px-3 py-2 ring-1 ring-white/10">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-white/60">🏆 Renommée</div>
                                        <div className="text-xs text-white/75">
                                            {renownLoading
                                                ? "⏳"
                                                : renown
                                                  ? `Niv. ${renown.level}`
                                                  : "—"}
                                        </div>
                                    </div>

                                    {renown ? (
                                        (() => {
                                            const value = Math.max(0, renown.value ?? 0);
                                            const into = value % 100;
                                            const pct = Math.max(
                                                0,
                                                Math.min(100, Math.round((into / 100) * 100))
                                            );

                                            return (
                                                <>
                                                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                                                        <div
                                                            className="h-full rounded-full bg-white/25"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>

                                                    <div className="mt-1 flex items-center justify-between text-[11px] text-white/55">
                                                        <span>✨ {into}/100</span>
                                                        <span className="text-white/45">
                                                            total {value}
                                                        </span>
                                                    </div>
                                                </>
                                            );
                                        })()
                                    ) : (
                                        <div className="mt-2 text-[11px] text-white/45">
                                            Aucune donnée (encore) 👀
                                        </div>
                                    )}
                                </div>

                                {/* 📘 Chapitre / rythme / préparation */}
                                <div className="flex items-center gap-2">
                                    <Pill>📘 {chapter.title}</Pill>
                                    <Pill>⚡ {chapter.pace}</Pill>
                                    <ActionButton onClick={goPrepare}>🛠️ Préparation</ActionButton>
                                </div>
                            </div>
                        }
                    >
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="rpg-text-sm text-white/60">Type</div>
                                    <div className="text-white/90 font-semibold">
                                        🏠 {adventureTypeLabel(adventure?.code, adventure?.type)}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="rpg-text-sm text-white/60">
                                        Chapitre en cours
                                    </div>
                                    <div className="text-white/90 font-semibold">
                                        ⚔️ {chapter.title}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {adventure?.code ? (
                                    <Pill>🏷️ {adventure.code}</Pill>
                                ) : (
                                    <Pill>🏷️ (code?)</Pill>
                                )}
                                {adventure?.title ? (
                                    <Pill>✨ {adventure.title}</Pill>
                                ) : (
                                    <Pill>✨ Aventure</Pill>
                                )}
                                <Pill>📜 {items.length} quêtes</Pill>
                            </div>

                            <div className="mt-3 text-xs text-white/55">
                                Ici: lancement d’une quête. L’édition se fait dans la page Quête.
                            </div>
                        </div>
                    </Panel>

                    {/* ✅ LISTE */}
                    <Panel
                        title="Quêtes du chapitre"
                        emoji="📜"
                        subtitle=""
                        right={<Pill>{items.length} quêtes</Pill>}
                    >
                        {items.length === 0 ? (
                            <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                                Aucune quête dans ce chapitre. Retourne en préparation pour en
                                sélectionner.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {grouped.map(([roomTitle, arr]) => (
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

                                                                {q?.estimate_min ? (
                                                                    <Pill>
                                                                        ⏱️ {q.estimate_min} min
                                                                    </Pill>
                                                                ) : (
                                                                    <Pill>⏱️ ?</Pill>
                                                                )}

                                                                {q?.room_code ? (
                                                                    <Pill>🗺️ {q.room_code}</Pill>
                                                                ) : (
                                                                    <Pill>🗺️ sans code</Pill>
                                                                )}
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
                                                                ▶️ Lancer
                                                            </ActionButton>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>
            )}
            <AnimatePresence>
                {showGain && lastRenownGain ? (
                    <ViewportPortal>
                        <motion.div
                            className="fixed inset-0 z-[120] grid place-items-center bg-black/55 backdrop-blur-[3px] p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
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

                                {/* Barre XP: on anime la largeur */}
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
