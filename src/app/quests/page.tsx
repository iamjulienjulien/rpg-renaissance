"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

type Chapter = {
    id: string;
    adventure_id: string;
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

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [adventure, setAdventure] = useState<Adventure | null>(null);
    const [items, setItems] = useState<ChapterQuest[]>([]);

    const load = async (mode: "initial" | "refresh") => {
        if (mode === "initial") setLoading(true);
        else setRefreshing(true);

        try {
            // 1) Chapitre courant (latest)
            const chRes = await fetch("/api/chapters?latest=1", { cache: "no-store" });
            const chJson = await chRes.json();

            const ch = (chJson.chapter ?? null) as Chapter | null;
            setChapter(ch);

            if (!ch) {
                setItems([]);
                setAdventure(null);
                return;
            }

            // 2) Quêtes du chapitre
            const cqRes = await fetch(
                `/api/chapter-quests?chapterId=${encodeURIComponent(ch.id)}`,
                { cache: "no-store" }
            );
            const cqJson = await cqRes.json();

            if (cqRes.ok) setItems((cqJson.items ?? []) as ChapterQuest[]);
            else setItems([]);

            // 3) Détails aventure (best-effort)
            //    Si ton endpoint diffère, on l’adaptera.
            const advRes = await fetch(
                `/api/adventures?id=${encodeURIComponent(ch.adventure_id)}`,
                { cache: "no-store" }
            );
            const advJson = await advRes.json();

            if (advRes.ok) setAdventure((advJson.adventure ?? null) as Adventure | null);
            else setAdventure(null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void load("initial");
    }, []);

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

        // tri stable: titre de pièce puis titre de quête
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

    return (
        <RpgShell
            title="Quêtes"
            rightSlot={
                <div className="flex items-center gap-2">
                    <ActionButton onClick={() => void load("refresh")}>
                        {refreshing ? "⏳" : "🔄 Sync"}
                    </ActionButton>
                </div>
            }
        >
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
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
                    <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/70 ring-1 ring-white/10">
                        🧭 Tu n’as pas encore de chapitre actif. Passe par “Nouvelle aventure”, puis
                        démarre un chapitre.
                    </div>
                </Panel>
            ) : (
                <div className="grid gap-4">
                    {/* ✅ AVENTURE (remplace l’ancienne card Chapitre) */}
                    <Panel
                        title="Aventure"
                        emoji="🧭"
                        subtitle="Contexte courant (lecture seule ici)."
                        right={
                            <div className="flex items-center gap-2">
                                <Pill>📘 {chapter.title}</Pill>
                                <Pill>⚡ {chapter.pace}</Pill>
                                <ActionButton onClick={goPrepare}>🛠️ Préparation</ActionButton>
                            </div>
                        }
                    >
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm text-white/60">Type</div>
                                    <div className="text-white/90 font-semibold">
                                        🏠 {adventureTypeLabel(adventure?.code, adventure?.type)}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-sm text-white/60">Chapitre en cours</div>
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
                                {typeof items.length === "number" ? (
                                    <Pill>📜 {items.length} quêtes</Pill>
                                ) : null}
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
                            <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
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
        </RpgShell>
    );
}
