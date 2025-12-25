"use client";

// React
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { QuestDifficultyPill } from "@/helpers/questDifficulty";
import ReactMarkdown from "react-markdown";
import MasterCard from "@/components/ui/MasterCard";
import { getCurrentCharacterEmoji, getCurrentCharacterName } from "@/helpers/adventure";
import { AnimatePresence, motion } from "framer-motion";

// Stores
import { useGameStore } from "@/stores/gameStore";
import { useJournalStore } from "@/stores/journalStore";

type Quest = {
    id: string;
    title: string;
    description: string | null;
    brief: string | null;
    status: "todo" | "doing" | "done";
    room_code: string | null;
    difficulty?: number | null;
};

type ChapterQuest = {
    id: string;
    quest_id: string;
    chapter_id: string;
    status: "todo" | "doing" | "done";
};

export default function QuestClient() {
    const router = useRouter();
    const sp = useSearchParams();

    // ex: /quest?cq=uuid
    const chapterQuestId = sp.get("cq");

    const [loading, setLoading] = useState(true);
    const [chapterQuest, setChapterQuest] = useState<ChapterQuest | null>(null);
    const [missionMd, setMissionMd] = useState<string | null>(null);
    const [quest, setQuest] = useState<Quest | null>(null);
    const [busy, setBusy] = useState(false);

    const journalEntries = useJournalStore((s) => s.entries);
    const journalLoading = useJournalStore((s) => s.loading);
    const loadJournal = useJournalStore((s) => s.load);

    // ✅ actions centralisées store (toast + journal + renown)
    const startQuest = useGameStore((s) => s.startQuest);
    const finishQuest = useGameStore((s) => s.finishQuest);
    const bootstrap = useGameStore((s) => s.bootstrap);

    const [mounted, setMounted] = useState(false);
    const [encOpen, setEncOpen] = useState(false);

    useEffect(() => setMounted(true), []);

    const askEncouragement = useGameStore((s) => s.askEncouragement);
    const clearEncouragement = useGameStore((s) => s.clearEncouragement);
    const encouragementLoading = useGameStore((s) => s.encouragementLoading);
    const encouragementById = useGameStore((s) => s.encouragementByChapterQuestId);

    const encouragement = chapterQuestId ? encouragementById[chapterQuestId] : undefined;

    const load = async () => {
        if (!chapterQuestId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/chapter-quests/${encodeURIComponent(chapterQuestId)}`, {
                cache: "no-store",
            });
            const json = await res.json();

            if (!res.ok) {
                console.error(json?.error ?? "Load failed");
                return;
            }

            setChapterQuest(json.chapterQuest);
            setQuest(json.quest);
            setMissionMd(json.mission_md ?? json.mission?.mission_md ?? null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterQuestId]);

    useEffect(() => {
        // On charge une fois (entries sont côté store)
        void loadJournal(120);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const questJournal = React.useMemo(() => {
        if (!quest?.id) return [];

        return (journalEntries ?? [])
            .filter((e) => e.adventure_quest_id === quest.id)
            .slice()
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)); // newest first
    }, [journalEntries, quest?.id]);

    // ✅ wrappers: délègue au store, garde le state local à jour
    const onStart = async () => {
        if (!chapterQuestId || !quest) return;

        setBusy(true);
        try {
            const cq = await startQuest(chapterQuestId, {
                id: quest.id,
                title: quest.title,
                room_code: quest.room_code,
                difficulty: quest.difficulty ?? null,
                mission_md: missionMd ?? null, // ✅ NEW
            } as any);

            if (cq) setChapterQuest(cq);
        } finally {
            setBusy(false);
        }
    };

    const onFinish = async () => {
        if (!chapterQuestId || !quest) return;

        setBusy(true);
        try {
            const cq = await finishQuest(chapterQuestId, {
                id: quest.id,
                title: quest.title,
                room_code: quest.room_code,
                difficulty: quest.difficulty ?? null,
            } as any);

            clearEncouragement(chapterQuestId);

            if (cq) {
                setChapterQuest(cq);
                router.push("/adventure");
            }
        } finally {
            setBusy(false);
        }
    };

    const onEncourage = async () => {
        if (!chapterQuestId || !quest) return;

        // On ouvre la modal tout de suite (style “invocation du MJ”)
        setEncOpen(true);

        // Si déjà en cache store, on ne regen pas forcément
        if (encouragement?.message) return;

        await askEncouragement(chapterQuestId, {
            chapter_quest_id: chapterQuestId,
            quest_title: quest.title,
            room_code: quest.room_code ?? null,
            difficulty: quest.difficulty ?? null,
            mission_md: missionMd ?? null,
        });
    };

    function formatTime(iso: string) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    if (!chapterQuestId) {
        return (
            <RpgShell title="Quête">
                <Panel title="Erreur" emoji="⚠️" subtitle="Paramètre manquant.">
                    <ActionButton variant="solid" onClick={() => router.push("/adventure")}>
                        ↩️ Retour aux quêtes
                    </ActionButton>
                </Panel>
            </RpgShell>
        );
    }

    return (
        <RpgShell title="Quête" returnButton={false}>
            {loading || !quest || !chapterQuest ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement de la quête…
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* LEFT */}
                    <div className="flex flex-col gap-5">
                        <Panel title="Quête" emoji="🔖">
                            <div className="flex flex-col gap-3">
                                <div className="text-white/90 font-semibold">{quest.title}</div>

                                <div className="flex flex-wrap gap-2">
                                    {quest.room_code ? (
                                        <Pill>🚪 {quest.room_code}</Pill>
                                    ) : (
                                        <Pill>🗺️ sans pièce</Pill>
                                    )}

                                    {quest.difficulty ? (
                                        <QuestDifficultyPill difficulty={quest.difficulty} />
                                    ) : (
                                        <Pill>🎚️ —</Pill>
                                    )}
                                </div>
                            </div>
                        </Panel>

                        <MasterCard
                            title="Ordre de mission"
                            emoji="📖"
                            badgeText={getCurrentCharacterName()}
                            badgeEmoji={getCurrentCharacterEmoji()}
                        >
                            {missionMd ? (
                                <div
                                    className="prose prose-invert max-w-none rpg-text-sm
                                        prose-p:my-4
                                        prose-ul:my-4
                                        prose-li:my-1
                                        prose-strong:text-white
                                    "
                                >
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => <p className="my-4">{children}</p>,
                                            ul: ({ children }) => (
                                                <ul className="my-4 list-disc pl-6">{children}</ul>
                                            ),
                                            li: ({ children }) => (
                                                <li className="my-1">{children}</li>
                                            ),
                                            strong: ({ children }) => (
                                                <strong className="text-white">{children}</strong>
                                            ),
                                        }}
                                    >
                                        {missionMd}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="rpg-text-sm text-white/60">
                                    Aucun brief généré pour l’instant.
                                </div>
                            )}
                        </MasterCard>
                    </div>

                    {/* RIGHT */}
                    <div className="flex flex-col gap-4">
                        <Panel title="Actions" emoji="⚔️">
                            <div className="flex flex-col gap-3">
                                {chapterQuest.status === "todo" && (
                                    <>
                                        <ActionButton
                                            variant="solid"
                                            onClick={onStart}
                                            disabled={busy}
                                        >
                                            ▶️ Démarrer la quête
                                        </ActionButton>

                                        <ActionButton onClick={() => router.push("/adventure")}>
                                            ↩️ Retour
                                        </ActionButton>
                                    </>
                                )}

                                {chapterQuest.status === "doing" && (
                                    <>
                                        <ActionButton
                                            variant="solid"
                                            onClick={onFinish}
                                            disabled={busy}
                                        >
                                            ✅ Terminer la quête
                                        </ActionButton>

                                        <ActionButton
                                            variant="master"
                                            onClick={onEncourage}
                                            disabled={busy}
                                        >
                                            ✨ Demander un encouragement
                                        </ActionButton>

                                        <ActionButton onClick={() => router.push("/adventure")}>
                                            ↩️ Retour
                                        </ActionButton>
                                    </>
                                )}

                                {chapterQuest.status === "done" && (
                                    <ActionButton
                                        variant="solid"
                                        onClick={() => router.push("/adventure")}
                                    >
                                        ↩️ Retour
                                    </ActionButton>
                                )}
                            </div>
                        </Panel>
                        <Panel
                            title="Journal de quête"
                            emoji="📓"
                            subtitle="Les dernières traces laissées pendant cette quête."
                            right={<Pill>{journalLoading ? "⏳" : `${questJournal.length}`}</Pill>}
                        >
                            {journalLoading ? (
                                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                                    ⏳ Chargement du journal…
                                </div>
                            ) : questJournal.length === 0 ? (
                                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                                    Aucune entrée pour cette quête (encore). Lance-la et écris
                                    l’histoire ✍️
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {questJournal.map((e) => (
                                        <div
                                            key={e.id}
                                            className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-white/90">
                                                        {e.title}
                                                    </div>
                                                    {e.content ? (
                                                        <div className="mt-1 whitespace-pre-line rpg-text-sm text-white/70">
                                                            {e.content}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="shrink-0 text-[11px] text-white/45">
                                                    {formatTime(e.created_at)}
                                                </div>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Pill>🏷️ {e.kind}</Pill>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Panel>
                    </div>
                </div>
            )}
            {mounted
                ? createPortal(
                      <AnimatePresence>
                          {encOpen ? (
                              <motion.div
                                  className="fixed inset-0 z-[120] grid place-items-center bg-black/55 backdrop-blur-[3px] p-4"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onMouseDown={() => setEncOpen(false)}
                              >
                                  <motion.div
                                      className="w-full max-w-lg rounded-[28px] bg-white/5 p-5 ring-1 ring-white/15 backdrop-blur-md"
                                      initial={{ y: 16, scale: 0.98, opacity: 0 }}
                                      animate={{ y: 0, scale: 1, opacity: 1 }}
                                      exit={{ y: 10, scale: 0.98, opacity: 0 }}
                                      transition={{ duration: 0.22 }}
                                      onMouseDown={(e) => e.stopPropagation()}
                                  >
                                      <div className="flex items-start justify-between gap-3">
                                          <div>
                                              <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                                  🎭 Maître du jeu
                                              </div>
                                              <div className="mt-2 text-lg text-white/90">
                                                  {getCurrentCharacterEmoji()}{" "}
                                                  <span className="font-semibold">
                                                      {getCurrentCharacterName()}
                                                  </span>
                                              </div>
                                          </div>

                                          <ActionButton onClick={() => setEncOpen(false)}>
                                              ✖
                                          </ActionButton>
                                      </div>

                                      <MasterCard
                                          className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
                                          title="Encouragement"
                                          emoji="💪"
                                          badgeEmoji={getCurrentCharacterEmoji()}
                                          badgeText={getCurrentCharacterName()}
                                      >
                                          <div className="text-sm text-white/80 font-semibold">
                                              {encouragementLoading && !encouragement?.message
                                                  ? "🕯️ Le maître du jeu réfléchit…"
                                                  : (encouragement?.title ?? "Encouragement")}
                                          </div>

                                          <div className="mt-3 whitespace-pre-line rpg-text-sm text-white/70">
                                              {encouragementLoading && !encouragement?.message
                                                  ? "✨ ...\n✨ ...\n✨ ..."
                                                  : (encouragement?.message ??
                                                    "Aucun message pour l’instant.")}
                                          </div>
                                      </MasterCard>

                                      <div className="mt-5 flex justify-end">
                                          <ActionButton
                                              variant="solid"
                                              onClick={() => setEncOpen(false)}
                                          >
                                              🔥 Reprendre
                                          </ActionButton>
                                      </div>
                                  </motion.div>
                              </motion.div>
                          ) : null}
                      </AnimatePresence>,
                      document.body
                  )
                : null}
        </RpgShell>
    );
}
