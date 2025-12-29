"use client";

// React
import React, { useEffect, useMemo, useState } from "react";

// Components
import RpgShell from "@/components/RpgShell";
import { Panel, Pill, ActionButton } from "@/components/RpgUi";
import MasterCard from "@/components/ui/MasterCard";

// Stores
import { useJournalStore } from "@/stores/journalStore";
import { useGameStore } from "@/stores/gameStore";
import { type ChapterStoryRow } from "@/types/game";

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
type TabKey = "logs" | "story" | "renown";

/* ----------------------------------------------------------------------------
UI: onglets "grimoire"
---------------------------------------------------------------------------- */

function GrimoireTabs(props: {
    tab: TabKey;
    setTab: (t: TabKey) => void;
    counts: { logs: number; story: number; renown: number };
}) {
    const items: Array<{ key: TabKey; label: string; hint?: string }> = [
        { key: "logs", label: "📜 Traces", hint: `${props.counts.logs}` },
        { key: "story", label: "📖 Récit", hint: `${props.counts.story}` },
        { key: "renown", label: "🏆 Renommée", hint: `${props.counts.renown}` },
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
        await generateChapterStory(chapterId, force);
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

function fakeRenownData() {
    const now = Date.now();
    const iso = (t: number) => new Date(t).toISOString();

    const events: RenownEvent[] = [
        {
            id: "r1",
            created_at: iso(now - 1000 * 60 * 45),
            delta: +20,
            reason: "Quête terminée: Ranger le salon",
            chapterTitle: "Chapitre I",
            questTitle: "Ranger le salon",
        },
        {
            id: "r2",
            created_at: iso(now - 1000 * 60 * 90),
            delta: +10,
            reason: "Quête terminée: Vider le lave-vaisselle",
            chapterTitle: "Chapitre I",
            questTitle: "Vider le lave-vaisselle",
        },
        {
            id: "r3",
            created_at: iso(now - 1000 * 60 * 180),
            delta: +35,
            reason: "Quête difficile: Trier les papiers",
            chapterTitle: "Chapitre I",
            questTitle: "Trier les papiers",
        },
        {
            id: "r4",
            created_at: iso(now - 1000 * 60 * 60 * 24),
            delta: -5,
            reason: "Pénalité (placeholder): quête abandonnée",
            chapterTitle: "Chapitre I",
        },
    ];

    const total = events.reduce((acc, e) => acc + e.delta, 0);
    const base = 140; // fake
    const value = Math.max(0, base + total);
    const level = Math.max(1, Math.floor(value / 100) + 1);
    const into = value % 100;

    return { value, level, into, events };
}

function RenownView() {
    const data = useMemo(() => fakeRenownData(), []);
    const pct = Math.max(0, Math.min(100, (data.into / 100) * 100));

    return (
        <Panel
            title="Renommée"
            emoji="🏆"
            subtitle="Score détaillé, historique et progression. (données factices pour l’UI)"
            right={<Pill>🧪 Prototype</Pill>}
        >
            <div className="grid gap-4">
                {/* Carte score */}
                <div
                    className={cn(
                        "rounded-[28px] p-5 ring-1 ring-white/10",
                        "bg-gradient-to-b from-amber-200/10 via-white/5 to-black/30"
                    )}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Niveau actuel
                            </div>
                            <div className="mt-2 text-3xl font-semibold text-white/90">
                                {data.level}
                            </div>
                            <div className="mt-1 text-sm text-white/60">Valeur: {data.value}</div>
                        </div>

                        <div className="rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                            <div className="text-xs text-white/55">Progression</div>
                            <div className="mt-1 text-sm text-white/85 font-semibold">
                                ✨ {data.into}/100
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                            <div
                                className="h-full rounded-full bg-white/25"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-white/55">
                            <span>Prochain niveau: {data.level + 1}</span>
                            <span>Reste: {100 - data.into}</span>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <Pill>🗡️ Bonus quêtes</Pill>
                        <Pill>🧭 Bonus régularité</Pill>
                        <Pill>🧱 Bonus pièces</Pill>
                    </div>
                </div>

                {/* Historique */}
                <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-white/85 font-semibold">📜 Historique</div>
                        <Pill>{data.events.length} événements</Pill>
                    </div>

                    <div className="mt-3 space-y-2">
                        {data.events
                            .slice()
                            .sort(
                                (a, b) =>
                                    new Date(b.created_at).getTime() -
                                    new Date(a.created_at).getTime()
                            )
                            .map((e) => {
                                const d = new Date(e.created_at);
                                const up = e.delta >= 0;

                                return (
                                    <div
                                        key={e.id}
                                        className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-sm text-white/90 font-semibold">
                                                    {e.reason}
                                                </div>
                                                <div className="mt-1 text-xs text-white/55">
                                                    🕯️ {formatDayFR(d)} · {formatTimeFR(d)}
                                                </div>
                                                {e.chapterTitle || e.questTitle ? (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {e.chapterTitle ? (
                                                            <Pill>📘 {e.chapterTitle}</Pill>
                                                        ) : null}
                                                        {e.questTitle ? (
                                                            <Pill>✅ {e.questTitle}</Pill>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>

                                            <span
                                                className={cn(
                                                    "shrink-0 rounded-full px-3 py-1 text-xs ring-1",
                                                    up
                                                        ? "bg-emerald-400/10 text-emerald-200 ring-emerald-400/20"
                                                        : "bg-rose-400/10 text-rose-200 ring-rose-400/20"
                                                )}
                                            >
                                                {up ? `+${e.delta}` : `${e.delta}`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    <div className="mt-3 text-xs text-white/50">
                        Plus tard: filtres (chapitre/pièce), export, et “détails du calcul” par
                        difficulté.
                    </div>
                </div>
            </div>
        </Panel>
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
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>📖 {entries.length}</Pill>
                    <Pill>⌘K</Pill>
                </div>
            }
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
            </GrimoireBackdrop>
        </RpgShell>
    );
}
