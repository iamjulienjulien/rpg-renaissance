"use client";

// React
import { useEffect, useState } from "react";

// Components
import RpgShell from "@/components/RpgShell";
import StoryView from "./_components/StoryView";
import RenownView from "./_components/RenownView";
import StatsView from "./_components/StatsView";

// Stores
import { useJournalStore } from "@/stores/journalStore";
import { useGameStore } from "@/stores/gameStore";
import LogsView from "./_components/LogsView";

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

type TabKey = "logs" | "story" | "renown" | "stats";

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
        <div className="flex flex-wrap gap-2 mb-6 mt-0">
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
                                "bg-linear-to-r from-fuchsia-400/10 via-cyan-300/10 to-emerald-300/10",
                                active ? "opacity-100" : "group-hover:opacity-60"
                            )}
                        />
                    </button>
                );
            })}
        </div>
    );
}

export default function JournalPage() {
    const entries = useJournalStore((s) => s.entries) as unknown as Entry[];
    const load = useJournalStore((s) => s.load);

    const { bootstrap } = useGameStore();

    const [tab, setTab] = useState<TabKey>("logs");

    const currentAdventure = useGameStore((s) => s.currentAdventure);
    const chaptersByAdventureId = useGameStore((s) => s.chaptersByAdventureId);
    const storyById = useGameStore((s) => s.chapterStoryByChapterId);

    const adventureId = currentAdventure?.id ?? "";
    const adventureChapters = adventureId ? (chaptersByAdventureId?.[adventureId] ?? []) : [];

    const storyCount = adventureChapters.reduce((acc, ch) => acc + (storyById?.[ch.id] ? 1 : 0), 0);

    useEffect(() => {
        void bootstrap();
        void load(120);
    }, []);

    return (
        <RpgShell title="Journal" subtitle="Un grimoire vivant: traces, récit, et renommée.">
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

            {tab === "logs" ? <LogsView /> : null}
            {tab === "story" ? <StoryView /> : null}
            {tab === "renown" ? <RenownView /> : null}
            {tab === "stats" ? <StatsView /> : null}
        </RpgShell>
    );
}
