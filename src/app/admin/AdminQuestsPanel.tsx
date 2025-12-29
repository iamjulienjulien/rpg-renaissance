// src/app/admin/AdminQuestsPanel.tsx
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

function Badge(props: {
    children: React.ReactNode;
    tone?: "gray" | "green" | "red" | "blue" | "amber";
}) {
    const tone = props.tone ?? "gray";
    const tones: Record<string, string> = {
        gray: "bg-white/5 text-white/70 ring-white/10",
        green: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/20",
        red: "bg-rose-400/10 text-rose-200 ring-rose-400/20",
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

function statusTone(s: string) {
    if (s === "done") return "green";
    if (s === "doing") return "amber";
    return "gray";
}

/* ============================================================================
🧩 COMPONENT
============================================================================ */

type Props = {
    userId?: string | null;
    sessionId?: string | null;
    adventureId?: string | null;
    chapterId?: string | null;
};

export default function AdminQuestsPanel(props: Props) {
    const router = useRouter();

    const rows = useAdminStore((s) => (s as any).quests);
    const count = useAdminStore((s) => (s as any).questsCount);
    const loading = useAdminStore((s) => (s as any).questsLoading);
    const error = useAdminStore((s) => (s as any).questsError);
    const filters = useAdminStore((s) => (s as any).questsFilters);

    const setFilters = useAdminStore((s) => (s as any).setQuestsFilters);
    const fetchRows = useAdminStore((s) => (s as any).fetchQuests);

    React.useEffect(() => {
        setFilters({
            userId: props.userId ?? "",
            sessionId: props.sessionId ?? "",
            adventureId: props.adventureId ?? "",
            chapterId: props.chapterId ?? "",
            offset: 0,
        });
        void fetchRows({ reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.userId, props.sessionId, props.adventureId, props.chapterId]);

    const canPrev = (filters?.offset ?? 0) > 0;
    const canNext = (rows?.length ?? 0) === (filters?.limit ?? 25);

    return (
        <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white/90">Quêtes</h2>
                    <p className="mt-1 text-sm text-white/55">
                        chapter_quests + adventure_quests
                        {typeof count === "number" ? ` • total: ${count}` : ""}
                    </p>

                    {props.userId || props.sessionId || props.adventureId || props.chapterId ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {props.userId ? <Badge>userId</Badge> : null}
                            {props.sessionId ? <Badge>sessionId</Badge> : null}
                            {props.adventureId ? <Badge>adventureId</Badge> : null}
                            {props.chapterId ? <Badge>chapterId</Badge> : null}
                        </div>
                    ) : null}
                </div>

                <button
                    onClick={() => void fetchRows({ reset: true })}
                    className="h-10 rounded-xl bg-white/10 px-4 text-sm text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                >
                    {loading ? "Refresh…" : "Refresh"}
                </button>
            </div>

            {/* Filters */}
            <div className="grid gap-2 md:grid-cols-8">
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20 md:col-span-3"
                    placeholder="Search title…"
                    value={filters?.q ?? ""}
                    onChange={(e) => setFilters({ q: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                <select
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 outline-none focus:ring-white/20 md:col-span-2"
                    value={filters?.status ?? "all"}
                    onChange={(e) => {
                        setFilters({ status: e.target.value as any, offset: 0 });
                        void fetchRows({ reset: true });
                    }}
                >
                    <option value="all">Status: tous</option>
                    <option value="todo">todo</option>
                    <option value="doing">doing</option>
                    <option value="done">done</option>
                </select>

                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="userId"
                    value={filters?.userId ?? ""}
                    onChange={(e) => setFilters({ userId: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="sessionId"
                    value={filters?.sessionId ?? ""}
                    onChange={(e) => setFilters({ sessionId: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="adventureId"
                    value={filters?.adventureId ?? ""}
                    onChange={(e) => setFilters({ adventureId: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="chapterId"
                    value={filters?.chapterId ?? ""}
                    onChange={(e) => setFilters({ chapterId: e.target.value })}
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
                                <Th>Quête</Th>
                                <Th>Status</Th>
                                <Th>Créé</Th>
                                <Th>Meta</Th>
                                <Th>Chapitre</Th>
                                <Th>Utilisateur</Th>
                                <Th>Accès</Th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                            {loading && (rows?.length ?? 0) === 0 ? (
                                <tr>
                                    <Td className="py-10" colSpan={7}>
                                        <div className="text-white/60">Chargement…</div>
                                    </Td>
                                </tr>
                            ) : (rows?.length ?? 0) === 0 ? (
                                <tr>
                                    <Td className="py-10" colSpan={7}>
                                        <div className="text-white/60">Aucune quête.</div>
                                    </Td>
                                </tr>
                            ) : (
                                rows.map((r: any) => (
                                    <tr key={r.chapter_quest_id} className="hover:bg-white/5">
                                        <Td>
                                            <div className="text-white/90 font-medium">
                                                {r.title ?? "—"}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-2">
                                                {r.room_code ? (
                                                    <Badge tone="blue">🧩 {r.room_code}</Badge>
                                                ) : (
                                                    <Badge>🧩 —</Badge>
                                                )}
                                                {typeof r.difficulty === "number" ? (
                                                    <Badge tone="amber">⚔️ {r.difficulty}</Badge>
                                                ) : (
                                                    <Badge tone="amber">⚔️ —</Badge>
                                                )}
                                                {r.priority ? (
                                                    <Badge tone="gray">⭐ {r.priority}</Badge>
                                                ) : (
                                                    <Badge>⭐ —</Badge>
                                                )}
                                                {r.urgency ? (
                                                    <Badge tone="gray">⏱️ {r.urgency}</Badge>
                                                ) : (
                                                    <Badge>⏱️ —</Badge>
                                                )}
                                                {typeof r.estimate_min === "number" ? (
                                                    <Badge tone="gray">{r.estimate_min} min</Badge>
                                                ) : null}
                                            </div>
                                            <div className="mt-1 text-xs text-white/40">
                                                {r.chapter_quest_id}
                                            </div>
                                        </Td>

                                        <Td>
                                            <Badge tone={statusTone(r.status) as any}>
                                                {String(r.status ?? "—")}
                                            </Badge>
                                        </Td>

                                        <Td className="text-white/70">
                                            {formatDate(r.created_at)}
                                        </Td>

                                        <Td className="text-white/70">
                                            <div className="text-xs text-white/45">session</div>
                                            <div className="text-sm text-white/80 truncate max-w-[260px]">
                                                {r.session_title ?? r.session_id ?? "—"}
                                            </div>

                                            <div className="mt-2 text-xs text-white/45">
                                                aventure
                                            </div>
                                            <div className="text-sm text-white/80 truncate max-w-[260px]">
                                                {r.adventure_title ?? r.adventure_id ?? "—"}
                                            </div>
                                        </Td>

                                        <Td>
                                            <div className="text-white/80">
                                                {r.chapter_title ?? "—"}
                                            </div>
                                            <div className="mt-1 text-xs text-white/45">
                                                {r.chapter_code
                                                    ? `code: ${r.chapter_code}`
                                                    : "code: —"}
                                            </div>
                                            <div className="mt-1 text-xs text-white/40">
                                                {r.chapter_id ?? "—"}
                                            </div>
                                        </Td>

                                        <Td>
                                            <div className="text-white/80">
                                                {r.user_email ?? "—"}
                                            </div>
                                            <div className="mt-1 text-xs text-white/40">
                                                {r.user_id ?? "—"}
                                            </div>
                                        </Td>

                                        <Td>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => {
                                                        router.push(
                                                            `/quest?cq=${encodeURIComponent(r.chapter_quest_id)}`
                                                        );
                                                    }}
                                                    className="h-8 rounded-lg bg-white/10 px-3 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                                                >
                                                    Ouvrir →
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        router.push(
                                                            `/admin?tab=chapters&chapterId=${encodeURIComponent(r.chapter_id)}`
                                                        );
                                                    }}
                                                    className="h-8 rounded-lg bg-white/10 px-3 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                                                >
                                                    Chapitre →
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        router.push(
                                                            `/admin?tab=adventures&adventureId=${encodeURIComponent(r.adventure_id)}`
                                                        );
                                                    }}
                                                    className="h-8 rounded-lg bg-white/10 px-3 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                                                >
                                                    Aventure →
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        router.push(
                                                            `/admin?tab=sessions&sessionId=${encodeURIComponent(r.session_id)}`
                                                        );
                                                    }}
                                                    className="h-8 rounded-lg bg-white/10 px-3 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                                                >
                                                    Session →
                                                </button>
                                            </div>
                                        </Td>
                                    </tr>
                                ))
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
