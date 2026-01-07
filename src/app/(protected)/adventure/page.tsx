"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel } from "@/components/RpgUi";
import QuestCreateModal from "@/components/modals/QuestCreateModal";

import { useGameStore } from "@/stores/gameStore";
import { useUiStore } from "@/stores/uiStore";

import type { AdventureQuest, ChapterQuestFull } from "@/types/game";

import AdventureBlock from "./_components/AdventureBlock";
import ChapterBlock from "./_components/ChapterBlock";
import BacklogBlock from "./_components/BacklogBlock";

import AdventureConfigModal from "./_components/modals/AdventureConfigModal";
import ChapterConfigModal from "./_components/modals/ChapterConfigModal";
import RenownGainModal from "./_components/modals/RenownGainModal";
import ChapterTransitionModal from "./_components/modals/ChapterTransitionModal";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function normalizeQuest(q: ChapterQuestFull["adventure_quests"]) {
    if (!q) return null;
    if (Array.isArray(q)) return q[0] ?? null;
    return q;
}

function adventureFallbackEmoji(code?: string | null) {
    if (code === "home_realignment") return "🏠";
    return "🧭";
}

function adventureFallbackTitle(code?: string | null) {
    if (code === "home_realignment") return "Réalignement du foyer";
    if (code) return code;
    return "Aventure";
}

function adventureFallbackDescription(code?: string | null) {
    if (code === "home_realignment") {
        return "Remettre le foyer d’aplomb, pièce par pièce. Un RPG du quotidien où chaque geste compte.";
    }
    return "Une aventure en cours. La suite s’écrit avec tes actions.";
}

async function safeJson(res: Response) {
    return res.json().catch(() => null);
}

/* ============================================================================
🧩 PAGE
============================================================================ */

