"use client";

// React
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";

// Stores
import { useGameStore } from "@/stores/gameStore";
import { useJournalStore } from "@/stores/journalStore";
import { useUiStore } from "@/stores/uiStore";

// Components
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import MasterCard from "@/components/ui/MasterCard";
import { UiAnimatePresence, UiMotionDiv } from "@/components/motion/UiMotion";
import UiTooltip from "@/components/ui/UiTooltip";
import UiLightbox, { type UiLightboxItem } from "@/components/ui/UiLightbox";
import QuestCreateModal from "@/components/modals/QuestCreateModal";
import QuestPhotoUploadModal from "@/components/modals/QuestPhotoUploadModal";

// Helpers
import { QuestDifficultyPill } from "@/helpers/questDifficulty";
import { QuestRoomPill } from "@/helpers/questRoom";
import { QuestStatusPill } from "@/helpers/questStatus";
import { QuestPriorityPill } from "@/helpers/questPriority";
import { QuestUrgencyPill } from "@/helpers/questUrgency";
import { getCurrentCharacterEmoji, getCurrentCharacterName } from "@/helpers/adventure";
import { journalKindLabel } from "@/helpers/journalKind";
import { formatJournalTime } from "@/helpers/dateTime";

type Quest = {
    id: string;
    title: string;
    description: string | null;
    brief: string | null;
    status: "todo" | "doing" | "done";
    room_code: string | null;
    difficulty?: number | null;
    priority?: "secondary" | "normal" | "main" | null;
    urgency?: "low" | "normal" | "high" | "critical" | null; // adapte si ton enum diffère
    estimate_min?: number | null;
};

type ChapterQuest = {
    id: string;
    quest_id: string;
    chapter_id: string;
    status: "todo" | "doing" | "done";
};

type ChainNext = {
    chain_id: string;
    next_adventure_quest_id: string;
    next_title: string | null;
    next_position: number | null;
} | null;

type QuestPhoto = {
    id: string;
    created_at: string;
    category: "initial" | "final" | "other";
    signed_url: string | null;

    caption: string | null;
    width: number | null;
    height: number | null;

    is_cover: boolean;
    sort: number;
};

type PhotoCategory = "initial" | "final" | "other";

function categoryEmoji(c: PhotoCategory) {
    if (c === "initial") return "🌅";
    if (c === "final") return "🏁";
    return "✨";
}

