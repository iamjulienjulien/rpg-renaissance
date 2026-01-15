"use client";

// React
import React, { useEffect } from "react";

// Components
import { Panel, Pill, ActionButton } from "@/components/RpgUi";
import MasterCard from "@/components/MasterCard";

// Stores
import { useGameStore } from "@/stores/gameStore";
import { type ChapterStoryRow } from "@/types/game";
import { useAiStore } from "@/stores/aiStore";

// Interfaces

type StoryScene = {
    chapter_quest_id: string;
    quest_title: string;
    room_code: string;
    scene: string;
};

type StoryTrophy = {
    title: string;
    description: string;
};

type ChapterStoryJson = {
    title: string;
    summary: string;
    scenes: StoryScene[];
    trophies: StoryTrophy[];
    mj_verdict: string;
};

type ChapterStoryUI = ChapterStoryJson & {
    chapter_id: string;
    updated_at?: string;
    model?: string | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function IlluminatedHeader(props: { eyebrow?: string; title: string; badge?: React.ReactNode }) {
    return (
        <div className="relative overflow-hidden rounded-[26px] p-5 ring-1 ring-white/10 bg-black/25">
            <div
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 opacity-70",
                    "bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_75%_60%,rgba(255,255,255,0.10),transparent_40%),linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_55%)]"
                )}
            />
            <div
                aria-hidden
                className={cn(
                    "pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full blur-2xl opacity-25",
                    "bg-linear-to-br from-amber-200 via-fuchsia-400 to-cyan-300"
                )}
            />

            <div className="relative flex items-start justify-between gap-3">
                <div>
                    {props.eyebrow ? (
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            {props.eyebrow}
                        </div>
                    ) : null}
                    <div className="mt-2 text-lg font-semibold text-white/90">{props.title}</div>
                </div>
                {props.badge ? <div className="shrink-0">{props.badge}</div> : null}
            </div>
        </div>
    );
}

function DropCapParagraph({ text }: { text: string }) {
    const t = (text ?? "").trim();
    if (!t) return null;

    const first = t[0];
    const rest = t.slice(1).replace(/^\s+/, ""); // évite " e foyer..." si espace après la 1ère lettre

    return (
        <div className="text-sm text-white/70 leading-7">
            <span
                className={cn(
                    "float-left mr-3 mt-0.5",
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    "bg-white/6 ring-1 ring-white/10",
                    "text-[26px] font-semibold text-white/90 leading-none",
                    "select-none",
                    "translate-y-px"
                )}
                aria-hidden
            >
                {first}
            </span>

            <span className="whitespace-pre-line">{rest}</span>
        </div>
    );
}

