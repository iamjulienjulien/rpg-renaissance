"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAdminStore } from "@/lib/admin/adminStore";

function clsx(...xs: Array<string | null | undefined | false>) {
    return xs.filter(Boolean).join(" ");
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

function formatDate(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AdminAdventuresPanel(props: {
    userId: string | null;
    sessionId: string | null;
}) {
    const router = useRouter();

    const rows = useAdminStore((s) => (s as any).adventures);
    const count = useAdminStore((s) => (s as any).adventuresCount);
    const loading = useAdminStore((s) => (s as any).adventuresLoading);
    const error = useAdminStore((s) => (s as any).adventuresError);
    const filters = useAdminStore((s) => (s as any).adventuresFilters);

    const setFilters = useAdminStore((s) => (s as any).setAdventuresFilters);
    const fetchRows = useAdminStore((s) => (s as any).fetchAdventures);

    React.useEffect(() => {
        // sync props -> filters (tab deep-link)
        setFilters({
            userId: props.userId ?? "",
            sessionId: props.sessionId ?? "",
            offset: 0,
        });

        void fetchRows({ reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.userId, props.sessionId]);

    const canPrev = (filters?.offset ?? 0) > 0;
    const canNext = (rows?.length ?? 0) === (filters?.limit ?? 25);

    return (
        <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white/90">Aventures</h2>
                    <p className="mt-1 text-sm text-white/55">
                        Unités centrales du gameplay
                        {typeof count === "number" ? ` • total: ${count}` : ""}
                    </p>
                </div>

                <button
                    onClick={() => void fetchRows({ reset: true })}
                    className="h-10 rounded-xl bg-white/10 px-4 text-sm text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                >
                    {loading ? "Refresh…" : "Refresh"}
                </button>
            </div>

            {/* Filters */}
            <div className="grid gap-2 md:grid-cols-4">
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20 md:col-span-2"
                    placeholder="Search title…"
                    value={filters?.q ?? ""}
                    onChange={(e) => setFilters({ q: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="Filter userId…"
                    value={filters?.userId ?? ""}
                    onChange={(e) => {
                        setFilters({ userId: e.target.value, offset: 0 });
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="Filter sessionId…"
                    value={filters?.sessionId ?? ""}
                    onChange={(e) => {
                        setFilters({ sessionId: e.target.value, offset: 0 });
                    }}
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
                                <Th>Aventure</Th>
                                <Th>Session</Th>
                                <Th>User</Th>
                                <Th>Créée</Th>
                                <Th>Chapitres</Th>
                                <Th>Quêtes</Th>
                                <Th>Complétion</Th>
                                <Th>Accès</Th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                            {loading && (rows?.length ?? 0) === 0 ? (
                                <tr>
                                    <Td className="py-10" colSpan={8}>
                                        <div className="text-white/60">Chargement…</div>
                                    </Td>
                                </tr>
                            ) : (rows?.length ?? 0) === 0 ? (
                                <tr>
                                    <Td className="py-10" colSpan={8}>
                                        <div className="text-white/60">Aucune aventure.</div>
                                    </Td>
                                </tr>
                            ) : (
                                rows.map((a: any) => (
                                    <tr key={a.adventure_id} className="hover:bg-white/5">
                                        <Td>
                                            <div className="text-white/90 font-medium line-clamp-1">
                                                {a.title}
                                            </div>
                                            <div className="mt-1 text-xs text-white/40">
                                                {a.adventure_id}
                                            </div>
                                        </Td>

                                        <Td className="text-white/70">
                                            <div className="text-white/80">{a.session_id}</div>
                                        </Td>

                                        <Td className="text-white/70">
                                            <div className="text-white/80">
                                                {a.user_email ?? "—"}
                                            </div>
                                            <div className="mt-1 text-xs text-white/40">
                                                {a.user_id}
                                            </div>
                                        </Td>

                                        <Td className="text-white/70">
                                            {formatDate(a.created_at) ?? "—"}
                                        </Td>

                                        <Td className="text-white/70">{a.chapters_count ?? 0}</Td>

                                        <Td className="text-white/70">
                                            {a.quests_done_count ?? 0}/{a.quests_count ?? 0}
                                        </Td>

                                        <Td className="text-white/70">
                                            {typeof a.completion_rate === "number"
                                                ? `${a.completion_rate}%`
                                                : "—"}
                                        </Td>

                                        <Td>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => {
                                                        router.push(
                                                            `/admin?tab=chapters&adventureId=${encodeURIComponent(
                                                                a.adventure_id
                                                            )}`
                                                        );
                                                    }}
                                                    className="h-8 rounded-lg bg-white/10 px-3 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                                                >
                                                    Voir chapitres →
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        router.push(
                                                            `/admin?tab=quests&adventureId=${encodeURIComponent(
                                                                a.adventure_id
                                                            )}`
                                                        );
                                                    }}
                                                    className="h-8 rounded-lg bg-white/10 px-3 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                                                >
                                                    Voir quêtes →
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
