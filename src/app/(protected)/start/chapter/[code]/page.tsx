"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

import { useGameStore } from "@/stores/gameStore";

import type { AdventureQuest, AdventureRoom, Chapter } from "@/features/adventures/types";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function StartChapterPage() {
    const router = useRouter();
    const params = useParams<{ code: string }>();

    const chapterCode = useMemo(() => {
        const raw = params?.code;
        return typeof raw === "string" ? raw : "";
    }, [params]);

    const bootstrapStartChapter = useGameStore((s) => s.bootstrapStartChapter);
    const startChapterWithQuests = useGameStore((s) => s.startChapterWithQuests);

    const loading = useGameStore((s) => s.startChapterLoading);
    const starting = useGameStore((s) => s.startChapterStarting);

    const chapter = useGameStore((s) => s.startChapterData.chapter) as Chapter | null;
    const rooms = useGameStore((s) => s.startChapterData.rooms) as AdventureRoom[];
    const backlog = useGameStore((s) => s.startChapterData.backlog) as AdventureQuest[];

    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

    const contextText = useGameStore((s) => s.startChapterData.context_text);
    const setContextText = useGameStore((s) => s.setStartChapterContextText);
    const saveContext = useGameStore((s) => s.saveStartChapterContext);

    const [contextSaving, setContextSaving] = useState(false);

    useEffect(() => {
        if (!chapterCode) return;
        void bootstrapStartChapter(chapterCode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterCode]);

    const startChapter = async () => {
        if (!chapter?.id) return;
        if (selectedIds.length === 0) return;

        const ok = await startChapterWithQuests({
            chapter_id: chapter.id,
            adventure_quest_ids: selectedIds,
        });

        if (ok) router.push("/adventure");
    };

    if (!chapterCode) {
        return (
            <RpgShell title="Chapitre" rightSlot={null}>
                <Panel title="Erreur" emoji="⚠️" subtitle="Code manquant dans l’URL.">
                    <ActionButton variant="solid" onClick={() => router.push("/new")}>
                        ↩️ Retour
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

                    <ActionButton onClick={() => router.back()}>↩️ Retour</ActionButton>

                    <ActionButton
                        variant="solid"
                        onClick={() => void startChapter()}
                        disabled={!chapter?.id || selectedIds.length === 0 || starting}
                    >
                        {starting ? "⏳" : "🗡️ Démarrer"}
                    </ActionButton>
                </div>
            }
        >
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement…
                </div>
            ) : !chapter ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    Chapitre introuvable pour: <b>{chapterCode}</b>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <Panel
                            title="Backlog"
                            emoji="📜"
                            subtitle="Choisis les quêtes à intégrer à ce chapitre."
                            right={<Pill>{backlog.length} quêtes</Pill>}
                        >
                            <div className="space-y-2">
                                {backlog.length === 0 ? (
                                    <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
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
                                                type="button"
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
                                                    <div className="mt-2 rpg-text-sm text-white/60">
                                                        {q.description}
                                                    </div>
                                                ) : null}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </Panel>
                    </div>
                    <div>
                        <div className="mb-4">
                            <Panel
                                title="Contexte"
                                emoji="🧾"
                                subtitle="Pourquoi ce chapitre, contraintes, objectifs, état d’esprit…"
                                right={<Pill>{contextSaving ? "💾" : "✍️"}</Pill>}
                            >
                                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                    <textarea
                                        value={contextText}
                                        onChange={(e) => setContextText(e.target.value)}
                                        placeholder={
                                            "Ex:\n- Objectif: remettre la cuisine en ordre.\n- Durée: 25 min max.\n- Contraintes: bébé dort à 21h.\n- Priorité: évier + plan de travail.\n"
                                        }
                                        className="min-h-[180px] w-full resize-none rounded-2xl bg-black/25 px-4 py-3 rpg-text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/35 focus:ring-2 focus:ring-white/25"
                                    />

                                    <div className="mt-3 flex items-center justify-between gap-2">
                                        <div className="text-xs text-white/45">
                                            Ce contexte guide le MJ pour les missions et le ton.
                                        </div>

                                        <ActionButton
                                            variant="solid"
                                            disabled={contextSaving}
                                            onClick={async () => {
                                                setContextSaving(true);
                                                try {
                                                    await saveContext();
                                                } finally {
                                                    setContextSaving(false);
                                                }
                                            }}
                                        >
                                            {contextSaving ? "⏳ Sauvegarde…" : "💾 Sauvegarder"}
                                        </ActionButton>
                                    </div>
                                </div>
                            </Panel>
                        </div>
                        <Panel
                            title="Résumé"
                            emoji="📌"
                            subtitle="Ton chapitre, en quelques lignes."
                        >
                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 rpg-text-sm text-white/70">
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

                                <div className="mt-4 flex gap-2">
                                    <ActionButton
                                        variant="solid"
                                        onClick={() => void startChapter()}
                                        disabled={
                                            !chapter?.id || selectedIds.length === 0 || starting
                                        }
                                        className="w-full"
                                    >
                                        {starting ? "⏳ Démarrage…" : "🗡️ Démarrer le chapitre"}
                                    </ActionButton>
                                </div>
                            </div>
                        </Panel>
                    </div>
                </div>
            )}
        </RpgShell>
    );
}
