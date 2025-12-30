// src/app/admin/AdminSystemLogsPanel.tsx
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
    tone?: "gray" | "green" | "blue" | "amber" | "rose";
}) {
    const tone = props.tone ?? "gray";
    const tones: Record<string, string> = {
        gray: "bg-white/5 text-white/70 ring-white/10",
        green: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/20",
        blue: "bg-sky-400/10 text-sky-200 ring-sky-400/20",
        amber: "bg-amber-400/10 text-amber-200 ring-amber-400/20",
        rose: "bg-rose-400/10 text-rose-200 ring-rose-400/20",
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
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function levelTone(level: string) {
    const v = String(level ?? "").toLowerCase();
    if (v === "error") return "rose";
    if (v === "warning") return "amber";
    if (v === "success") return "green";
    if (v === "info") return "blue";
    return "gray";
}

function shortUuid(id?: string | null) {
    if (!id) return "—";
    const s = String(id);
    return s.length > 12 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s;
}

/* ============================================================================
🧩 JSON VIEWER (no libs)
============================================================================ */

function JsonViewer(props: { title: string; value: any; defaultOpen?: boolean }) {
    const [open, setOpen] = React.useState(!!props.defaultOpen);

    const pretty =
        props.value == null
            ? null
            : typeof props.value === "string"
              ? props.value
              : JSON.stringify(props.value, null, 2);

    return (
        <div className="rounded-2xl bg-black/20 ring-1 ring-white/10">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
            >
                <div className="text-sm font-medium text-white/85">{props.title}</div>
                <div className="text-xs text-white/50">{open ? "—" : "+"}</div>
            </button>

            {open ? (
                <div className="border-t border-white/10 px-3 py-2">
                    {pretty == null ? (
                        <div className="text-xs text-white/40">null</div>
                    ) : (
                        <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words text-xs text-white/75">
                            {pretty}
                        </pre>
                    )}
                </div>
            ) : null}
        </div>
    );
}

/* ============================================================================
🧩 DRAWER
============================================================================ */

function Drawer(props: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    React.useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") props.onClose();
        }
        if (props.open) window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [props.open, props.onClose]);

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={props.onClose} aria-hidden />
            <div className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto bg-zinc-950 p-4 ring-1 ring-white/10">
                {props.children}
            </div>
        </div>
    );
}

/* ============================================================================
🧩 COMPONENT
============================================================================ */

type Props = {
    // filtres initialisés via l’URL /admin?tab=systemLogs&sessionId=...
    userId?: string | null;
    sessionId?: string | null;
    requestId?: string | null;
    traceId?: string | null;
    route?: string | null;
};

