// src/app/admin/AdminKpisPanel.tsx
"use client";

import React, { useEffect } from "react";
import { useAdminStore } from "@/lib/admin/adminStore";

type KpiCard = {
    label: string;
    value: string;
    hint?: string | null;
};

function Panel(props: { children: React.ReactNode }) {
    return <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">{props.children}</div>;
}

function formatInt(n: number) {
    try {
        return new Intl.NumberFormat("fr-FR").format(n);
    } catch {
        return String(n);
    }
}

export default function AdminKpisPanel() {
    const kpis = useAdminStore((s) => s.kpis);
    const loading = useAdminStore((s) => s.kpisLoading);
    const error = useAdminStore((s) => s.kpisError);
    const fetchKpis = useAdminStore((s) => s.fetchKpis);

    useEffect(() => {
        void fetchKpis();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cards: KpiCard[] = [
        { label: "Sessions", value: kpis ? formatInt(kpis.sessions) : "—" },
        { label: "Aventures", value: kpis ? formatInt(kpis.adventures) : "—" },
        { label: "Chapitres", value: kpis ? formatInt(kpis.chapters) : "—" },

        { label: "Quêtes (total)", value: kpis ? formatInt(kpis.quests_total) : "—" },
        { label: "Quêtes terminées", value: kpis ? formatInt(kpis.quests_done) : "—" },
        {
            label: "Taux de complétion",
            value: kpis ? `${kpis.completion_rate}%` : "—",
            hint: kpis ? `${formatInt(kpis.quests_done)} / ${formatInt(kpis.quests_total)}` : null,
        },
    ];

    return (
        <section>
            <div>
                <h2 className="text-lg font-semibold text-white/90">Vue d’ensemble</h2>
                <p className="mt-1 text-sm text-white/55">KPIs branchés sur la base</p>
            </div>

            {error ? (
                <div className="mt-4 rounded-2xl bg-black/30 p-4 text-sm text-white/70 ring-1 ring-white/10">
                    ⚠️ {error}
                </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((k) => (
                    <Panel key={k.label}>
                        <div className="text-sm text-white/55">{k.label}</div>
                        <div className="mt-1 text-2xl font-semibold text-white">
                            {loading ? "⏳" : k.value}
                        </div>
                        {k.hint ? <div className="mt-1 text-xs text-white/45">{k.hint}</div> : null}
                    </Panel>
                ))}
            </div>
        </section>
    );
}
