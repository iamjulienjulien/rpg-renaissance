"use client";

// React
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

// Components
import RpgShell from "@/components/RpgShell";
import { Panel, Pill, ActionButton } from "@/components/RpgUi";
import MasterCard from "@/components/MasterCard";
import { UiMetricCard } from "@/components/ui/stats/UiMetricCard";
import { UiSparkline } from "@/components/ui/stats/UiSparkline";
import { UiBarChartMini } from "@/components/ui/stats/UiBarChartMini";
import { UiDonut } from "@/components/ui/stats/UiDonut";

// Stores
import { useJournalStore } from "@/stores/journalStore";
import { useGameStore } from "@/stores/gameStore";
import { type ChapterStoryRow, type MeStatsResponse } from "@/types/game";
import { UiChip, UiGradientPanel, UiPanel } from "@/components/ui";
import { useAiStore } from "@/stores/aiStore";

// Interfaces
type Entry = {
    id: string;
    kind: string;
    title: string;
    content: string | null;
    chapter_id: string | null;
    quest_id: string | null;
    created_at: string;
};

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

function formatShortDateFR(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "2-digit" });
}

function safeNumber(x: any, fallback = 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : fallback;
}

function GrimoireBackdrop({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative">
            {/* Vignette + teinte */}
            <div
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 -z-10 rounded-[32px]",
                    "bg-gradient-to-b from-amber-200/6 via-white/0 to-black/35",
                    "ring-1 ring-white/10"
                )}
            />

            {/* “papier” (grain) */}
            <div
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 -z-10 rounded-[32px] opacity-[0.16]",
                    "bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.20),transparent_42%),radial-gradient(circle_at_70%_65%,rgba(255,255,255,0.10),transparent_45%),radial-gradient(circle_at_55%_35%,rgba(0,0,0,0.25),transparent_55%)]"
                )}
            />

            {/* Noise (CSS only) */}
            <div
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 -z-10 rounded-[32px] opacity-[0.08] mix-blend-overlay",
                    "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E\")]"
                )}
            />

            {/* Légère lueur */}
            <div
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-0 -z-10 rounded-[32px] opacity-[0.10]",
                    "bg-gradient-to-r from-fuchsia-400/15 via-cyan-300/10 to-emerald-300/15"
                )}
            />

            {children}
        </div>
    );
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
                    "bg-gradient-to-br from-amber-200 via-fuchsia-400 to-cyan-300"
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
                    "translate-y-[1px]"
                )}
                aria-hidden
            >
                {first}
            </span>

            <span className="whitespace-pre-line">{rest}</span>
        </div>
    );
}

function kindBadge(kind: string) {
    if (kind === "adventure_created")
        return { label: "✨ Aventure", tone: "bg-white/10 text-white ring-white/15" };
    if (kind === "quests_seeded")
        return { label: "📜 Quêtes", tone: "bg-white/10 text-white ring-white/15" };
    if (kind === "chapter_created")
        return { label: "📘 Chapitre", tone: "bg-white/10 text-white ring-white/15" };
    if (kind === "chapter_started")
        return { label: "✨ Chapitre", tone: "bg-white/10 text-white ring-white/15" };
    if (kind === "quest_started")
        return { label: "✨ Quête", tone: "bg-white/10 text-white ring-white/15" };
    if (kind === "quest_done")
        return {
            label: "✅ Quête",
            tone: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/20",
        };
    if (kind === "quest_reopened")
        return { label: "↩️ Quête", tone: "bg-amber-400/10 text-amber-200 ring-amber-400/20" };
    return { label: "📝 Note", tone: "bg-white/5 text-white/70 ring-white/10" };
}