function formatDayFR(d: Date) {
    return d.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export default function StoryView() {
    const currentAdventure = useGameStore((s) => s.currentAdventure);

    const getChaptersByAdventure = useGameStore((s) => s.getChaptersByAdventure);
    const chaptersByAdventureId = useGameStore((s) => s.chaptersByAdventureId);
    const chaptersLoadingByAdventureId = useGameStore((s) => s.chaptersLoadingByAdventureId);

    const getChapterStory = useGameStore((s) => s.getChapterStory);
    const generateChapterStory = useGameStore((s) => s.generateChapterStory);

    const storyById = useGameStore((s) => s.chapterStoryByChapterId);
    const loadingById = useGameStore((s) => s.chapterStoryLoadingById);

    const adventureId = currentAdventure?.id ?? "";
    const chapters = adventureId ? (chaptersByAdventureId?.[adventureId] ?? []) : [];
    const chaptersLoading = adventureId ? !!chaptersLoadingByAdventureId?.[adventureId] : false;

    const { generateJournalChapterStory } = useAiStore();

    const { currentUserId } = useGameStore();

    // 1) Charger tous les chapitres de l’aventure
    useEffect(() => {
        if (!adventureId) return;
        void getChaptersByAdventure(adventureId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adventureId]);

    // 2) Charger les stories (best-effort) une fois les chapitres dispo
    useEffect(() => {
        if (!chapters?.length) return;
        for (const ch of chapters) {
            void getChapterStory(ch.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapters.map((c) => c.id).join("|")]);

    const onGenerateOne = async (chapterId: string, force: boolean) => {
        await generateJournalChapterStory({ chapter_id: chapterId, user_id: currentUserId, force });
        await getChapterStory(chapterId);
    };

    const onGenerateAll = async (force: boolean) => {
        if (!chapters.length) return;
        for (const ch of chapters) {
            // ⚠️ sériel volontaire (évite 10 requêtes IA en parallèle)
            await onGenerateOne(ch.id, force);
        }
    };

    const storyCount = chapters.reduce((acc, ch) => acc + (storyById?.[ch.id] ? 1 : 0), 0);

    return (
        <Panel
            title="Récit du Maître du Jeu"
            emoji="📖"
            subtitle="Chroniques fixes, stockées en BDD, chapitre par chapitre."
            right={
                <div className="flex items-center gap-2">
                    <Pill>{adventureId ? `🗺️ ${chapters.length} chap.` : "⚠️ Pas d’aventure"}</Pill>
                    <Pill>📜 {storyCount}</Pill>

                    <ActionButton
                        variant="soft"
                        disabled={!adventureId || chaptersLoading || chapters.length === 0}
                        onClick={() => void onGenerateAll(false)}
                    >
                        🪶 Générer tout
                    </ActionButton>

                    <ActionButton
                        variant="soft"
                        disabled={!adventureId || chaptersLoading || chapters.length === 0}
                        onClick={() => void onGenerateAll(true)}
                    >
                        🔥 Force tout
                    </ActionButton>
                </div>
            }
        >
            {!adventureId ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    Aucune aventure active. Lance une aventure pour écrire le grimoire.
                </div>
            ) : chaptersLoading ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    ⏳ Chargement des chapitres…
                </div>
            ) : chapters.length === 0 ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    Aucun chapitre trouvé pour cette aventure.
                </div>
            ) : (
                <div className="grid gap-4">
                    {chapters
                        .slice()
                        .sort(
                            (a, b) =>
                                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        )
                        .map((ch) => {
                            const row = storyById?.[ch.id] as ChapterStoryRow | undefined;

                            const s: ChapterStoryUI | undefined = row
                                ? {
                                      chapter_id: row.chapter_id,
                                      ...(row.story_json ?? {}),
                                      updated_at: row.updated_at,
                                      model: row.model,
                                  }
                                : undefined;

                            const loading = !!loadingById?.[ch.id];

                            const scenes = Array.isArray(s?.scenes) ? s!.scenes : [];
                            const trophies = Array.isArray(s?.trophies) ? s!.trophies : [];
                            const mjVerdict =
                                typeof s?.mj_verdict === "string" ? s.mj_verdict.trim() : "";

                            return (
                                <div key={ch.id} className="grid gap-3">
                                    <IlluminatedHeader
                                        eyebrow={`Chapitre · ${ch.status}`}
                                        title={ch.title}
                                        badge={
                                            <div className="flex items-center gap-2">
                                                <Pill>
                                                    🕯️ {formatDayFR(new Date(ch.created_at))}
                                                </Pill>
                                                <ActionButton
                                                    variant="soft"
                                                    disabled={loading}
                                                    onClick={() => void onGenerateOne(ch.id, false)}
                                                >
                                                    {loading
                                                        ? "⏳"
                                                        : s
                                                          ? "🪶 Mettre à jour"
                                                          : "🪶 Générer"}
                                                </ActionButton>
                                                <ActionButton
                                                    variant="soft"
                                                    disabled={loading}
                                                    onClick={() => void onGenerateOne(ch.id, true)}
                                                >
                                                    🔥 Force
                                                </ActionButton>
                                            </div>
                                        }
                                    />

                                    {!s ? (
                                        <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                                            Ce chapitre n’a pas encore de chronique.
                                        </div>
                                    ) : (
                                        <MasterCard
                                            title={(s.title || "Chronique").trim()}
                                            emoji="📜"
                                        >
                                            <div className="grid gap-4">
                                                <div>
                                                    <div className="mb-2 text-xs tracking-[0.22em] text-white/55 uppercase">
                                                        Récapitulatif
                                                    </div>
                                                    <DropCapParagraph text={s.summary} />
                                                </div>

                                                <div>
                                                    <div className="mb-2 text-xs tracking-[0.22em] text-white/55 uppercase">
                                                        Scènes
                                                    </div>
                                                    <div className="grid gap-2">
                                                        {scenes.map((sc, idx) => (
                                                            <div
                                                                key={
                                                                    sc.chapter_quest_id || `${idx}`
                                                                }
                                                                className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 text-sm text-white/75"
                                                            >
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="text-white/90 font-semibold">
                                                                        {idx + 1}.
                                                                    </span>
                                                                    <span className="text-white/90 font-semibold">
                                                                        {sc.quest_title}
                                                                    </span>
                                                                    {sc.room_code ? (
                                                                        <Pill>
                                                                            🗺️ {sc.room_code}
                                                                        </Pill>
                                                                    ) : null}
                                                                </div>
                                                                <div className="mt-2 text-white/70 leading-7 whitespace-pre-line">
                                                                    {sc.scene}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="mb-2 text-xs tracking-[0.22em] text-white/55 uppercase">
                                                        Trophées
                                                    </div>

                                                    {trophies.length === 0 ? (
                                                        <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 text-sm text-white/55">
                                                            Aucun trophée pour l’instant.
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {trophies.map((t, idx) => (
                                                                <span
                                                                    key={`${t.title}-${idx}`}
                                                                    title={t.description || ""}
                                                                    className="inline-flex"
                                                                >
                                                                    <Pill>🏅 {t.title}</Pill>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {mjVerdict ? (
                                                    <div>
                                                        <div className="mb-2 text-xs tracking-[0.22em] text-white/55 uppercase">
                                                            Avis du MJ
                                                        </div>
                                                        <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 text-sm text-white/75">
                                                            {mjVerdict}
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <div className="text-xs text-white/45">
                                                    Stocké en BDD.
                                                    {s.updated_at
                                                        ? ` Maj: ${formatDayFR(
                                                              new Date(s.updated_at)
                                                          )}.`
                                                        : ""}
                                                    {s.model ? ` Model: ${s.model}.` : ""}
                                                </div>
                                            </div>
                                        </MasterCard>
                                    )}
                                </div>
                            );
                        })}
                </div>
            )}
        </Panel>
    );
}