export default function AdminSystemLogsPanel(props: Props) {
    const router = useRouter();

    // List
    const rows = useAdminStore((s) => (s as any).systemLogs);
    const count = useAdminStore((s) => (s as any).systemLogsCount);
    const loading = useAdminStore((s) => (s as any).systemLogsLoading);
    const error = useAdminStore((s) => (s as any).systemLogsError);
    const filters = useAdminStore((s) => (s as any).systemLogsFilters);

    const setFilters = useAdminStore((s) => (s as any).setSystemLogsFilters);
    const fetchRows = useAdminStore((s) => (s as any).fetchSystemLogs);

    // Drawer (store)
    const openRow = useAdminStore((s) => (s as any).openSystemLog);
    const closeRow = useAdminStore((s) => (s as any).closeSystemLog);

    const selectedId = useAdminStore((s) => (s as any).selectedSystemLogId);
    const selected = useAdminStore((s) => (s as any).selectedSystemLogFull);
    const selectedLoading = useAdminStore((s) => (s as any).selectedSystemLogLoading);
    const selectedError = useAdminStore((s) => (s as any).selectedSystemLogError);

    React.useEffect(() => {
        setFilters({
            userId: props.userId ?? "",
            sessionId: props.sessionId ?? "",
            requestId: props.requestId ?? "",
            traceId: props.traceId ?? "",
            route: props.route ?? "",
            offset: 0,
        });
        void fetchRows({ reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.userId, props.sessionId, props.requestId, props.traceId, props.route]);

    const canPrev = (filters?.offset ?? 0) > 0;
    const canNext = (rows?.length ?? 0) === (filters?.limit ?? 25);

    return (
        <section className="space-y-3">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white/90">System logs</h2>
                    <p className="mt-1 text-sm text-white/55">
                        Logs applicatifs (public.system_logs)
                        {typeof count === "number" ? ` • total: ${count}` : ""}
                    </p>

                    {(props.userId ||
                        props.sessionId ||
                        props.requestId ||
                        props.traceId ||
                        props.route) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {props.userId ? <Badge tone="gray">userId</Badge> : null}
                            {props.sessionId ? <Badge tone="gray">sessionId</Badge> : null}
                            {props.requestId ? <Badge tone="gray">requestId</Badge> : null}
                            {props.traceId ? <Badge tone="gray">traceId</Badge> : null}
                            {props.route ? <Badge tone="gray">route</Badge> : null}
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
                    placeholder="Search message / source / route…"
                    value={filters?.q ?? ""}
                    onChange={(e) => setFilters({ q: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                {/* Level */}
                <select
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 outline-none focus:ring-white/20"
                    value={filters?.level ?? "all"}
                    onChange={(e) => {
                        setFilters({ level: e.target.value as any });
                        void fetchRows({ reset: true });
                    }}
                >
                    <option value="all">level: all</option>
                    <option value="debug">debug</option>
                    <option value="info">info</option>
                    <option value="success">success</option>
                    <option value="warning">warning</option>
                    <option value="error">error</option>
                </select>

                {/* route */}
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="route (ex: /api/photos)"
                    value={filters?.route ?? ""}
                    onChange={(e) => setFilters({ route: e.target.value })}
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

                {/* requestId */}
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="requestId"
                    value={filters?.requestId ?? ""}
                    onChange={(e) => setFilters({ requestId: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                {/* userId */}
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20 md:col-span-2"
                    placeholder="userId"
                    value={filters?.userId ?? ""}
                    onChange={(e) => setFilters({ userId: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                {/* traceId */}
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20 md:col-span-2"
                    placeholder="traceId"
                    value={filters?.traceId ?? ""}
                    onChange={(e) => setFilters({ traceId: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                {/* status code */}
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="statusCode"
                    value={filters?.statusCode ?? ""}
                    onChange={(e) => setFilters({ statusCode: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                {/* source */}
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="source"
                    value={filters?.source ?? ""}
                    onChange={(e) => setFilters({ source: e.target.value })}
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
                                <Th>Quand</Th>
                                <Th>Niveau</Th>
                                <Th>HTTP</Th>
                                <Th>Message</Th>
                                <Th>Contexte</Th>
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
                                        <div className="text-white/60">Aucun log.</div>
                                    </Td>
                                </tr>
                            ) : (
                                rows.map((r: any) => (
                                    <tr key={r.id} className="hover:bg-white/5">
                                        <Td className="text-white/70">
                                            <div>{formatDate(r.created_at)}</div>
                                            <div className="mt-1 text-xs text-white/35">
                                                {shortUuid(r.id)}
                                            </div>
                                        </Td>

                                        <Td>
                                            <Badge tone={levelTone(r.level)}>
                                                {String(r.level ?? "—")}
                                            </Badge>
                                        </Td>

                                        <Td>
                                            <div className="text-white/85">
                                                {r.method ? String(r.method) : "—"}{" "}
                                                {r.route ? (
                                                    <span className="text-white/60">
                                                        {String(r.route)}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-1 text-xs text-white/45">
                                                {typeof r.status_code === "number"
                                                    ? `status ${r.status_code}`
                                                    : "status —"}
                                                {typeof r.duration_ms === "number"
                                                    ? ` • ${r.duration_ms}ms`
                                                    : ""}
                                            </div>
                                        </Td>

                                        <Td>
                                            <div className="text-white/90 font-medium line-clamp-2">
                                                {r.message ?? "—"}
                                            </div>

                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                {r.source ? (
                                                    <Badge tone="gray">{r.source}</Badge>
                                                ) : null}
                                                {r.function_name ? (
                                                    <Badge tone="gray">{r.function_name}</Badge>
                                                ) : null}
                                                {r.error_name ? (
                                                    <Badge tone="rose">{r.error_name}</Badge>
                                                ) : null}
                                            </div>

                                            {r.error_message ? (
                                                <div className="mt-2 text-xs text-rose-200/80 line-clamp-2">
                                                    {r.error_message}
                                                </div>
                                            ) : null}

                                            <button
                                                onClick={() => openRow(r.id)}
                                                className="mt-2 inline-flex h-8 items-center rounded-lg bg-white/10 px-3 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                                            >
                                                Détails →
                                            </button>
                                        </Td>

                                        <Td>
                                            <div className="grid gap-1 text-xs text-white/55">
                                                <div>
                                                    request:{" "}
                                                    <span className="text-white/75">
                                                        {shortUuid(r.request_id)}
                                                    </span>
                                                </div>
                                                <div>
                                                    trace:{" "}
                                                    <span className="text-white/75">
                                                        {shortUuid(r.trace_id)}
                                                    </span>
                                                </div>
                                                <div>
                                                    user:{" "}
                                                    <span className="text-white/75">
                                                        {shortUuid(r.user_id)}
                                                    </span>
                                                </div>
                                                <div>
                                                    session:{" "}
                                                    <span className="text-white/75">
                                                        {shortUuid(r.session_id)}
                                                    </span>
                                                </div>
                                            </div>
                                        </Td>

                                        <Td>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (!r.session_id) return;
                                                        router.push(
                                                            `/admin?tab=sessions&sessionId=${encodeURIComponent(
                                                                r.session_id
                                                            )}`
                                                        );
                                                    }}
                                                    className={clsx(
                                                        "h-8 rounded-lg px-3 text-xs ring-1 ring-white/10",
                                                        r.session_id
                                                            ? "bg-white/10 text-white/85 hover:bg-white/15"
                                                            : "bg-white/5 text-white/30"
                                                    )}
                                                    disabled={!r.session_id}
                                                >
                                                    Session →
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        if (!r.adventure_id) return;
                                                        router.push(
                                                            `/admin?tab=adventures&adventureId=${encodeURIComponent(
                                                                r.adventure_id
                                                            )}`
                                                        );
                                                    }}
                                                    className={clsx(
                                                        "h-8 rounded-lg px-3 text-xs ring-1 ring-white/10",
                                                        r.adventure_id
                                                            ? "bg-white/10 text-white/85 hover:bg-white/15"
                                                            : "bg-white/5 text-white/30"
                                                    )}
                                                    disabled={!r.adventure_id}
                                                >
                                                    Aventure →
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        if (!r.chapter_id) return;
                                                        router.push(
                                                            `/admin?tab=chapters&chapterId=${encodeURIComponent(
                                                                r.chapter_id
                                                            )}`
                                                        );
                                                    }}
                                                    className={clsx(
                                                        "h-8 rounded-lg px-3 text-xs ring-1 ring-white/10",
                                                        r.chapter_id
                                                            ? "bg-white/10 text-white/85 hover:bg-white/15"
                                                            : "bg-white/5 text-white/30"
                                                    )}
                                                    disabled={!r.chapter_id}
                                                >
                                                    Chapitre →
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        if (!r.chapter_quest_id) return;
                                                        router.push(
                                                            `/admin?tab=quests&chapterQuestId=${encodeURIComponent(
                                                                r.chapter_quest_id
                                                            )}`
                                                        );
                                                    }}
                                                    className={clsx(
                                                        "h-8 rounded-lg px-3 text-xs ring-1 ring-white/10",
                                                        r.chapter_quest_id
                                                            ? "bg-white/10 text-white/85 hover:bg-white/15"
                                                            : "bg-white/5 text-white/30"
                                                    )}
                                                    disabled={!r.chapter_quest_id}
                                                >
                                                    Quête →
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

            {/* Drawer */}
            <Drawer open={!!selectedId} onClose={closeRow}>
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="text-xs tracking-[0.22em] uppercase text-white/45">
                            System Log
                        </div>
                        <div className="mt-1 truncate text-lg font-semibold text-white/90">
                            {selectedId ?? "—"}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                            {selected?.level ? (
                                <Badge tone={levelTone(String(selected.level))}>
                                    {String(selected.level)}
                                </Badge>
                            ) : null}

                            {selected?.method ? (
                                <Badge tone="gray">{String(selected.method)}</Badge>
                            ) : null}

                            {selected?.status_code != null ? (
                                <Badge tone="gray">{`status ${String(selected.status_code)}`}</Badge>
                            ) : null}

                            {selected?.duration_ms != null ? (
                                <Badge tone="gray">{`${String(selected.duration_ms)}ms`}</Badge>
                            ) : null}

                            {selected?.route ? (
                                <Badge tone="blue">{String(selected.route)}</Badge>
                            ) : null}
                        </div>
                    </div>

                    <button
                        onClick={closeRow}
                        className="h-10 shrink-0 rounded-xl bg-white/10 px-4 text-sm text-white/85 ring-1 ring-white/10 transition hover:bg-white/15"
                    >
                        Fermer ✖
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    {selectedLoading ? (
                        <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/60 ring-1 ring-white/10">
                            Chargement des détails…
                        </div>
                    ) : selectedError ? (
                        <div className="rounded-2xl bg-rose-400/10 p-4 text-sm text-rose-200 ring-1 ring-rose-400/20">
                            {selectedError}
                        </div>
                    ) : !selected ? (
                        <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/60 ring-1 ring-white/10">
                            Aucune donnée.
                        </div>
                    ) : (
                        <>
                            {/* Quick facts */}
                            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <div className="text-xs text-white/45">created_at</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.created_at ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">level</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.level ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">message</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.message ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">source</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.source ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">file</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.file ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">line</div>
                                        <div className="text-sm text-white/85">
                                            {selected.line != null ? String(selected.line) : "—"}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">function_name</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.function_name ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">error_name</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.error_name ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">error_message</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.error_message ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">request_id</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.request_id ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">trace_id</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.trace_id ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">user_id</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.user_id ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">session_id</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.session_id ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">adventure_id</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.adventure_id ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">chapter_id</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.chapter_id ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">
                                            chapter_quest_id
                                        </div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.chapter_quest_id ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">
                                            adventure_quest_id
                                        </div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.adventure_quest_id ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">route</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.route ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">method</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.method ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">status_code</div>
                                        <div className="text-sm text-white/85">
                                            {selected.status_code != null
                                                ? String(selected.status_code)
                                                : "—"}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">duration_ms</div>
                                        <div className="text-sm text-white/85">
                                            {selected.duration_ms != null
                                                ? `${String(selected.duration_ms)} ms`
                                                : "—"}
                                        </div>
                                    </div>
                                </div>

                                {selected.stack ? (
                                    <div className="mt-4 rounded-2xl bg-rose-400/10 p-3 text-xs text-rose-200 ring-1 ring-rose-400/20">
                                        <pre className="whitespace-pre-wrap break-words">
                                            {String(selected.stack)}
                                        </pre>
                                    </div>
                                ) : null}
                            </div>

                            {/* Structured blobs */}
                            <JsonViewer
                                title="metadata"
                                value={(selected as any).metadata ?? null}
                                defaultOpen
                            />

                            {/* Sometimes useful: full row dump */}
                            <JsonViewer title="row" value={selected ?? null} />
                        </>
                    )}
                </div>
            </Drawer>
        </section>
    );
}
