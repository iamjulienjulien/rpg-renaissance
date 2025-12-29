// src/app/admin/AdminChaptersPanel.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAdminStore } from "@/lib/admin/adminStore";

/* ============================================================================
🧰 HELPERS UI
============================================================================ */

function clsx(...xs: Array<string | null | undefined | false>) {
    return xs.filter(Boolean).join(" ");
}

function Badge(props: { children: React.ReactNode; tone?: "gray" | "green" | "blue" | "amber" }) {
    const tone = props.tone ?? "gray";
    const tones: Record<string, string> = {
        gray: "bg-white/5 text-white/70 ring-white/10",
        green: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/20",
        blue: "bg-sky-400/10 text-sky-200 ring-sky-400/20",
        amber: "bg-amber-400/10 text-amber-200 ring-amber-400/20",
    };

    return (
        <span
            className={clsx(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1",
                tones[tone]
            )}
        >
            {props.children}
        </span>
    );
}

function Th(props: { children: React.ReactNode }) {
    return (
        <th className="px-4 py-3 text-left text-xs font-medium text-white/50">{props.children}</th>
    );
}

function Td(props: { children: React.ReactNode; className?: string; colSpan?: number }) {
    return (
        <td
            colSpan={props.colSpan}
            className={clsx("px-4 py-3 text-sm text-white/85 align-top", props.className)}
        >
            {props.children}
        </td>
    );
}

function formatDate(iso: string | null | undefined) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/* ============================================================================
🧩 COMPONENT
============================================================================ */

type Props = {
    userId?: string | null;
    sessionId?: string | null;
    adventureId?: string | null;
};