export default function AdventurePage() {
    const router = useRouter();

    /* ------------------------------------------------------------------------
    ✅ SINGLE STORE SUBSCRIPTION (shallow)
    ------------------------------------------------------------------------ */

    const {
        bootstrap,
        reload,
        chapter,
        adventure,
        chapterItems,
        adventureBacklog,
        adventureBacklogLoading,
        assignQuestToCurrentChapter,
        unassignQuestFromChapter,
        lastRenownGain,
        congrats,
        congratsLoading,
        clearLastRenownGain,
    } = useGameStore(
        useShallow((s) => {
            const cqId = s.lastRenownGain?.chapterQuestId ?? null;

            return {
                bootstrap: s.bootstrap,
                reload: s.reload,

                chapter: s.currentChapter,
                adventure: s.currentAdventure,
                chapterItems: s.currentChapterQuests,

                adventureBacklog: s.adventureBacklog,
                adventureBacklogLoading: s.adventureBacklogLoading,

                assignQuestToCurrentChapter: s.assignQuestToCurrentChapter,
                unassignQuestFromChapter: s.unassignQuestFromChapter,

                lastRenownGain: s.lastRenownGain,
                congrats: cqId ? s.congratsByChapterQuestId[cqId] : undefined,
                congratsLoading: cqId ? !!s.congratsLoadingById[cqId] : false,

                clearLastRenownGain: s.clearLastRenownGain,
            };
        })
    );

    /* ------------------------------------------------------------------------
    UI store
    ------------------------------------------------------------------------ */

    const { isModalOpen, openModal, closeModal } = useUiStore(
        useShallow((s) => ({
            isModalOpen: s.isModalOpen,
            openModal: s.openModal,
            closeModal: s.closeModal,
        }))
    );

    const renownOpen = isModalOpen("renownGain");

    // console.log("adventure", adventure);

    /* ------------------------------------------------------------------------
    Local UI state (keep minimal)
    ------------------------------------------------------------------------ */

    const [pageLoading, setPageLoading] = useState(true);
    const [chapterPulse, setChapterPulse] = useState(false);

    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [unassigningId, setUnassigningId] = useState<string | null>(null);

    /* ------------------------------------------------------------------------
    Drafts (modals)
    ------------------------------------------------------------------------ */

    const [advContextDraft, setAdvContextDraft] = useState("");
    const [advConfigSaving, setAdvConfigSaving] = useState(false);

    const [chapterContextDraft, setChapterContextDraft] = useState("");
    const [chapterConfigSaving, setChapterConfigSaving] = useState(false);

    /* ------------------------------------------------------------------------
    Transition chapter state
    ------------------------------------------------------------------------ */

    const [transitionBusy, setTransitionBusy] = useState(false);
    const [nextTitle, setNextTitle] = useState("");
    const [nextPace, setNextPace] = useState<"calme" | "standard" | "intense">("standard");
    const [nextAiContext, setNextAiContext] = useState("");
    const [carryOver, setCarryOver] = useState<ChapterQuestFull[]>([]);
    const [selectedBacklogIds, setSelectedBacklogIds] = useState<Set<string>>(new Set());

    /* =========================================================================
    🚀 BOOTSTRAP
    ========================================================================= */

    useEffect(() => {
        void (async () => {
            await bootstrap();
            setPageLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* =========================================================================
    🧠 DERIVED DATA (memo)
    ========================================================================= */

    const chapterQuestIds = useMemo(() => {
        return new Set(chapterItems.map((x) => x.adventure_quest_id));
    }, [chapterItems]);

    const backlog = useMemo(() => {
        const list = Array.isArray(adventureBacklog) ? adventureBacklog : [];
        return list
            .filter((q) => !chapterQuestIds.has(q.id) && (q as any)?.status !== "done")
            .slice()
            .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "fr"));
    }, [adventureBacklog, chapterQuestIds]);

    const grouped = useMemo(() => {
        const map = new Map<string, Array<{ cq: ChapterQuestFull; q: AdventureQuest | null }>>();

        for (const cq of chapterItems) {
            const q = normalizeQuest(cq.adventure_quests) as any as AdventureQuest | null;
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
    }, [chapterItems]);

    const advEmoji = useMemo(() => {
        const code = (adventure as any)?.code ?? (chapter as any)?.adventure_code ?? null;
        return (adventure as any)?.emoji ?? adventureFallbackEmoji(code);
    }, [adventure, chapter]);

    const advTitle = useMemo(() => {
        const code = (adventure as any)?.code ?? (chapter as any)?.adventure_code ?? null;
        return adventure?.title ?? adventureFallbackTitle(code);
    }, [adventure, chapter]);

    const advDesc = useMemo(() => {
        const code = (adventure as any)?.code ?? (chapter as any)?.adventure_code ?? null;
        return adventure?.description ?? adventureFallbackDescription(code);
    }, [adventure, chapter]);

    /* =========================================================================
    ACTIONS (useCallback stable)
    ========================================================================= */

    const refreshChapterView = useCallback(async () => {
        await reload(["chapter", "adventure", "chapterQuests", "backlog"], { silent: true });
    }, [reload]);

    const goPrepare = useCallback(() => {
        const code = (adventure as any)?.code ?? (chapter as any)?.adventure_code ?? null;
        if (code === "home_realignment") {
            router.push("/adventure/home-realignment");
            return;
        }
        router.push("/new");
    }, [router, adventure, chapter]);

    const onAssignToChapter = useCallback(
        async (q: AdventureQuest) => {
            if (assigningId) return;
            setAssigningId(q.id);

            try {
                const ok = await assignQuestToCurrentChapter(q.id);
                if (ok) {
                    setChapterPulse(true);
                    window.setTimeout(() => setChapterPulse(false), 650);
                    await refreshChapterView();
                }
            } finally {
                setAssigningId(null);
            }
        },
        [assigningId, assignQuestToCurrentChapter, refreshChapterView]
    );

    const onUnassignFromChapter = useCallback(
        async (cq: ChapterQuestFull, q: AdventureQuest | null) => {
            if (unassigningId) return;
            if (cq.status !== "todo") return;

            setUnassigningId(cq.id);
            try {
                const ok = await unassignQuestFromChapter(cq.id, {
                    id: cq.adventure_quest_id,
                    title: q?.title ?? "Quest",
                    room_code: q?.room_code ?? cq.room_code ?? null,
                    difficulty: q?.difficulty ?? null,
                    mission_md: null,
                });

                if (ok) await refreshChapterView();
            } finally {
                setUnassigningId(null);
            }
        },
        [unassigningId, unassignQuestFromChapter, refreshChapterView]
    );

    const openQuest = useCallback(
        (chapterQuestId: string) => {
            router.push(`/quest?cq=${encodeURIComponent(chapterQuestId)}`);
        },
        [router]
    );

    /* =========================================================================
    MODALS: OPEN
    ========================================================================= */

    const openAdventureConfig = useCallback(() => {
        setAdvContextDraft((adventure?.context_text ?? "").toString());
        openModal("adventureConfig");
    }, [adventure?.context_text, openModal]);

    const openChapterConfig = useCallback(() => {
        setChapterContextDraft(((chapter as any)?.context_text ?? "").toString());
        openModal("chapterConfig");
    }, [chapter, openModal]);

    const openTransition = useCallback(() => {
        const remaining = chapterItems.filter((cq) => cq.status !== "done");
        setCarryOver(remaining);

        setNextTitle(
            adventure?.chapters_count
                ? `Chapitre ${adventure?.chapters_count + 1}`
                : "Nouveau chapitre"
        );
        setNextPace((chapter?.pace ?? "standard") as any);
        setNextAiContext("");

        setSelectedBacklogIds(new Set());
        openModal("chapterTransition");
    }, [chapterItems, chapter, openModal]);

    /* =========================================================================
    SAVE CONTEXTS
    ========================================================================= */

    const saveAdventureContext = useCallback(async () => {
        if (!adventure?.id) return;

        setAdvConfigSaving(true);
        try {
            const res = await fetch("/api/adventures", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: adventure.id,
                    context_text: advContextDraft.trim() || null,
                }),
            });

            const json = await safeJson(res);
            if (!res.ok) {
                console.error(json?.error ?? "Save adventure context failed");
                return;
            }

            await refreshChapterView();
            closeModal("adventureConfig");
        } finally {
            setAdvConfigSaving(false);
        }
    }, [adventure?.id, advContextDraft, refreshChapterView, closeModal]);

    const saveChapterContext = useCallback(async () => {
        if (!chapter?.id) return;

        setChapterConfigSaving(true);
        try {
            const res = await fetch("/api/chapters", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: chapter.id,
                    context_text: chapterContextDraft.trim() || null,
                }),
            });

            const json = await safeJson(res);
            if (!res.ok) {
                console.error(json?.error ?? "Save chapter context failed");
                return;
            }

            await refreshChapterView();
            closeModal("chapterConfig");
        } finally {
            setChapterConfigSaving(false);
        }
    }, [chapter?.id, chapterContextDraft, refreshChapterView, closeModal]);

    /* =========================================================================
    RENOWN MODAL: open auto
    ========================================================================= */

    useEffect(() => {
        if (!lastRenownGain) return;
        openModal("renownGain");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastRenownGain]);

    const closeRenown = useCallback(() => {
        closeModal("renownGain");
        window.setTimeout(() => clearLastRenownGain(), 250);
    }, [closeModal, clearLastRenownGain]);

    /* =========================================================================
    TRANSITION CHAPTER
    ========================================================================= */

    const submitTransition = useCallback(async () => {
        if (!chapter?.id || !chapter.adventure_id) return;

        setTransitionBusy(true);
        try {
            const res = await fetch("/api/chapters/transition", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prev_chapter_id: chapter.id,
                    adventure_id: chapter.adventure_id,
                    next: {
                        title: nextTitle.trim(),
                        pace: nextPace,
                        ai_context: nextAiContext.trim() || null,
                    },
                    backlog_adventure_quest_ids: Array.from(selectedBacklogIds),
                }),
            });

            const json = await safeJson(res);
            if (!res.ok) {
                console.error(json?.error ?? "Transition failed");
                return;
            }

            await refreshChapterView();
            closeModal("chapterTransition");
        } finally {
            setTransitionBusy(false);
        }
    }, [
        chapter,
        nextTitle,
        nextPace,
        nextAiContext,
        selectedBacklogIds,
        refreshChapterView,
        closeModal,
    ]);

    /* =========================================================================
    RENDER
    ========================================================================= */

    return (
        <RpgShell
            title="Aventure en cours"
            subtitle="🪄 Le monde attend. Une pièce après l’autre. 🏠"
        >
            {pageLoading ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-rpg-text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement…
                </div>
            ) : !chapter ? (
                <Panel
                    title="Aucune aventure en cours"
                    emoji="🕯️"
                    subtitle="Lance une aventure pour démarrer le jeu."
                    right={
                        <ActionButton variant="solid" onClick={() => router.push("/new")}>
                            ✨ Nouvelle aventure
                        </ActionButton>
                    }
                >
                    <div className="rounded-2xl bg-black/30 p-4 rpg-rpg-text-sm text-white/70 ring-1 ring-white/10">
                        Tu n’as pas de chapitre actif. Passe par “Nouvelle aventure”, puis lance un
                        chapitre.
                    </div>
                </Panel>
            ) : (
                <div className="grid gap-4">
                    <AdventureBlock
                        chapter={chapter}
                        adventure={adventure}
                        advEmoji={advEmoji}
                        advTitle={advTitle}
                        advDesc={advDesc}
                        onOpenAdventureConfig={openAdventureConfig}
                        onGoPrepare={goPrepare}
                    />

                    <ChapterBlock
                        chapter={chapter}
                        chapterItems={chapterItems}
                        grouped={grouped}
                        pulse={chapterPulse}
                        unassigningId={unassigningId}
                        onOpenChapterConfig={openChapterConfig}
                        onOpenTransition={openTransition}
                        onUnassignFromChapter={onUnassignFromChapter}
                        onOpenQuest={openQuest}
                    />

                    <BacklogBlock
                        backlog={backlog}
                        loading={adventureBacklogLoading}
                        assigningId={assigningId}
                        onOpenCreate={() => openModal("questCreate")}
                        onAssign={onAssignToChapter}
                    />
                </div>
            )}

            {/* ✅ LAZY MOUNT MODALS ONLY WHEN OPEN */}
            {isModalOpen("adventureConfig") ? (
                <AdventureConfigModal
                    adventureId={adventure?.id ?? null}
                    draft={advContextDraft}
                    setDraft={setAdvContextDraft}
                    saving={advConfigSaving}
                    onClose={() => closeModal("adventureConfig")}
                    onSave={() => void saveAdventureContext()}
                />
            ) : null}

            {isModalOpen("chapterConfig") ? (
                <ChapterConfigModal
                    chapterId={chapter?.id ?? null}
                    draft={chapterContextDraft}
                    setDraft={setChapterContextDraft}
                    saving={chapterConfigSaving}
                    onClose={() => closeModal("chapterConfig")}
                    onSave={() => void saveChapterContext()}
                />
            ) : null}

            {renownOpen && lastRenownGain ? (
                <RenownGainModal
                    lastRenownGain={lastRenownGain}
                    congrats={congrats}
                    loading={congratsLoading}
                    onClose={closeRenown}
                />
            ) : null}

            {isModalOpen("chapterTransition") ? (
                <ChapterTransitionModal
                    chapterTitle={chapter?.title ?? null}
                    carryOver={carryOver}
                    backlog={backlog}
                    selectedBacklogIds={selectedBacklogIds}
                    setSelectedBacklogIds={setSelectedBacklogIds}
                    nextTitle={nextTitle}
                    setNextTitle={setNextTitle}
                    nextPace={nextPace}
                    setNextPace={setNextPace}
                    nextAiContext={nextAiContext}
                    setNextAiContext={setNextAiContext}
                    busy={transitionBusy}
                    onClose={() => closeModal("chapterTransition")}
                    onSubmit={() => void submitTransition()}
                />
            ) : null}

            <QuestCreateModal />
        </RpgShell>
    );
}
