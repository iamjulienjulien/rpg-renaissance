// src/app/admin/AdminListContactsPanel.tsx
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

function asArray(v: any): any[] {
    return Array.isArray(v) ? v : [];
}

function asString(v: any): string {
    return typeof v === "string" ? v : "";
}

function getPropValue(props: any, key: string): string | null {
    if (!props) return null;
    if (typeof props === "object" && !Array.isArray(props)) {
        const v = (props as any)[key];
        if (typeof v === "string") return v;
        if (typeof v === "number") return String(v);
        if (typeof v === "boolean") return v ? "true" : "false";
        return null;
    }
    return null;
}

function statusToneFromProps(props: any) {
    const s = getPropValue(props, "status")?.toLowerCase();
    if (!s) return "gray";
    if (s.includes("confirmed") || s.includes("subscribed")) return "green";
    if (s.includes("pending")) return "amber";
    if (s.includes("unsub")) return "red";
    return "gray";
}

/* ============================================================================
🧩 COMPONENT
============================================================================ */

type Props = {};

export default function AdminListContactsPanel(_props: Props) {
    const rows = useAdminStore((s) => (s as any).listContacts);
    const count = useAdminStore((s) => (s as any).listContactsCount);
    const loading = useAdminStore((s) => (s as any).listContactsLoading);
    const error = useAdminStore((s) => (s as any).listContactsError);
    const filters = useAdminStore((s) => (s as any).listContactsFilters);

    const setFilters = useAdminStore((s) => (s as any).setListContactsFilters);
    const fetchRows = useAdminStore((s) => (s as any).fetchListContacts);

    React.useEffect(() => {
        // 1er load
        void fetchRows({ reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        console.log("r", rows);
    }, [rows]);

    const canPrev = (filters?.offset ?? 0) > 0;
    const canNext = (rows?.length ?? 0) === (filters?.limit ?? 50);

    return (
        <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white/90">Pré-inscrits</h2>
                    <p className="mt-1 text-sm text-white/55">
                        Contacts Resend (segment)
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
            <div className="grid gap-2 md:grid-cols-8">
                <input
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 placeholder:text-white/35 outline-none focus:ring-white/20 md:col-span-4"
                    placeholder="Search email…"
                    value={filters?.q ?? ""}
                    onChange={(e) => setFilters({ q: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void fetchRows({ reset: true });
                    }}
                />

                <select
                    className="h-10 rounded-xl bg-white/5 px-3 text-sm text-white/85 ring-1 ring-white/10 outline-none focus:ring-white/20 md:col-span-2"
                    value={String(filters?.limit ?? 50)}
                    onChange={(e) => {
                        const nextLimit = Number(e.target.value) || 50;
                        setFilters({ limit: nextLimit, offset: 0 });
                        void fetchRows({ reset: true });
                    }}
                >
                    <option value="25">25 / page</option>
                    <option value="50">50 / page</option>
                    <option value="100">100 / page</option>
                </select>

                <button
                    onClick={() => void fetchRows({ reset: true })}
                    className="h-10 rounded-xl bg-white/10 px-4 text-sm text-white/85 ring-1 ring-white/10 hover:bg-white/15 md:col-span-2"
                >
                    Rechercher
                </button>
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
                                <Th>Email</Th>
                                <Th>Status</Th>
                                <Th>Locale</Th>
                                <Th>UTM</Th>
                                <Th>Créé</Th>
                                <Th>Contact ID</Th>
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
                                        <div className="text-white/60">Aucun contact.</div>
                                    </Td>
                                </tr>
                            ) : (
                                asArray(rows).map((r: any) => {
                                    const email = asString(r?.email) || "—";
                                    const id = asString(r?.id) || "—";
                                    const createdAt =
                                        asString(r?.createdAt) ||
                                        asString(r?.created_at) ||
                                        asString(r?.created) ||
                                        null;

                                    const unsub = r?.status === "unsubscribed";

                                    const props = r?.properties ?? null;
                                    const locale = getPropValue(props, "locale");
                                    const status = getPropValue(props, "status");

                                    const utmKeys = [
                                        "utm_source",
                                        "utm_medium",
                                        "utm_campaign",
                                        "utm_term",
                                        "utm_content",
                                    ] as const;

                                    const utmPairs = utmKeys
                                        .map((k) => [k, getPropValue(props, k)] as const)
                                        .filter(([, v]) => !!v);

                                    const tone = unsub
                                        ? "red"
                                        : (statusToneFromProps(props) as any);

                                    return (
                                        <tr key={id} className="hover:bg-white/5">
                                            <Td>
                                                <div className="text-white/90 font-medium">
                                                    {email}
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    {unsub ? (
                                                        <Badge tone="red">unsubscribed</Badge>
                                                    ) : (
                                                        <Badge tone="green">subscribed</Badge>
                                                    )}
                                                    {status ? (
                                                        <Badge tone={tone}>status: {status}</Badge>
                                                    ) : (
                                                        <Badge>status: —</Badge>
                                                    )}
                                                </div>
                                            </Td>

                                            <Td>
                                                <Badge tone={tone}>
                                                    {unsub ? "unsubscribed" : status || "—"}
                                                </Badge>
                                            </Td>

                                            <Td className="text-white/70">{locale ?? "—"}</Td>

                                            <Td className="text-white/70">
                                                {utmPairs.length === 0 ? (
                                                    <span className="text-white/45">—</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {utmPairs.map(([k, v]) => (
                                                            <Badge key={k} tone="gray">
                                                                {k.replace("utm_", "")}: {v}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </Td>

                                            <Td className="text-white/70">
                                                {formatDate(createdAt)}
                                            </Td>

                                            <Td>
                                                <div className="text-white/80">{id}</div>
                                                <div className="mt-1 text-xs text-white/40">
                                                    {typeof navigator !== "undefined" &&
                                                    id !== "—" ? (
                                                        <button
                                                            onClick={() => {
                                                                void navigator.clipboard?.writeText(
                                                                    id
                                                                );
                                                            }}
                                                            className="underline decoration-white/20 hover:decoration-white/40"
                                                        >
                                                            copier
                                                        </button>
                                                    ) : null}
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
                        offset {filters?.offset ?? 0} • limit {filters?.limit ?? 50}
                    </div>

                    <div className="flex gap-2">
                        <button
                            disabled={!canPrev || loading}
                            onClick={() => {
                                const nextOffset = Math.max(
                                    0,
                                    (filters?.offset ?? 0) - (filters?.limit ?? 50)
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
                                const nextOffset = (filters?.offset ?? 0) + (filters?.limit ?? 50);
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