export default function AdminChaptersPanel(props: Props) {
    const router = useRouter();

    const rows = useAdminStore((s) => (s as any).chapters);
    const count = useAdminStore((s) => (s as any).chaptersCount);
    const loading = useAdminStore((s) => (s as any).chaptersLoading);
    const error = useAdminStore((s) => (s as any).chaptersError);
    const filters = useAdminStore((s) => (s as any).chaptersFilters);

    const setFilters = useAdminStore((s) => (s as any).setChaptersFilters);
    const fetchRows = useAdminStore((s) => (s as any).fetchChapters);

    // Init: hydrate filters depuis props (tabbed params)
    React.useEffect(() => {
        setFilters({
            userId: props.userId ?? "",
            sessionId: props.sessionId ?? "",
            adventureId: props.adventureId ?? "",
            offset: 0,
        });
        void fetchRows({ reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.userId, props.sessionId, props.adventureId]);

    const canPrev = (filters?.offset ?? 0) > 0;
    const canNext = (rows?.length ?? 0) === (filters?.limit ?? 25);

    return (
        <section className="space-y-3">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white/90">Chapitres</h2>
                    <p className="mt-1 text-sm text-white/55">
                        Vue chapitres (chapters + chapter_quests)
                        {typeof count === "number" ? ` • total: ${count}` : ""}
                    </p>

                    {(props.userId || props.sessionId || props.adventureId) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {props.userId ? <Badge tone="gray">userId</Badge> : null}
                            {props.sessionId ? <Badge tone="gray">sessionId</Badge> : null}
                            {props.adventureId ? <Badge tone="gray">adventureId</Badge> : null}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                        onClick={() => void fetchRows({ reset: true })}
                        className="h-10 rounded-xl bg-white/10 px-4 text-sm text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                    >
                        {loading ? "Refresh…" : "Refresh"}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid gap-2 md:grid-cols-6">
                {/* Search */}
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20 md:col-span-2"
                    placeholder="Search title / chapter_code…"
                    value={filters?.q ?? ""}
                    onChange={(e) => setFilters({ q: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                {/* userId */}
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20 md:col-span-2"
                    placeholder="Filter userId (uuid)"
                    value={filters?.userId ?? ""}
                    onChange={(e) => setFilters({ userId: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                {/* sessionId */}
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="sessionId"
                    value={filters?.sessionId ?? ""}
                    onChange={(e) => setFilters({ sessionId: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                {/* adventureId */}
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="adventureId"
                    value={filters?.adventureId ?? ""}
                    onChange={(e) => setFilters({ adventureId: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
                {error ? (
                    <div className="bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>
                ) : null}

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <Th>Chapitre</Th>
                                <Th>Statut</Th>
                                <Th>Créé</Th>
                                <Th>Quêtes</Th>
                                <Th>Utilisateur</Th>
                                <Th>Liens</Th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                            {loading && (rows?.length ?? 0) === 0 ? (
                                <tr>
                                    <Td className="py-10" colSpan={6}>
                                        <div className="text-white/60">Chargement…</div>
                                    </Td>
                                </tr>
                            ) : (rows?.length ?? 0) === 0 ? (
                                <tr>
                                    <Td className="py-10" colSpan={6}>
                                        <div className="text-white/60">Aucun chapitre.</div>
                                    </Td>
                                </tr>
                            ) : (
                                rows.map((c: any) => {
                                    const total = Number(c.quests_count ?? 0);
                                    const done = Number(c.quests_done_count ?? 0);
                                    const rate = Number(c.completion_rate ?? 0);

                                    return (
                                        <tr key={c.chapter_id} className="hover:bg-white/5">
                                            <Td>
                                                <div className="text-white/90 font-medium">
                                                    {c.title ?? "—"}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                    <Badge tone="blue">
                                                        {c.chapter_code ?? "—"}
                                                    </Badge>
                                                    <Badge tone="gray">{c.kind ?? "—"}</Badge>
                                                    <Badge tone="gray">{c.pace ?? "—"}</Badge>
                                                </div>
                                                <div className="mt-1 text-xs text-white/40">
                                                    {c.chapter_id}
                                                </div>
                                            </Td>

                                            <Td>
                                                <Badge
                                                    tone={
                                                        c.status === "published"
                                                            ? "green"
                                                            : c.status === "draft"
                                                              ? "amber"
                                                              : "gray"
                                                    }
                                                >
                                                    {String(c.status ?? "—")}
                                                </Badge>
                                            </Td>

                                            <Td className="text-white/70">
                                                {formatDate(c.created_at)}
                                            </Td>

                                            <Td>
                                                <div className="text-white/85">
                                                    {done} / {total}
                                                </div>
                                                <div className="mt-1 text-xs text-white/45">
                                                    {rate}% complété
                                                </div>
                                            </Td>

                                            <Td>
                                                <div className="text-white/80">
                                                    {c.user_email ?? "—"}
                                                </div>
                                                <div className="mt-1 text-xs text-white/40">
                                                    {c.user_id ?? "—"}
                                                </div>
                                            </Td>

                                            <Td>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (!c.session_id) return;
                                                            router.push(
                                                                `/admin?tab=sessions&sessionId=${encodeURIComponent(
                                                                    c.session_id
                                                                )}`
                                                            );
                                                        }}
                                                        className={clsx(
                                                            "h-8 rounded-lg px-3 text-xs ring-1 ring-white/10",
                                                            c.session_id
                                                                ? "bg-white/10 text-white/85 hover:bg-white/15"
                                                                : "bg-white/5 text-white/30"
                                                        )}
                                                        disabled={!c.session_id}
                                                    >
                                                        Sessions →
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            if (!c.adventure_id) return;
                                                            router.push(
                                                                `/admin?tab=adventures&adventureId=${encodeURIComponent(
                                                                    c.adventure_id
                                                                )}`
                                                            );
                                                        }}
                                                        className={clsx(
                                                            "h-8 rounded-lg px-3 text-xs ring-1 ring-white/10",
                                                            c.adventure_id
                                                                ? "bg-white/10 text-white/85 hover:bg-white/15"
                                                                : "bg-white/5 text-white/30"
                                                        )}
                                                        disabled={!c.adventure_id}
                                                    >
                                                        Aventure →
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            router.push(
                                                                `/admin?tab=quests&chapterId=${encodeURIComponent(
                                                                    c.chapter_id
                                                                )}`
                                                            );
                                                        }}
                                                        className="h-8 rounded-lg bg-white/10 px-3 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                                                    >
                                                        Quêtes →
                                                    </button>
                                                </div>
                                            </Td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-xs text-white/50">
                        offset {filters?.offset ?? 0} • limit {filters?.limit ?? 25}
                    </div>

                    <div className="flex gap-2">
                        <button
                            disabled={!canPrev || loading}
                            onClick={() => {
                                const nextOffset = Math.max(
                                    0,
                                    (filters?.offset ?? 0) - (filters?.limit ?? 25)
                                );
                                setFilters({ offset: nextOffset });
                                void fetchRows();
                            }}
                            className={clsx(
                                "h-9 rounded-xl px-3 text-sm ring-1 ring-white/10",
                                !canPrev || loading
                                    ? "bg-white/5 text-white/30"
                                    : "bg-white/10 text-white/85 hover:bg-white/15"
                            )}
                        >
                            ← Prev
                        </button>

                        <button
                            disabled={!canNext || loading}
                            onClick={() => {
                                const nextOffset = (filters?.offset ?? 0) + (filters?.limit ?? 25);
                                setFilters({ offset: nextOffset });
                                void fetchRows();
                            }}
                            className={clsx(
                                "h-9 rounded-xl px-3 text-sm ring-1 ring-white/10",
                                !canNext || loading
                                    ? "bg-white/5 text-white/30"
                                    : "bg-white/10 text-white/85 hover:bg-white/15"
                            )}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