function categoryLabel(c: PhotoCategory) {
    if (c === "initial") return "Photo initiale";
    if (c === "final") return "Photo finale";
    return "Autre photo";
}

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

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

    const [chainNext, setChainNext] = useState<ChainNext>(null);
    const [nextCqId, setNextCqId] = useState<string | null>(null);

    const [mounted, setMounted] = useState(false);
    const [encOpen, setEncOpen] = useState(false);

    useEffect(() => setMounted(true), []);

    const askEncouragement = useGameStore((s) => s.askEncouragement);
    const clearEncouragement = useGameStore((s) => s.clearEncouragement);
    const encouragementLoading = useGameStore((s) => s.encouragementLoading);
    const encouragementById = useGameStore((s) => s.encouragementByChapterQuestId);

    const encouragement = chapterQuestId ? encouragementById[chapterQuestId] : undefined;

    const { openModal } = useUiStore();

    const [photosLoading, setPhotosLoading] = useState(false);
    const [photos, setPhotos] = useState<QuestPhoto[]>([]);

    const [photoFilter, setPhotoFilter] = useState<PhotoCategory[]>(["initial", "final", "other"]);

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const filteredPhotos = React.useMemo(() => {
        if (!photoFilter.length) return photos;
        return photos.filter((p) => photoFilter.includes(p.category));
    }, [photos, photoFilter]);

    const lightboxItems: UiLightboxItem[] = React.useMemo(() => {
        return (filteredPhotos ?? [])
            .filter((p) => !!p.signed_url)
            .map((p) => ({
                id: p.id,
                url: p.signed_url as string,
                alt: p.caption ?? categoryLabel(p.category),
                caption: p.caption,
                categoryEmoji: categoryEmoji(p.category),
                categoryLabel: categoryLabel(p.category),
                isCover: !!p.is_cover,
            }));
    }, [filteredPhotos]);

    const toggleCategory = (cat: PhotoCategory) => {
        setPhotoFilter((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

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

            // ✅ NEW
            const next = (json?.chain_next ?? null) as ChainNext;
            setChainNext(next);
            setNextCqId(null);

            if (next?.next_adventure_quest_id && json?.chapterQuest?.chapter_id) {
                const r = await fetch(
                    `/api/chapter-quests/resolve?chapterId=${encodeURIComponent(
                        json.chapterQuest.chapter_id
                    )}&adventureQuestId=${encodeURIComponent(next.next_adventure_quest_id)}`,
                    { cache: "no-store" }
                );
                const j = await r.json().catch(() => null);
                if (r.ok) setNextCqId(j?.chapterQuestId ?? null);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadPhotos = async (cqId: string) => {
        if (!cqId) return;

        setPhotosLoading(true);
        try {
            const res = await fetch(`/api/photos?chapterQuestId=${encodeURIComponent(cqId)}`, {
                cache: "no-store",
            });
            const json = await res.json().catch(() => null);

            if (!res.ok) {
                console.error(json?.error ?? "Failed to load photos");
                setPhotos([]);
                return;
            }

            const rows = Array.isArray(json?.rows) ? json.rows : [];

            // tri: cover d’abord, puis sort, puis date
            rows.sort((a: any, b: any) => {
                const ac = a?.is_cover ? 1 : 0;
                const bc = b?.is_cover ? 1 : 0;
                if (ac !== bc) return bc - ac;

                const as = Number(a?.sort ?? 0);
                const bs = Number(b?.sort ?? 0);
                if (as !== bs) return as - bs;

                const ad = String(a?.created_at ?? "");
                const bd = String(b?.created_at ?? "");
                return ad < bd ? 1 : -1;
            });

            setPhotos(rows);
        } finally {
            setPhotosLoading(false);
        }
    };

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!chapterQuestId) return;
        void load();
        void loadPhotos(chapterQuestId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterQuestId]);

    useEffect(() => {
        // On charge une fois (entries sont côté store)
        void loadJournal(120);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        console.log("quest", quest);
    }, [quest]);

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
                        <Panel
                            title="Quête"
                            emoji="🔖"
                            right={<QuestStatusPill status={chapterQuest.status} />}
                        >
                            <div className="flex flex-col gap-3">
                                <div className="mb-2">
                                    {/* Title */}
                                    <div className="text-white/90 font-semibold">{quest.title}</div>

                                    {/* Description (si présente) */}
                                    {quest.description?.trim() ? (
                                        <div className="whitespace-pre-line rpg-text-sm text-white/70">
                                            {quest.description}
                                        </div>
                                    ) : null}
                                </div>

                                {/* Pills */}
                                <div className="flex flex-wrap gap-2">
                                    <QuestRoomPill roomCode={quest.room_code} />

                                    <QuestDifficultyPill difficulty={quest.difficulty ?? null} />

                                    {/* ✅ Priority (helper) */}
                                    <QuestPriorityPill
                                        priority={(quest as any)?.priority ?? null}
                                    />

                                    {/* ✅ Urgency (helper) - si dispo */}
                                    {"urgency" in quest ? (
                                        <QuestUrgencyPill
                                            urgency={(quest as any)?.urgency ?? null}
                                        />
                                    ) : null}

                                    {/* ✅ Estimate (simple pill) */}
                                    {typeof quest.estimate_min === "number" &&
                                    quest.estimate_min > 0 ? (
                                        <Pill>⏱️ {quest.estimate_min} min</Pill>
                                    ) : null}
                                </div>

                                {chainNext?.next_adventure_quest_id ? (
                                    <div className="mt-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                                    Chaîne
                                                </div>
                                                <div className="mt-1 text-sm text-white/80 truncate">
                                                    ⛓️ Suite:{" "}
                                                    {chainNext.next_title ?? "Quête suivante"}
                                                </div>
                                            </div>

                                            <ActionButton
                                                variant="solid"
                                                disabled={!nextCqId}
                                                onClick={() => {
                                                    if (!nextCqId) return;
                                                    router.push(
                                                        `/quest?cq=${encodeURIComponent(nextCqId)}`
                                                    );
                                                }}
                                                // title={
                                                //     !nextCqId
                                                //         ? "La quête suivante n’est pas dans ce chapitre"
                                                //         : undefined
                                                // }
                                            >
                                                ➡️ Aller
                                            </ActionButton>
                                        </div>

                                        {!nextCqId ? (
                                            <div className="mt-2 text-xs text-white/45">
                                                La suite existe, mais elle n’est pas affectée au
                                                chapitre courant.
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
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

                                        <ActionButton
                                            onClick={() => {
                                                openModal("questCreate", {
                                                    mode: "chain",
                                                    parent_chapter_quest_id: chapterQuest.id,
                                                    parent_adventure_quest_id: quest.id,
                                                });
                                            }}
                                            disabled={busy}
                                        >
                                            ⛓️ Ajouter une quête chainée
                                        </ActionButton>

                                        <ActionButton
                                            onClick={() => {
                                                openModal("questPhotoUpload", {
                                                    chapter_quest_id: chapterQuest.id,
                                                    quest_title: quest?.title ?? null,
                                                });
                                            }}
                                            disabled={busy}
                                        >
                                            📷 Envoyer une photo
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

                                        {/* ✅ NEW: Chain quest */}
                                        <ActionButton
                                            onClick={() => {
                                                // TODO: ouvrira la modal "questCreate" en mode "chained"
                                                // ex: openModal("questCreate", { mode: "chain", parentQuestId: quest.id, ... })
                                                console.log("chain quest from", quest?.id);

                                                openModal("questCreate", {
                                                    mode: "chain",
                                                    parent_chapter_quest_id: chapterQuest.id,
                                                    parent_adventure_quest_id: quest.id,
                                                });
                                            }}
                                            disabled={busy}
                                        >
                                            ⛓️ Ajouter une quête chainée
                                        </ActionButton>

                                        <ActionButton
                                            onClick={() => {
                                                openModal("questPhotoUpload", {
                                                    chapter_quest_id: chapterQuest.id,
                                                    quest_title: quest?.title ?? null,
                                                });
                                            }}
                                            disabled={busy}
                                        >
                                            📷 Envoyer une photo
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
                        {photosLoading ? (
                            <Panel
                                title="Preuves de quête"
                                emoji="📸"
                                subtitle="Ce qui a été fait, pour de vrai."
                                right={<Pill>⏳</Pill>}
                            >
                                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                                    ⏳ Chargement des preuves…
                                </div>
                            </Panel>
                        ) : photos.length > 0 ? (
                            <Panel
                                title="Preuves de quête"
                                emoji="📸"
                                subtitle="Ce qui a été fait, pour de vrai."
                                right={<Pill>{filteredPhotos.length}</Pill>}
                            >
                                <div className="grid">
                                    {/* ✅ Espace réduit entre subtitle et pills */}
                                    <div className="-mt-1 flex flex-wrap gap-2">
                                        {(photos.some((p) => p.category === "initial") ||
                                            photos.some((p) => p.category === "final") ||
                                            photos.some((p) => p.category === "other")) && (
                                            <>
                                                {(
                                                    ["initial", "final", "other"] as PhotoCategory[]
                                                ).map((cat) => {
                                                    const exists = photos.some(
                                                        (p) => p.category === cat
                                                    );
                                                    if (!exists) return null;

                                                    const active = photoFilter.includes(cat);

                                                    return (
                                                        <div
                                                            key={cat}
                                                            className="group inline-flex"
                                                        >
                                                            <UiTooltip
                                                                content={categoryLabel(cat)}
                                                                side="top"
                                                                singleLine
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        toggleCategory(cat)
                                                                    }
                                                                    className={cn(
                                                                        "inline-flex items-center justify-center",
                                                                        "rounded-full px-3 py-1 text-xs ring-1 transition",
                                                                        active
                                                                            ? "bg-white/20 text-white ring-white/20"
                                                                            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
                                                                    )}
                                                                    aria-pressed={active}
                                                                    title={categoryLabel(cat)}
                                                                >
                                                                    {categoryEmoji(cat)}
                                                                </button>
                                                            </UiTooltip>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>

                                    {/* ✅ Espace augmenté entre pills et grille */}
                                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {filteredPhotos.map((p) => {
                                            const catEmoji = categoryEmoji(p.category);
                                            const catLabel = categoryLabel(p.category);

                                            return (
                                                <div
                                                    key={p.id}
                                                    className="group relative overflow-hidden rounded-2xl bg-black/25 ring-1 ring-white/10"
                                                >
                                                    {p.signed_url ? (
                                                        <UiTooltip
                                                            content={
                                                                <div className="grid gap-1">
                                                                    <div className="text-white/95 font-semibold">
                                                                        {catEmoji} {catLabel}
                                                                    </div>
                                                                    {p.caption ? (
                                                                        <div className="text-white/80">
                                                                            {p.caption}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-white/60">
                                                                            (pas de légende)
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            }
                                                            side="top"
                                                            // align="center"
                                                            maxWidthClassName="max-w-[280px]"
                                                        >
                                                            <button
                                                                type="button"
                                                                className="block w-full text-left"
                                                                onClick={() => {
                                                                    // index sur la liste filtrée (mais seulement les items qui ont une signed_url)
                                                                    const idx =
                                                                        lightboxItems.findIndex(
                                                                            (it) => it.id === p.id
                                                                        );
                                                                    if (idx < 0) return;
                                                                    setLightboxIndex(idx);
                                                                    setLightboxOpen(true);
                                                                }}
                                                                aria-label="Ouvrir la photo"
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={p.signed_url}
                                                                    alt={p.caption ?? catLabel}
                                                                    className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                                                    loading="lazy"
                                                                />
                                                            </button>
                                                        </UiTooltip>
                                                    ) : (
                                                        <div className="aspect-square grid place-items-center text-white/50 text-sm">
                                                            Image indisponible
                                                        </div>
                                                    )}

                                                    {/* corner badges */}
                                                    <div className="absolute left-2 top-2 flex items-center gap-2">
                                                        <div className="group inline-flex">
                                                            <UiTooltip
                                                                content={catLabel}
                                                                side="bottom"
                                                                align="start"
                                                            >
                                                                <span className="inline-flex items-center justify-center rounded-full bg-black/45 px-2 py-1 text-xs ring-1 ring-white/10 backdrop-blur-md">
                                                                    {catEmoji}
                                                                </span>
                                                            </UiTooltip>
                                                        </div>

                                                        {p.is_cover ? (
                                                            <div className="group inline-flex">
                                                                <UiTooltip
                                                                    content="Photo mise en avant"
                                                                    side="bottom"
                                                                >
                                                                    <span className="inline-flex items-center justify-center rounded-full bg-black/45 px-2 py-1 text-xs ring-1 ring-white/10 backdrop-blur-md">
                                                                        ⭐
                                                                    </span>
                                                                </UiTooltip>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {photoFilter.length && filteredPhotos.length === 0 ? (
                                        <div className="mt-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10 text-xs text-white/60">
                                            Aucun cliché ne correspond à ce filtre.
                                        </div>
                                    ) : null}
                                </div>
                            </Panel>
                        ) : null}
                        <Panel
                            title="Chronique de quête"
                            emoji="📓"
                            subtitle="Tout ce qui s’écrit… et tout ce qui se prouve."
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
                                    {questJournal.map((e) => {
                                        const k = journalKindLabel(e.kind, e.meta);
                                        return (
                                            <div
                                                key={e.id}
                                                className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="truncate text-sm font-semibold text-white/90">
                                                        {k.emoji} {k.label}
                                                    </div>

                                                    <div className="shrink-0 text-[11px] text-white/45">
                                                        {formatJournalTime(e.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Panel>
                    </div>
                </div>
            )}
            {mounted
                ? createPortal(
                      <UiAnimatePresence>
                          {encOpen ? (
                              <UiMotionDiv
                                  className="fixed inset-0 z-[120] grid place-items-center bg-black/55 backdrop-blur-[3px] p-4"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onMouseDown={() => setEncOpen(false)}
                              >
                                  <UiMotionDiv
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
                                  </UiMotionDiv>
                              </UiMotionDiv>
                          ) : null}
                      </UiAnimatePresence>,
                      document.body
                  )
                : null}
            <QuestCreateModal
                onCreated={() => {
                    if (!chapterQuestId) return;
                    void load();
                }}
            />
            <QuestPhotoUploadModal
                onCreated={() => {
                    if (!chapterQuestId) return;
                    void loadPhotos(chapterQuestId);
                    void loadJournal(120);
                }}
            />
            <UiLightbox
                open={lightboxOpen}
                items={lightboxItems}
                startIndex={lightboxIndex}
                onClose={() => setLightboxOpen(false)}
            />
        </RpgShell>
    );
}