function formatDayFR(d: Date) {
    return d.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function formatTimeFR(d: Date) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

type FilterKey = "all" | "system" | "chapters" | "quests" | "notes";
type TabKey = "logs" | "story" | "renown" | "stats";

/* ----------------------------------------------------------------------------
UI: onglets "grimoire"
---------------------------------------------------------------------------- */

function GrimoireTabs(props: {
    tab: TabKey;
    setTab: (t: TabKey) => void;
    counts: { logs: number; story: number; renown: number; stats: number };
}) {
    const items: Array<{ key: TabKey; label: string; hint?: string }> = [
        { key: "logs", label: "📜 Traces", hint: `${props.counts.logs}` },
        { key: "story", label: "📖 Récit", hint: `${props.counts.story}` },
        { key: "renown", label: "🏆 Renommée", hint: `${props.counts.renown}` },
        { key: "stats", label: "📊 Stats", hint: `${props.counts.stats}` },
    ];

    return (
        <div
            className={cn(
                "mb-4 rounded-[28px] p-3 ring-1 ring-white/10",
                "bg-gradient-to-b from-white/5 to-black/25",
                "backdrop-blur-md"
            )}
        >
            <div className="flex flex-wrap gap-2">
                {items.map((it) => {
                    const active = props.tab === it.key;
                    return (
                        <button
                            key={it.key}
                            type="button"
                            onClick={() => props.setTab(it.key)}
                            className={cn(
                                "group relative overflow-hidden rounded-full px-4 py-2 text-sm ring-1 transition",
                                active
                                    ? "bg-white/12 text-white ring-white/20"
                                    : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
                            )}
                        >
                            <span className="relative z-10 inline-flex items-center gap-2">
                                <span className="font-semibold">{it.label}</span>
                                {it.hint ? (
                                    <span
                                        className={cn(
                                            "rounded-full px-2 py-0.5 text-[11px] ring-1",
                                            active
                                                ? "bg-white/10 text-white/85 ring-white/15"
                                                : "bg-black/25 text-white/60 ring-white/10"
                                        )}
                                    >
                                        {it.hint}
                                    </span>
                                ) : null}
                            </span>

                            {/* petite “enluminure” */}
                            <span
                                aria-hidden
                                className={cn(
                                    "pointer-events-none absolute inset-0 opacity-0 transition",
                                    "bg-gradient-to-r from-fuchsia-400/10 via-cyan-300/10 to-emerald-300/10",
                                    active ? "opacity-100" : "group-hover:opacity-60"
                                )}
                            />
                        </button>
                    );
                })}
            </div>

            <div className="mt-2 text-xs text-white/45">
                Feuillette: les traces (brutes), le récit (MJ), et la renommée (score détaillé).
            </div>
        </div>
    );
}

function StoryView() {
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

/* ----------------------------------------------------------------------------
Tab 3: renommée (placeholder)
---------------------------------------------------------------------------- */

type RenownEvent = {
    id: string;
    created_at: string;
    delta: number;
    reason: string;
    chapterTitle?: string;
    questTitle?: string;
};

function RenownView() {
    const currentPlayer = useGameStore((s) => s.currentPlayer);

    const renownValue = safeNumber(currentPlayer?.renown?.value, 0);
    const renownUpdatedAt = currentPlayer?.renown?.updated_at ?? null;

    const level = currentPlayer?.renown?.level ?? null;
    const levelNumber = level?.number ?? null;
    const levelTitle = (level?.title ?? "").trim();
    const tierTitle = (level?.tier_title ?? "").trim();
    const levelSuffix = (level?.level_suffix ?? "").trim();
    const isMilestone = !!level?.is_milestone;

    const displayName =
        (currentPlayer?.display_name ?? "").trim() ||
        (currentPlayer?.first_name ?? "").trim() ||
        "Aventurier";

    const badges = Array.isArray(currentPlayer?.badges) ? currentPlayer!.badges : [];
    const badgesSorted = badges
        .slice()
        .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime());

    // ⚠️ Si tu n’as pas encore de table d’événements de renommée, on évite les fausses datas.
    // Petite jauge "symbolique" (mod 100) en attendant un vrai calcul.
    const into = renownValue % 100;
    const pct = Math.max(0, Math.min(100, (into / 100) * 100));

    return (
        <UiPanel
            title="Renommée"
            emoji="🏆"
            subtitle="Ta trace dans le monde: niveau, titre, et badges gagnés."
            // variant="ghost"
            // right={
            //     <div className="flex items-center gap-2">
            //         <Pill>🏷️ {displayName}</Pill>
            //         <Pill>🏅 {badges.length}</Pill>
            //     </div>
            // }
        >
            <div className="grid gap-4">
                {/* Carte Renommée */}
                <UiGradientPanel innerClassName="p-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Niveau actuel
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <div className="text-3xl font-semibold text-white/90">
                                        {levelNumber != null ? levelNumber : "—"}
                                    </div>

                                    {levelTitle ? (
                                        <UiChip size="md" tone="theme">
                                            ✨ {levelTitle}
                                        </UiChip>
                                    ) : null}

                                    {tierTitle ? (
                                        <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                                            🏛️ {tierTitle}
                                        </span>
                                    ) : null}

                                    {/* {levelSuffix ? (
                                        <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                                            {levelSuffix}
                                        </span>
                                    ) : null} */}

                                    {isMilestone ? (
                                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200 ring-1 ring-emerald-400/20">
                                            ⭐ Palier
                                        </span>
                                    ) : null}
                                </div>

                                <div className="mt-2 text-sm text-white/60">
                                    Renommée totale:{" "}
                                    <span className="text-white/85">{renownValue}</span>
                                </div>

                                {/* <div className="mt-1 text-xs text-white/45">
                                    Maj: {formatShortDateFR(renownUpdatedAt)}
                                </div> */}
                            </div>
                            <div className="flex">
                                <div className="mr-4 ring-1 ring-white/10 p-1 rounded">
                                    <img
                                        src={`/assets/images/levels/1.png`}
                                        alt="level"
                                        className="w-[98px] h-[98px] rounded"
                                    />
                                </div>
                                <div className="rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                                    <div className="text-xs text-white/55">Progression</div>
                                    <div className="mt-1 text-sm text-white/85 font-semibold">
                                        ✨ {into}/100
                                    </div>
                                    <div className="mt-1 text-[11px] text-white/45">
                                        {" "}
                                        Maj: {formatShortDateFR(renownUpdatedAt)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Barre */}
                        <div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                                <div
                                    className="h-full rounded-full bg-white/25"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            {/* <div className="mt-2 flex items-center justify-between text-xs text-white/55">
                                <span>Chaque pas compte.</span>
                                <span>Reste: {100 - into}</span>
                            </div> */}
                        </div>

                        {/* Petit texte narratif */}
                        {/* <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10 text-sm text-white/70 leading-7">
                            <span className="text-white/85 font-semibold">Le MJ note:</span> ta
                            renommée n’est pas une note, c’est une trace. Elle grimpe quand tu
                            avances, même lentement. Elle reste quand tu reviens. 👁️‍🗨️
                        </div> */}
                    </div>
                </UiGradientPanel>

                {/* Badges acquis */}
                <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-white/85 font-semibold">🏅 Badges acquis</div>
                        <Pill>{badges.length}</Pill>
                    </div>

                    {badgesSorted.length === 0 ? (
                        <div className="mt-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                            Aucun badge pour l’instant. Termine une quête, franchis un palier, et
                            ils apparaîtront ici.
                        </div>
                    ) : (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {badgesSorted.map((b) => {
                                const emoji = (b.emoji ?? "🏅").trim() || "🏅";
                                const title = (b.title ?? "").trim() || b.code;
                                const desc = (b.description ?? "").trim();
                                const source = (b.source ?? "").trim();

                                return (
                                    <div
                                        key={b.code + b.unlocked_at}
                                        className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-white/90">
                                                    {emoji} {title}
                                                </div>

                                                {desc ? (
                                                    <div className="mt-2 text-sm text-white/65 leading-7">
                                                        {desc}
                                                    </div>
                                                ) : null}

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Pill>
                                                        🕯️ {formatShortDateFR(b.unlocked_at)}
                                                    </Pill>
                                                    {source ? <Pill>🧷 {source}</Pill> : null}
                                                </div>
                                            </div>

                                            <span className="shrink-0 rounded-full bg-white/6 px-3 py-1 text-xs text-white/65 ring-1 ring-white/10">
                                                {b.code}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-3 text-xs text-white/45">
                        Plus tard: tri par source, recherche, et affichage “rare/épique” via
                        metadata.
                    </div>
                </div>

                {/* Historique */}
                <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-white/85 font-semibold">📜 Historique</div>
                        <Pill>🧱 À brancher</Pill>
                    </div>

                    <div className="mt-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                        Quand tu auras une table d’événements (gain/perte) on affichera ici les
                        lignes détaillées: “+20 Quête terminée”, “+5 régularité”, etc.
                    </div>
                </div>
            </div>
        </UiPanel>
    );
}

function formatDayShortFR(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", { month: "short", day: "2-digit" });
}

function sumRecord(rec?: Record<string, number> | null) {
    if (!rec) return 0;
    return Object.values(rec).reduce((a, b) => a + (Number(b) || 0), 0);
}

function pick(key: string, rec?: Record<string, number> | null) {
    if (!rec) return 0;
    return Number(rec[key] ?? 0) || 0;
}

function StatsView() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<MeStatsResponse | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/me/stats", { cache: "no-store" });
                const json = await res.json().catch(() => null);

                if (!res.ok) {
                    const msg = (json as any)?.error ?? `Erreur (${res.status})`;
                    if (!cancelled) setError(msg);
                    return;
                }

                if (!cancelled) setData(json as MeStatsResponse);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Erreur réseau");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, []);

    const renown = data?.progression?.renown;
    const chapters = data?.progression?.chapters;
    const quests = data?.progression?.quests;
    const activity = data?.activity;
    const ai = data?.ai;
    const achievements = data?.achievements;
    const badges = data?.badges;
    const toasts = data?.toasts;
    const photos = data?.photos;

    const activityVals = (activity?.activity_last_30 ?? []).map((x) => Number(x.count) || 0);
    const activityDates = (activity?.activity_last_30 ?? []).map((x) => x.date);

    const questsTotal = Number(quests?.total ?? 0) || 0;
    const questsDone = Number(quests?.done ?? 0) || 0;
    const questsTodo = Number(quests?.todo ?? Math.max(0, questsTotal - questsDone)) || 0;

    const questsPct = questsTotal > 0 ? questsDone / questsTotal : 0;

    const gens = ai?.generations_last_30;
    const jobs = ai?.jobs_last_30;

    const gensTotal = Number(gens?.total ?? 0) || 0;
    const gensOk = Number(gens?.success ?? 0) || 0;
    const gensErr = Number(gens?.error ?? 0) || 0;
    const gensPct = gensTotal > 0 ? gensOk / gensTotal : 0;

    const jobsTotal = Number(jobs?.total ?? 0) || 0;

    const unread = Number(toasts?.unread_count ?? 0) || 0;

    return (
        <UiPanel
            title="Stats"
            emoji="📊"
            subtitle="Ton tableau de bord: progression, activité, IA et trophées."
            right={
                <div className="flex items-center gap-2">
                    <Pill>🕯️ Maj: {formatShortDateFR(data?.meta?.generated_at ?? null)}</Pill>
                    <ActionButton variant="soft" onClick={() => location.reload()}>
                        🔄 Rafraîchir
                    </ActionButton>
                </div>
            }
        >
            {loading ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    ⏳ Chargement des stats…
                </div>
            ) : error ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-rose-200">
                    ⚠️ {error}
                </div>
            ) : !data ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    Aucune donnée.
                </div>
            ) : (
                <div className="grid gap-4">
                    {/* HERO: highlights */}
                    <UiGradientPanel innerClassName="p-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <UiMetricCard
                                title="Renommée"
                                icon="🏆"
                                tone="theme"
                                value={renown?.value ?? 0}
                                hint={
                                    renown?.full_title
                                        ? `${renown.full_title}${renown.is_milestone ? " · ⭐ palier" : ""}`
                                        : renown?.tier_title
                                          ? renown.tier_title
                                          : "—"
                                }
                                right={
                                    <UiDonut
                                        value={(() => {
                                            const v = Number(renown?.value ?? 0) || 0;
                                            const into = v % 100;
                                            return into / 100;
                                        })()}
                                        label={`${(Number(renown?.value ?? 0) || 0) % 100}/100`}
                                    />
                                }
                            />

                            <UiMetricCard
                                title="Quêtes"
                                icon="✅"
                                tone={
                                    questsPct >= 0.6
                                        ? "good"
                                        : questsPct >= 0.3
                                          ? "warn"
                                          : "default"
                                }
                                value={`${questsDone}/${questsTotal}`}
                                hint={`Restantes: ${questsTodo} · Pièces touchées: ${quests?.rooms_touched_count ?? 0}`}
                                right={<UiDonut value={questsPct} />}
                            />

                            <UiMetricCard
                                title="Streak"
                                icon="🔥"
                                tone={
                                    Number(activity?.current_streak_days ?? 0) >= 5
                                        ? "good"
                                        : "theme"
                                }
                                value={`${activity?.current_streak_days ?? 0}j`}
                                hint={`Best: ${activity?.best_streak_days ?? 0}j · Actifs (30j): ${activity?.active_days_last_30 ?? 0}`}
                                right={<UiSparkline values={activityVals} />}
                            />

                            <UiMetricCard
                                title="IA"
                                icon="🤖"
                                tone={gensErr > 0 ? "warn" : "theme"}
                                value={`${gensTotal} gen`}
                                hint={`Jobs: ${jobsTotal} · OK: ${gensOk} · Err: ${gensErr}`}
                                right={
                                    <UiDonut
                                        value={gensPct}
                                        label={`${Math.round(gensPct * 100)}%`}
                                    />
                                }
                            />
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <UiMetricCard
                                title="Notifications"
                                icon="🔔"
                                value={unread}
                                hint={unread ? "Tu as du courrier." : "Boîte vide, esprit libre."}
                                tone={unread ? "warn" : "default"}
                            />
                            <UiMetricCard
                                title="Achievements"
                                icon="🧿"
                                value={achievements?.total ?? 0}
                                hint={
                                    (achievements?.recent?.[0]?.name ?? "").trim()
                                        ? `Dernier: ${(achievements!.recent[0].icon ?? "🏅").trim()} ${(achievements!.recent[0].name ?? "").trim()}`
                                        : "—"
                                }
                            />
                            <UiMetricCard
                                title="Badges"
                                icon="🏅"
                                value={badges?.total ?? 0}
                                hint={
                                    (badges?.recent?.[0]?.title ?? "").trim()
                                        ? `Dernier: ${(badges!.recent[0].emoji ?? "🏅").trim()} ${(badges!.recent[0].title ?? "").trim()}`
                                        : "—"
                                }
                            />
                        </div>
                    </UiGradientPanel>

                    {/* Activité 30j */}
                    <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-white/85 font-semibold">
                                🗓️ Activité (30 jours)
                            </div>
                            <Pill>
                                Dernière entrée:{" "}
                                {formatShortDateFR(activity?.last_entry_at ?? null)}
                            </Pill>
                        </div>

                        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr,340px]">
                            <UiBarChartMini
                                values={activityVals}
                                ariaLabel="Activité quotidienne sur 30 jours"
                            />

                            <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Lecture rapide
                                </div>
                                <div className="mt-2 text-sm text-white/70 leading-7">
                                    <div>
                                        • Jours actifs:{" "}
                                        <span className="text-white/90 font-semibold">
                                            {activity?.active_days_last_30 ?? 0}
                                        </span>
                                    </div>
                                    <div>
                                        • Streak actuel:{" "}
                                        <span className="text-white/90 font-semibold">
                                            {activity?.current_streak_days ?? 0}
                                        </span>{" "}
                                        jours
                                    </div>
                                    <div>
                                        • Record:{" "}
                                        <span className="text-white/90 font-semibold">
                                            {activity?.best_streak_days ?? 0}
                                        </span>{" "}
                                        jours
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {activityDates.slice(-6).map((d, i) => (
                                        <Pill key={d + i}>
                                            {formatDayShortFR(d)} ·{" "}
                                            {activityVals[activityVals.length - 6 + i] ?? 0}
                                        </Pill>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progression */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-white/85 font-semibold">📘 Chapitres</div>
                                <Pill>Total: {chapters?.total ?? 0}</Pill>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <UiMetricCard
                                    title="Par statut"
                                    icon="📌"
                                    value={sumRecord(chapters?.by_status ?? {})}
                                    hint={`open: ${pick("open", chapters?.by_status ?? {})} · doing: ${pick("doing", chapters?.by_status ?? {})} · done: ${pick("done", chapters?.by_status ?? {})}`}
                                />
                                <UiMetricCard
                                    title="Récents"
                                    icon="🕯️"
                                    value={(chapters?.recent?.length ?? 0) || 0}
                                    hint={
                                        (chapters?.recent?.[0]?.title ?? "").trim()
                                            ? `Dernier: ${chapters!.recent[0].title}`
                                            : "—"
                                    }
                                />
                            </div>
                        </div>

                        <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-white/85 font-semibold">⚔️ Quêtes</div>
                                <Pill>Total: {questsTotal}</Pill>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <UiMetricCard
                                    title="Répartition"
                                    icon="🧭"
                                    value={`${questsDone} done`}
                                    hint={`todo: ${questsTodo} · avg diff: ${quests?.difficulty_avg ?? "—"}`}
                                />
                                <UiMetricCard
                                    title="Statuts"
                                    icon="📎"
                                    value={sumRecord(quests?.by_status ?? {})}
                                    hint={
                                        Object.entries(quests?.by_status ?? {})
                                            .slice(0, 3)
                                            .map(([k, v]) => `${k}:${v}`)
                                            .join(" · ") || "—"
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* IA + Photos */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-white/85 font-semibold">🤖 IA (30 jours)</div>
                                <Pill>
                                    Fenêtre:{" "}
                                    {formatShortDateFR(data.meta?.windows?.last_30_from ?? null)}
                                </Pill>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <UiMetricCard
                                    title="Generations"
                                    icon="🪄"
                                    value={gensTotal}
                                    hint={`OK: ${gensOk} · Err: ${gensErr} · avg: ${gens?.avg_duration_ms ?? "—"}ms`}
                                    right={<UiDonut value={gensPct} />}
                                />
                                <UiMetricCard
                                    title="Jobs"
                                    icon="🧰"
                                    value={jobsTotal}
                                    hint={`by status: ${
                                        Object.entries(jobs?.by_status ?? {})
                                            .map(([k, v]) => `${k}:${v}`)
                                            .slice(0, 3)
                                            .join(" · ") || "—"
                                    }`}
                                />
                            </div>

                            <div className="mt-3 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Top types
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {(gens?.types_top ?? []).slice(0, 6).map((t) => (
                                        <Pill key={t.type}>
                                            🧪 {t.type} · {t.count}
                                        </Pill>
                                    ))}
                                    {(jobs?.types_top ?? []).slice(0, 6).map((t) => (
                                        <Pill key={t.job_type}>
                                            🧷 {t.job_type} · {t.count}
                                        </Pill>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-white/85 font-semibold">📸 Photos</div>
                                <Pill>Total: {photos?.total ?? 0}</Pill>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <UiMetricCard
                                    title="Covers"
                                    icon="🖼️"
                                    value={photos?.cover_total ?? 0}
                                    hint={`Derniers 30j: ${photos?.last_30 ?? 0}`}
                                />
                                <UiMetricCard
                                    title="Catégories"
                                    icon="🧩"
                                    value={Object.keys(photos?.by_category ?? {}).length}
                                    hint={
                                        Object.entries(photos?.by_category ?? {})
                                            .slice(0, 4)
                                            .map(([k, v]) => `${k}:${v}`)
                                            .join(" · ") || "—"
                                    }
                                />
                            </div>

                            <div className="mt-3 text-xs text-white/45">
                                Prochaine upgrade: preview cover + filtre par catégorie.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </UiPanel>
    );
}

/* ----------------------------------------------------------------------------
Tab 1: logs (ta vue actuelle, inchangée)
---------------------------------------------------------------------------- */

export default function JournalPage() {
    const entries = useJournalStore((s) => s.entries) as unknown as Entry[];
    const loading = useJournalStore((s) => s.loading);
    const load = useJournalStore((s) => s.load);

    const { bootstrap, generateChapterStory } = useGameStore();

    const [tab, setTab] = useState<TabKey>("logs");
    const [filter, setFilter] = useState<FilterKey>("all");

    const currentAdventure = useGameStore((s) => s.currentAdventure);
    const chaptersByAdventureId = useGameStore((s) => s.chaptersByAdventureId);
    const storyById = useGameStore((s) => s.chapterStoryByChapterId);

    const adventureId = currentAdventure?.id ?? "";
    const adventureChapters = adventureId ? (chaptersByAdventureId?.[adventureId] ?? []) : [];

    const storyCount = adventureChapters.reduce((acc, ch) => acc + (storyById?.[ch.id] ? 1 : 0), 0);

    useEffect(() => {
        void bootstrap();
        void load(120);
        // void generateChapterStory("eb86faa2-575b-4df4-b2ba-15ef3a9f82c6"); # keep this line (DEV)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        if (filter === "all") return entries;

        return entries.filter((e) => {
            const k = e.kind ?? "";

            if (filter === "system") return k === "adventure_created" || k === "quests_seeded";
            if (filter === "chapters") return k === "chapter_created" || k === "chapter_started";
            if (filter === "quests") return k === "quest_done" || k === "quest_reopened";
            if (filter === "notes") return k === "note";
            return true;
        });
    }, [entries, filter]);

    const groupedByDay = useMemo(() => {
        const map = new Map<string, Entry[]>();

        for (const e of filtered) {
            const d = new Date(e.created_at);
            const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(e);
        }

        const days = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
        for (const [, list] of days) {
            list.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        }

        return days;
    }, [filtered]);

    const filters: Array<{ key: FilterKey; label: string }> = [
        { key: "all", label: "🧾 Tout" },
        { key: "system", label: "✨ Système" },
        { key: "chapters", label: "📘 Chapitres" },
        { key: "quests", label: "✅ Quêtes" },
        { key: "notes", label: "📝 Notes" },
    ];

    return (
        <RpgShell
            title="Journal"
            subtitle="Un grimoire vivant: traces, récit, et renommée."
            // rightSlot={
            //     <div className="flex items-center gap-2">
            //         <Pill>📖 {entries.length}</Pill>
            //         <Pill>⌘K</Pill>
            //     </div>
            // }
        >
            <GrimoireBackdrop>
                {/* Onglets grimoire */}
                <GrimoireTabs
                    tab={tab}
                    setTab={(t) => setTab(t)}
                    counts={{
                        logs: entries.length,
                        story: storyCount, // placeholder
                        renown: 4, // placeholder
                        stats: 1,
                    }}
                />

                {tab === "logs" ? (
                    <Panel
                        title="Chroniques"
                        emoji="📜"
                        subtitle="Entrées auto-générées et notes."
                        right={
                            <div className="flex items-center gap-2">
                                <ActionButton onClick={() => void load(120)}>
                                    {loading ? "⏳" : "🔄 Recharger"}
                                </ActionButton>
                            </div>
                        }
                    >
                        {/* Filtres */}
                        <div className="mb-3 flex flex-wrap gap-2">
                            {filters.map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={cn(
                                        "rounded-full px-3 py-1 text-xs ring-1 transition",
                                        filter === f.key
                                            ? "bg-white/10 text-white ring-white/15"
                                            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                                ⏳ Chargement du journal…
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                                Rien pour l’instant dans ce filtre. Lance une aventure, démarre un
                                chapitre, termine une quête ✅
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {groupedByDay.map(([dayKey, list]) => {
                                    const dayDate = new Date(`${dayKey}T12:00:00`);
                                    return (
                                        <div
                                            key={dayKey}
                                            className="rounded-3xl bg-black/20 ring-1 ring-white/10"
                                        >
                                            <div className="px-4 py-3">
                                                <div className="text-xs tracking-[0.22em] text-white/55">
                                                    {formatDayFR(dayDate).toUpperCase()}
                                                </div>
                                                <div className="mt-1 text-xs text-white/45">
                                                    {list.length} entrées
                                                </div>
                                            </div>

                                            <div className="space-y-2 px-3 pb-3">
                                                {list.map((e) => {
                                                    const d = new Date(e.created_at);
                                                    const badge = kindBadge(e.kind);

                                                    return (
                                                        <div
                                                            key={e.id}
                                                            className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
                                                        >
                                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-semibold text-white/90">
                                                                        {e.title}
                                                                    </div>
                                                                    {e.content ? (
                                                                        <div className="mt-2 text-sm text-white/65 whitespace-pre-line">
                                                                            {e.content}
                                                                        </div>
                                                                    ) : null}
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className={cn(
                                                                            "rounded-full px-3 py-1 text-xs ring-1",
                                                                            badge.tone
                                                                        )}
                                                                    >
                                                                        {badge.label}
                                                                    </span>
                                                                    <Pill>
                                                                        🕯️ {formatTimeFR(d)}
                                                                    </Pill>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Panel>
                ) : null}

                {tab === "story" ? <StoryView /> : null}
                {tab === "renown" ? <RenownView /> : null}
                {tab === "stats" ? <StatsView /> : null}
            </GrimoireBackdrop>
        </RpgShell>
    );
}
