"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

import { useGameStore } from "@/stores/gameStore";

import type { AdventureQuestWithStatus, AdventureRoom, Chapter } from "@/types/game";
import UiActionButton from "@/components/ui/UiActionButton";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function OnboardingFinishPage() {
    const router = useRouter();

    const loadLatestChapter = useGameStore((s) => s.loadLatestChapter);
    const reload = useGameStore((s) => s.reload);

    const chapterLoading = useGameStore((s) => s.chapterLoading);
    const backlogLoading = useGameStore((s) => s.adventureBacklogLoading);
    const starting = useGameStore((s) => s.startChapterStarting);

    const chapter = useGameStore((s) => (s.chapter ?? s.currentChapter) as Chapter | null);
    const adventure = useGameStore((s) => s.currentAdventure);
    const rooms = useGameStore((s) => s.rooms as AdventureRoom[]);
    const backlog = useGameStore((s) => s.adventureBacklog as AdventureQuestWithStatus[]);

    const startChapterWithQuests = useGameStore((s) => s.startChapterWithQuests);

    const completeOnboarding = useGameStore((s) => s.completeOnboarding);

    const [selected, setSelected] = useState<Record<string, boolean>>({});

    const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

    // Onboarding finish bootstrap:
    // 1) récupérer le dernier chapitre
    // 2) reloader ce qui dépend de l’adventure_id du chapitre (adventure/rooms/backlog)
    useEffect(() => {
        let mounted = true;

        (async () => {
            await loadLatestChapter();

            if (!mounted) return;

            // reload dépend du chapitre (qui contient adventure_id)
            await reload(["adventure", "rooms", "backlog"], { silent: true });

            if (!mounted) return;

            // Sélection auto "gentille": pré-sélectionner jusqu’à 8 quêtes au début
            // (tu peux enlever si tu veux du 100% manuel)
            const list = useGameStore.getState().adventureBacklog ?? [];
            if (!list.length) return;

            setSelected((prev) => {
                // si l'utilisateur a déjà cliqué, on ne touche pas
                if (Object.keys(prev).length) return prev;

                const first = list.slice(0, 8);
                const next: Record<string, boolean> = {};
                for (const q of first) {
                    if (q?.id) next[q.id] = true;
                }
                return next;
            });
        })();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loading = chapterLoading || backlogLoading;

    const toggleAll = (value: boolean) => {
        const next: Record<string, boolean> = {};
        for (const q of backlog) {
            if (q?.id) next[q.id] = value;
        }
        setSelected(next);
    };

    const onStart = async () => {
        if (!chapter?.id) return;
        if (selectedIds.length === 0) return;

        const ok = await startChapterWithQuests({
            chapter_id: chapter.id,
            adventure_quest_ids: selectedIds,
        });

        if (!ok) console.error("Impossible to create Chapter");

        const finish = await completeOnboarding();
        if (finish) {
            router.push("/onboarding/welcome"); // ou /adventure
        }
    };

    const bannerTitle = chapter?.title ?? "Chapitre 1";
    const advTitle = adventure?.title ?? adventure?.type_title ?? "Aventure";

    return (
        <RpgShell
            title="Dernière étape"
            subtitle="Choisis tes premières quêtes. Ensuite, on lance la partie. 🗡️"
            noRightSlot
            returnButton={false}
            largeLogo
        >
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Préparation…
                </div>
            ) : !chapter?.id ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    Chapitre introuvable. Reviens à l’étape précédente pour le créer.
                    <div className="mt-3">
                        <ActionButton onClick={() => router.push("/onboarding/quests")}>
                            ↩️ Retour
                        </ActionButton>
                    </div>
                </div>
            ) : (
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
                                backgroundImage: "url('/assets/images/onboarding/finish.png')",
                            }}
                        />

                        {/* Gradient overlay (left → right) */}
                        <div
                            className={cn(
                                "absolute inset-0",
                                "bg-gradient-to-r",
                                "from-black via-black/85 to-transparent"
                            )}
                        />

                        {/* Content */}
                        <div className="relative p-6 sm:p-8">
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Renaissance
                            </div>

                            <h1 className="mt-4 font-main-title text-3xl sm:text-4xl text-white/95">
                                Sceller le chapitre.
                            </h1>

                            <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                                Dernier rituel: choisis les quêtes qui entrent dans ce premier
                                chapitre.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        {/* BACKLOG */}
                        <Panel
                            title="Backlog"
                            emoji="📜"
                            subtitle="Clique pour sélectionner les quêtes à intégrer au chapitre."
                            right={
                                <Pill>
                                    {selectedIds.length} / {backlog.length}
                                </Pill>
                            }
                        >
                            <div className="mb-3 flex flex-wrap gap-2">
                                <ActionButton
                                    variant="soft"
                                    onClick={() => toggleAll(true)}
                                    disabled={!backlog.length}
                                >
                                    ✅ Tout
                                </ActionButton>
                                <ActionButton
                                    variant="soft"
                                    onClick={() => toggleAll(false)}
                                    disabled={!backlog.length}
                                >
                                    ⬜ Rien
                                </ActionButton>
                                {/* <Pill>Astuce: vise 6–12 quêtes</Pill> */}
                            </div>

                            <div className="space-y-2">
                                {backlog.length === 0 ? (
                                    <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                                        Ton backlog est vide. Retourne à l’étape “Quêtes” pour en
                                        ajouter ou générer via l’IA 🎲
                                        <div className="mt-3">
                                            <ActionButton
                                                variant="solid"
                                                onClick={() => router.push("/onboarding/quests")}
                                            >
                                                ↩️ Retour aux quêtes
                                            </ActionButton>
                                        </div>
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

                                                        <Pill>🎚️ {q.difficulty ?? 2}</Pill>
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

                        {/* SUMMARY */}
                        <Panel title="Résumé" emoji="📌" subtitle="Ton départ, en quelques lignes.">
                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 rpg-text-sm text-white/70">
                                <div>
                                    <span className="text-white/85 font-semibold">Chapitre:</span>{" "}
                                    {chapter.title ?? "—"}
                                </div>

                                <div className="mt-2">
                                    <span className="text-white/85 font-semibold">Aventure:</span>{" "}
                                    {advTitle}
                                </div>

                                <div className="mt-2">
                                    <span className="text-white/85 font-semibold">
                                        Quêtes sélectionnées:
                                    </span>{" "}
                                    {selectedIds.length}
                                </div>

                                <div className="mt-3 text-xs text-white/55">
                                    Après validation, tu retrouveras tes quêtes dans l’aventure.
                                </div>

                                {/* <div className="mt-4 flex flex-col gap-2">
                                    <ActionButton
                                        variant="master"
                                        onClick={() => void onStart()}
                                        disabled={
                                            !chapter?.id || selectedIds.length === 0 || starting
                                        }
                                        className="w-full"
                                    >
                                        {starting ? "⏳ Lancement…" : "🗡️ Lancer la partie"}
                                    </ActionButton>

                                    <ActionButton
                                        variant="soft"
                                        onClick={() => router.push("/onboarding/quests")}
                                        className="w-full"
                                    >
                                        ↩️ Retour aux quêtes
                                    </ActionButton>
                                </div> */}

                                {selectedIds.length === 0 ? (
                                    <div className="mt-3 text-xs text-white/45">
                                        Sélectionne au moins une quête pour continuer.
                                    </div>
                                ) : null}
                            </div>
                        </Panel>
                    </div>

                    {/* CTA final full width */}
                    <UiActionButton
                        variant="master"
                        size="xl"
                        onClick={() => void onStart()}
                        disabled={!chapter?.id || selectedIds.length === 0 || starting}
                        // className="w-full justify-center py-4 rounded-3xl text-base"
                    >
                        {starting ? "⏳ Démarrage…" : "🚀 Terminer l’onboarding et démarrer"}
                    </UiActionButton>

                    <div className="text-xs text-white/50 text-center">
                        Un bon premier chapitre: clair, court, jouable. Le reste viendra. ✨
                    </div>
                </div>
            )}
        </RpgShell>
    );
}
