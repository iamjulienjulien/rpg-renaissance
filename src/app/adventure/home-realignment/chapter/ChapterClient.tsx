"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import type { AdventureQuest, AdventureRoom, Chapter } from "@/features/adventures/types";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function ChapterClient() {
    const router = useRouter();
    const sp = useSearchParams();
    const chapterId = sp.get("chapterId") ?? "";

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [rooms, setRooms] = useState<AdventureRoom[]>([]);
    const [backlog, setBacklog] = useState<AdventureQuest[]>([]);

    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

    const load = async () => {
        if (!chapterId) return;

        setLoading(true);
        try {
            const chRes = await fetch(`/api/chapters?id=${encodeURIComponent(chapterId)}`, {
                cache: "no-store",
            });
            const chJson = await chRes.json();

            if (!chRes.ok) {
                console.error(chJson?.error ?? "Failed to load chapter");
                setChapter(null);
                return;
            }

            const ch = chJson.chapter as Chapter | null;
            setChapter(ch);

            const advId = (ch as any)?.adventure_id;
            if (!advId) return;

            const [roomsRes, qRes] = await Promise.all([
                fetch(`/api/adventure-rooms?adventureId=${encodeURIComponent(advId)}`, {
                    cache: "no-store",
                }),
                fetch(`/api/adventure-quests?adventureId=${encodeURIComponent(advId)}`, {
                    cache: "no-store",
                }),
            ]);

            const roomsJson = await roomsRes.json();
            const qJson = await qRes.json();

            if (roomsRes.ok) setRooms(roomsJson.rooms ?? []);
            if (qRes.ok) setBacklog(qJson.quests ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterId]);

    const startChapter = async () => {
        if (!chapterId) return;
        if (selectedIds.length === 0) return;

        setStarting(true);
        try {
            const res = await fetch("/api/chapter-quests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chapter_id: chapterId,
                    adventure_quest_ids: selectedIds,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                console.error(json?.error ?? "Start chapter failed");
                alert(json?.error ?? "Start chapter failed");
                return;
            }

            router.push("/quests");
        } finally {
            setStarting(false);
        }
    };

    if (!chapterId) {
        return (
            <RpgShell title="Chapitre" rightSlot={null}>
                <Panel title="Erreur" emoji="⚠️" subtitle="Identifiant manquant (chapterId).">
                    <ActionButton
                        variant="solid"
                        onClick={() => router.push("/adventure/home-realignment")}
                    >
                        ↩️ Retour préparation
                    </ActionButton>
                </Panel>
            </RpgShell>
        );
    }

    return (
        <RpgShell
            title={chapter?.title ?? "Chapitre"}
            subtitle="Sélectionne les quêtes à jouer maintenant."
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>📌 {selectedIds.length} sélection</Pill>

                    <ActionButton onClick={() => router.push("/adventure/home-realignment")}>
                        ↩️ Préparation
                    </ActionButton>

                    <ActionButton
                        variant="solid"
                        onClick={() => void startChapter()}
                        disabled={selectedIds.length === 0 || starting}
                    >
                        {starting ? "⏳" : "🗡️ Démarrer"}
                    </ActionButton>
                </div>
            }
        >
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement…
                </div>
            ) : !chapter ? (
                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                    Chapitre introuvable. Reviens à la préparation et relance l’aventure.
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <Panel
                        title="Backlog"
                        emoji="📜"
                        subtitle="Choisis les quêtes à intégrer à ce chapitre."
                        right={<Pill>{backlog.length} quêtes</Pill>}
                    >
                        <div className="space-y-2">
                            {backlog.length === 0 ? (
                                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                                    Aucun backlog. Retourne préparer l’aventure 🧭
                                </div>
                            ) : (
                                backlog.map((q) => {
                                    const isSelected = !!selected[q.id];
                                    const roomLabel = q.room_code
                                        ? (rooms.find((r) => r.code === q.room_code)?.title ??
                                          q.room_code)
                                        : null;

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() =>
                                                setSelected((prev) => ({
                                                    ...prev,
                                                    [q.id]: !prev[q.id],
                                                }))
                                            }
                                            className={cn(
                                                "w-full rounded-2xl p-4 text-left ring-1 transition-colors",
                                                isSelected
                                                    ? "bg-black/60 ring-white/25"
                                                    : "bg-black/25 ring-white/10 hover:bg-black/35"
                                            )}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="text-white/90">
                                                    {isSelected ? "✅ " : "⬜ "} {q.title}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {roomLabel ? (
                                                        <Pill>🚪 {roomLabel}</Pill>
                                                    ) : (
                                                        <Pill>🗺️ sans pièce</Pill>
                                                    )}
                                                    <Pill>🎚️ {q.difficulty}</Pill>
                                                </div>
                                            </div>

                                            {q.description ? (
                                                <div className="mt-2 text-sm text-white/60">
                                                    {q.description}
                                                </div>
                                            ) : null}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </Panel>

                    <Panel title="Résumé" emoji="📌" subtitle="Ton chapitre, en quelques lignes.">
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 text-sm text-white/70">
                            <div>
                                <span className="text-white/85 font-semibold">Titre:</span>{" "}
                                {chapter.title}
                            </div>

                            <div className="mt-2">
                                <span className="text-white/85 font-semibold">
                                    Quêtes sélectionnées:
                                </span>{" "}
                                {selectedIds.length}
                            </div>

                            <div className="mt-2 text-xs text-white/55">
                                Une fois démarré, tu joueras les quêtes depuis la page Quêtes.
                            </div>
                        </div>
                    </Panel>
                </div>
            )}
        </RpgShell>
    );
}
