"use client";

// React
import { useEffect, useMemo, useState } from "react";

// Components
import { Panel, Pill, ActionButton } from "@/components/RpgUi";

// Stores
import { useJournalStore } from "@/stores/journalStore";
import { useGameStore } from "@/stores/gameStore";

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

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
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

export default function LogsView() {
    const entries = useJournalStore((s) => s.entries) as unknown as Entry[];
    const loading = useJournalStore((s) => s.loading);
    const load = useJournalStore((s) => s.load);

    const { bootstrap } = useGameStore();

    const [filter, setFilter] = useState<FilterKey>("all");

    const currentAdventure = useGameStore((s) => s.currentAdventure);
    const chaptersByAdventureId = useGameStore((s) => s.chaptersByAdventureId);

    const adventureId = currentAdventure?.id ?? "";

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
                    Rien pour l’instant dans ce filtre. Lance une aventure, démarre un chapitre,
                    termine une quête ✅
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
                                                        <Pill>🕯️ {formatTimeFR(d)}</Pill>
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
    );
}
