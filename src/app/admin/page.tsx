// src/app/admin/page.tsx
import React from "react";
import AdminAiGenerationsPanel from "./AdminAiGenerationsPanel";

/* ============================================================================
🧠 TYPES (fake KPIs seulement)
============================================================================ */

type Kpi = {
    label: string;
    value: string;
    hint?: string | null;
};

const KPIS: Kpi[] = [
    { label: "Utilisateurs actifs (7j)", value: "128", hint: "+12% semaine" },
    { label: "Sessions actives", value: "42", hint: "dont 9 en jeu" },
    { label: "Générations IA (24h)", value: "1 934" },
    { label: "Taux d’erreur IA", value: "1.8%" },
    { label: "Latence médiane", value: "620 ms" },
    { label: "Coût estimé", value: "€ 7.43" },
];

function Panel(props: { children: React.ReactNode }) {
    return <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">{props.children}</div>;
}

function SectionHeader(props: { title: string; subtitle?: string }) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-white/90">{props.title}</h2>
            {props.subtitle ? <p className="mt-1 text-sm text-white/55">{props.subtitle}</p> : null}
        </div>
    );
}

/* ============================================================================
📄 PAGE
============================================================================ */

export default function AdminPage() {
    return (
        <div className="space-y-10">
            {/* KPIs */}
            <section>
                <SectionHeader title="Vue d’ensemble" subtitle="Indicateurs clés (placeholder)" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {KPIS.map((k) => (
                        <Panel key={k.label}>
                            <div className="text-sm text-white/55">{k.label}</div>
                            <div className="mt-1 text-2xl font-semibold text-white">{k.value}</div>
                            {k.hint ? (
                                <div className="mt-1 text-xs text-white/45">{k.hint}</div>
                            ) : null}
                        </Panel>
                    ))}
                </div>
            </section>

            {/* Real logs */}
            <AdminAiGenerationsPanel />

            <footer className="text-center text-xs text-white/40">
                Admin Console • Logs branchés sur Supabase
            </footer>
        </div>
    );
}
