// src/app/admin/AdminAiGenerationsPanel.tsx
"use client";

import React from "react";
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

/* ============================================================================
🧩 JSON VIEWER (no libs)
============================================================================ */

function isPlainObject(x: any) {
    return x && typeof x === "object" && !Array.isArray(x);
}

function JsonViewer(props: { title: string; value: any; defaultOpen?: boolean }) {
    const [open, setOpen] = React.useState(!!props.defaultOpen);

    const pretty =
        props.value == null
            ? null
            : typeof props.value === "string"
              ? props.value
              : JSON.stringify(props.value, null, 2);

    return (
        <div className="rounded-xl bg-black/20 ring-1 ring-white/10">
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
                        <pre className="max-h-[340px] overflow-auto whitespace-pre-wrap break-words text-xs text-white/75">
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

export default function AdminAiGenerationsPanel() {
    const rows = useAdminStore((s) => s.aiGenerations);
    const count = useAdminStore((s) => s.aiGenerationsCount);
    const loading = useAdminStore((s) => s.aiGenerationsLoading);
    const error = useAdminStore((s) => s.aiGenerationsError);
    const filters = useAdminStore((s) => s.aiGenerationsFilters);

    const setFilters = useAdminStore((s) => s.setAiGenerationsFilters);
    const fetchRows = useAdminStore((s) => s.fetchAiGenerations);

    const openRow = useAdminStore((s) => s.openAiGeneration);
    const closeRow = useAdminStore((s) => s.closeAiGeneration);

    const selectedId = useAdminStore((s) => s.selectedAiGenerationId);
    const selected = useAdminStore((s) => s.selectedAiGenerationFull);
    const selectedLoading = useAdminStore((s) => s.selectedAiGenerationLoading);
    const selectedError = useAdminStore((s) => s.selectedAiGenerationError);

    React.useEffect(() => {
        void fetchRows({ reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const canPrev = (filters.offset ?? 0) > 0;
    const canNext = rows.length === (filters.limit ?? 25);

    return (
        <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white/90">Logs IA</h2>
                    <p className="mt-1 text-sm text-white/55">
                        Supabase: <span className="text-white/70">ai_generations</span>
                        {typeof count === "number" ? ` • total: ${count}` : ""}
                    </p>
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
            <div className="grid gap-2 md:grid-cols-4">
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="Search: session_id, user_id, chapter_id…"
                    value={filters.q ?? ""}
                    onChange={(e) => setFilters({ q: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                <select
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 outline-none focus:ring-white/20"
                    value={filters.type ?? ""}
                    onChange={(e) => {
                        setFilters({ type: e.target.value, offset: 0 });
                        void fetchRows({ reset: true });
                    }}
                >
                    <option value="">Type: tous</option>
                    <option value="mission_order">mission_order</option>
                    <option value="chapter_story">chapter_story</option>
                    <option value="quest_congrats">quest_congrats</option>
                    <option value="quest_encouragement">quest_encouragement</option>
                    <option value="adventure_briefing">adventure_briefing</option>
                </select>

                <select
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 outline-none focus:ring-white/20"
                    value={filters.status ?? "all"}
                    onChange={(e) => {
                        setFilters({ status: e.target.value as any, offset: 0 });
                        void fetchRows({ reset: true });
                    }}
                >
                    <option value="all">Status: tous</option>
                    <option value="success">success</option>
                    <option value="error">error</option>
                </select>

                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20"
                    placeholder="Model (ex: gpt-4.1)"
                    value={filters.model ?? ""}
                    onChange={(e) => setFilters({ model: e.target.value })}
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
                                <Th>Date</Th>
                                <Th>Type</Th>
                                <Th>Status</Th>
                                <Th>Model</Th>
                                <Th>Durée</Th>
                                <Th>Session</Th>
                                <Th>Source</Th>
                                <Th>Détails</Th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                            {loading && rows.length === 0 ? (
                                <tr>
                                    <Td className="py-10" colSpan={8}>
                                        <div className="text-white/60">Chargement…</div>
                                    </Td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <Td className="py-10" colSpan={8}>
                                        <div className="text-white/60">Aucune ligne.</div>
                                    </Td>
                                </tr>
                            ) : (
                                rows.map((r) => (
                                    <tr key={r.id} className="hover:bg-white/5">
                                        <Td>
                                            <div>{r.created_at}</div>
                                            <div className="mt-1 text-xs text-white/40">{r.id}</div>
                                        </Td>

                                        <Td>
                                            <Badge tone="blue">{r.generation_type}</Badge>
                                        </Td>

                                        <Td>
                                            {r.status === "success" ? (
                                                <Badge tone="green">success</Badge>
                                            ) : (
                                                <Badge tone="red">error</Badge>
                                            )}
                                            {r.error_message ? (
                                                <div className="mt-1 line-clamp-2 text-xs text-white/45">
                                                    {r.error_message}
                                                </div>
                                            ) : null}
                                        </Td>

                                        <Td className="text-white/70">{r.model}</Td>

                                        <Td className="text-white/70">
                                            {r.duration_ms != null ? `${r.duration_ms} ms` : "—"}
                                        </Td>

                                        <Td>
                                            <div className="text-white/85">{r.session_id}</div>
                                            <div className="mt-1 text-xs text-white/40">
                                                {r.user_id ?? "—"}
                                            </div>
                                        </Td>

                                        <Td className="text-white/55">{r.source ?? "—"}</Td>

                                        <Td>
                                            <button
                                                onClick={() => openRow(r.id)}
                                                className="h-8 rounded-lg bg-white/10 px-3 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                                            >
                                                Ouvrir
                                            </button>
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
                        offset {filters.offset ?? 0} • limit {filters.limit ?? 25}
                    </div>

                    <div className="flex gap-2">
                        <button
                            disabled={!canPrev || loading}
                            onClick={() => {
                                const nextOffset = Math.max(
                                    0,
                                    (filters.offset ?? 0) - (filters.limit ?? 25)
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
                                const nextOffset = (filters.offset ?? 0) + (filters.limit ?? 25);
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
                    <div>
                        <div className="text-sm text-white/50">AI Generation</div>
                        <div className="mt-1 text-lg font-semibold text-white/90">
                            {selectedId ?? "—"}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {selected?.generation_type ? (
                                <Badge tone="blue">{String(selected.generation_type)}</Badge>
                            ) : null}
                            {selected?.status ? (
                                selected.status === "success" ? (
                                    <Badge tone="green">success</Badge>
                                ) : (
                                    <Badge tone="red">error</Badge>
                                )
                            ) : null}
                            {selected?.model ? (
                                <Badge tone="gray">{String(selected.model)}</Badge>
                            ) : null}
                        </div>
                    </div>

                    <button
                        onClick={closeRow}
                        className="h-10 rounded-xl bg-white/10 px-4 text-sm text-white/85 ring-1 ring-white/10 hover:bg-white/15"
                    >
                        Fermer
                    </button>
                </div>

                <div className="mt-4">
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
                        <div className="space-y-3">
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
                                        <div className="text-xs text-white/45">duration_ms</div>
                                        <div className="text-sm text-white/85">
                                            {selected.duration_ms != null
                                                ? `${selected.duration_ms} ms`
                                                : "—"}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">session_id</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.session_id ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">user_id</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.user_id ?? "—")}
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
                                        <div className="text-xs text-white/45">source</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.source ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">provider</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.provider ?? "—")}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-white/45">error_code</div>
                                        <div className="text-sm text-white/85">
                                            {String(selected.error_code ?? "—")}
                                        </div>
                                    </div>
                                </div>

                                {selected.error_message ? (
                                    <div className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200 ring-1 ring-rose-400/20">
                                        {String(selected.error_message)}
                                    </div>
                                ) : null}
                            </div>

                            {/* JSON / Text fields */}
                            <JsonViewer title="system_text" value={selected.system_text ?? null} />
                            <JsonViewer
                                title="user_input_text"
                                value={selected.user_input_text ?? null}
                            />
                            <JsonViewer title="output_text" value={selected.output_text ?? null} />

                            <JsonViewer
                                title="request_json"
                                value={selected.request_json ?? null}
                                defaultOpen
                            />
                            <JsonViewer
                                title="context_json"
                                value={selected.context_json ?? null}
                            />
                            <JsonViewer
                                title="response_json"
                                value={selected.response_json ?? null}
                            />
                            <JsonViewer title="parsed_json" value={selected.parsed_json ?? null} />
                            <JsonViewer title="usage_json" value={selected.usage_json ?? null} />

                            <JsonViewer title="metadata" value={selected.metadata ?? null} />
                            <JsonViewer title="tags" value={selected.tags ?? null} />
                            <JsonViewer title="rendered_md" value={selected.rendered_md ?? null} />
                            <JsonViewer title="parse_error" value={selected.parse_error ?? null} />
                        </div>
                    )}
                </div>
            </Drawer>
        </section>
    );
}
