"use client";

// React
import { useEffect, useState } from "react";

// Components
import { Pill, ActionButton } from "@/components/RpgUi";
import { UiMetricCard } from "@/components/ui/stats/UiMetricCard";
import { UiSparkline } from "@/components/ui/stats/UiSparkline";
import { UiBarChartMini } from "@/components/ui/stats/UiBarChartMini";
import { UiDonut } from "@/components/ui/stats/UiDonut";

// Stores
import { type MeStatsResponse } from "@/types/game";
import { UiGradientPanel, UiPanel } from "@/components/ui";

function formatShortDateFR(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDayShortFR(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", { month: "short", day: "2-digit" });
}

function sumRecord(rec?: Record<string, number> | null) {
    if (!rec) return 0;
    return Object.values(rec).reduce((a, b) => a + (Number(b) || 0), 0);
}

function pick(key: string, rec?: Record<string, number> | null) {
    if (!rec) return 0;
    return Number(rec[key] ?? 0) || 0;
}

export default function StatsView() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<MeStatsResponse | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/me/stats", { cache: "no-store" });
                const json = await res.json().catch(() => null);

                if (!res.ok) {
                    const msg = (json as any)?.error ?? `Erreur (${res.status})`;
                    if (!cancelled) setError(msg);
                    return;
                }

                if (!cancelled) setData(json as MeStatsResponse);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Erreur réseau");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void run();
        return () => {
            cancelled = true;
        };
    }, []);

    const renown = data?.progression?.renown;
    const chapters = data?.progression?.chapters;
    const quests = data?.progression?.quests;
    const activity = data?.activity;
    const ai = data?.ai;
    const achievements = data?.achievements;
    const badges = data?.badges;
    const toasts = data?.toasts;
    const photos = data?.photos;

    const activityVals = (activity?.activity_last_30 ?? []).map((x) => Number(x.count) || 0);
    const activityDates = (activity?.activity_last_30 ?? []).map((x) => x.date);

    const questsTotal = Number(quests?.total ?? 0) || 0;
    const questsDone = Number(quests?.done ?? 0) || 0;
    const questsTodo = Number(quests?.todo ?? Math.max(0, questsTotal - questsDone)) || 0;

    const questsPct = questsTotal > 0 ? questsDone / questsTotal : 0;

    const gens = ai?.generations_last_30;
    const jobs = ai?.jobs_last_30;

    const gensTotal = Number(gens?.total ?? 0) || 0;
    const gensOk = Number(gens?.success ?? 0) || 0;
    const gensErr = Number(gens?.error ?? 0) || 0;
    const gensPct = gensTotal > 0 ? gensOk / gensTotal : 0;

    const jobsTotal = Number(jobs?.total ?? 0) || 0;

    const unread = Number(toasts?.unread_count ?? 0) || 0;

    return (
        <UiPanel
            title="Stats"
            emoji="📊"
            subtitle="Ton tableau de bord: progression, activité, IA et trophées."
            right={
                <div className="flex items-center gap-2">
                    <Pill>🕯️ Maj: {formatShortDateFR(data?.meta?.generated_at ?? null)}</Pill>
                    <ActionButton variant="soft" onClick={() => location.reload()}>
                        🔄 Rafraîchir
                    </ActionButton>
                </div>
            }
        >
            {loading ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    ⏳ Chargement des stats…
                </div>
            ) : error ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-rose-200">
                    ⚠️ {error}
                </div>
            ) : !data ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    Aucune donnée.
                </div>
            ) : (
                <div className="grid gap-4">
                    {/* HERO: highlights */}
                    <UiGradientPanel innerClassName="p-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <UiMetricCard
                                title="Renommée"
                                icon="🏆"
                                tone="theme"
                                value={renown?.value ?? 0}
                                hint={
                                    renown?.full_title
                                        ? `${renown.full_title}${renown.is_milestone ? " · ⭐ palier" : ""}`
                                        : renown?.tier_title
                                          ? renown.tier_title
                                          : "—"
                                }
                                right={
                                    <UiDonut
                                        value={(() => {
                                            const v = Number(renown?.value ?? 0) || 0;
                                            const into = v % 100;
                                            return into / 100;
                                        })()}
                                        label={`${(Number(renown?.value ?? 0) || 0) % 100}/100`}
                                    />
                                }
                            />

                            <UiMetricCard
                                title="Quêtes"
                                icon="✅"
                                tone={
                                    questsPct >= 0.6
                                        ? "good"
                                        : questsPct >= 0.3
                                          ? "warn"
                                          : "default"
                                }
                                value={`${questsDone}/${questsTotal}`}
                                hint={`Restantes: ${questsTodo} · Pièces touchées: ${quests?.rooms_touched_count ?? 0}`}
                                right={<UiDonut value={questsPct} />}
                            />

                            <UiMetricCard
                                title="Streak"
                                icon="🔥"
                                tone={
                                    Number(activity?.current_streak_days ?? 0) >= 5
                                        ? "good"
                                        : "theme"
                                }
                                value={`${activity?.current_streak_days ?? 0}j`}
                                hint={`Best: ${activity?.best_streak_days ?? 0}j · Actifs (30j): ${activity?.active_days_last_30 ?? 0}`}
                                right={<UiSparkline values={activityVals} />}
                            />

                            <UiMetricCard
                                title="IA"
                                icon="🤖"
                                tone={gensErr > 0 ? "warn" : "theme"}
                                value={`${gensTotal} gen`}
                                hint={`Jobs: ${jobsTotal} · OK: ${gensOk} · Err: ${gensErr}`}
                                right={
                                    <UiDonut
                                        value={gensPct}
                                        label={`${Math.round(gensPct * 100)}%`}
                                    />
                                }
                            />
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <UiMetricCard
                                title="Notifications"
                                icon="🔔"
                                value={unread}
                                hint={unread ? "Tu as du courrier." : "Boîte vide, esprit libre."}
                                tone={unread ? "warn" : "default"}
                            />
                            <UiMetricCard
                                title="Achievements"
                                icon="🧿"
                                value={achievements?.total ?? 0}
                                hint={
                                    (achievements?.recent?.[0]?.name ?? "").trim()
                                        ? `Dernier: ${(achievements!.recent[0].icon ?? "🏅").trim()} ${(achievements!.recent[0].name ?? "").trim()}`
                                        : "—"
                                }
                            />
                            <UiMetricCard
                                title="Badges"
                                icon="🏅"
                                value={badges?.total ?? 0}
                                hint={
                                    (badges?.recent?.[0]?.title ?? "").trim()
                                        ? `Dernier: ${(badges!.recent[0].emoji ?? "🏅").trim()} ${(badges!.recent[0].title ?? "").trim()}`
                                        : "—"
                                }
                            />
                        </div>
                    </UiGradientPanel>

                    {/* Activité 30j */}
                    <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-white/85 font-semibold">
                                🗓️ Activité (30 jours)
                            </div>
                            <Pill>
                                Dernière entrée:{" "}
                                {formatShortDateFR(activity?.last_entry_at ?? null)}
                            </Pill>
                        </div>

                        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr,340px]">
                            <UiBarChartMini
                                values={activityVals}
                                ariaLabel="Activité quotidienne sur 30 jours"
                            />

                            <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Lecture rapide
                                </div>
                                <div className="mt-2 text-sm text-white/70 leading-7">
                                    <div>
                                        • Jours actifs:{" "}
                                        <span className="text-white/90 font-semibold">
                                            {activity?.active_days_last_30 ?? 0}
                                        </span>
                                    </div>
                                    <div>
                                        • Streak actuel:{" "}
                                        <span className="text-white/90 font-semibold">
                                            {activity?.current_streak_days ?? 0}
                                        </span>{" "}
                                        jours
                                    </div>
                                    <div>
                                        • Record:{" "}
                                        <span className="text-white/90 font-semibold">
                                            {activity?.best_streak_days ?? 0}
                                        </span>{" "}
                                        jours
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {activityDates.slice(-6).map((d, i) => (
                                        <Pill key={d + i}>
                                            {formatDayShortFR(d)} ·{" "}
                                            {activityVals[activityVals.length - 6 + i] ?? 0}
                                        </Pill>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progression */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-white/85 font-semibold">📘 Chapitres</div>
                                <Pill>Total: {chapters?.total ?? 0}</Pill>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <UiMetricCard
                                    title="Par statut"
                                    icon="📌"
                                    value={sumRecord(chapters?.by_status ?? {})}
                                    hint={`open: ${pick("open", chapters?.by_status ?? {})} · doing: ${pick("doing", chapters?.by_status ?? {})} · done: ${pick("done", chapters?.by_status ?? {})}`}
                                />
                                <UiMetricCard
                                    title="Récents"
                                    icon="🕯️"
                                    value={(chapters?.recent?.length ?? 0) || 0}
                                    hint={
                                        (chapters?.recent?.[0]?.title ?? "").trim()
                                            ? `Dernier: ${chapters!.recent[0].title}`
                                            : "—"
                                    }
                                />
                            </div>
                        </div>

                        <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-white/85 font-semibold">⚔️ Quêtes</div>
                                <Pill>Total: {questsTotal}</Pill>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <UiMetricCard
                                    title="Répartition"
                                    icon="🧭"
                                    value={`${questsDone} done`}
                                    hint={`todo: ${questsTodo} · avg diff: ${quests?.difficulty_avg ?? "—"}`}
                                />
                                <UiMetricCard
                                    title="Statuts"
                                    icon="📎"
                                    value={sumRecord(quests?.by_status ?? {})}
                                    hint={
                                        Object.entries(quests?.by_status ?? {})
                                            .slice(0, 3)
                                            .map(([k, v]) => `${k}:${v}`)
                                            .join(" · ") || "—"
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* IA + Photos */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-white/85 font-semibold">🤖 IA (30 jours)</div>
                                <Pill>
                                    Fenêtre:{" "}
                                    {formatShortDateFR(data.meta?.windows?.last_30_from ?? null)}
                                </Pill>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <UiMetricCard
                                    title="Generations"
                                    icon="🪄"
                                    value={gensTotal}
                                    hint={`OK: ${gensOk} · Err: ${gensErr} · avg: ${gens?.avg_duration_ms ?? "—"}ms`}
                                    right={<UiDonut value={gensPct} />}
                                />
                                <UiMetricCard
                                    title="Jobs"
                                    icon="🧰"
                                    value={jobsTotal}
                                    hint={`by status: ${
                                        Object.entries(jobs?.by_status ?? {})
                                            .map(([k, v]) => `${k}:${v}`)
                                            .slice(0, 3)
                                            .join(" · ") || "—"
                                    }`}
                                />
                            </div>

                            <div className="mt-3 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Top types
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {(gens?.types_top ?? []).slice(0, 6).map((t) => (
                                        <Pill key={t.type}>
                                            🧪 {t.type} · {t.count}
                                        </Pill>
                                    ))}
                                    {(jobs?.types_top ?? []).slice(0, 6).map((t) => (
                                        <Pill key={t.job_type}>
                                            🧷 {t.job_type} · {t.count}
                                        </Pill>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-white/85 font-semibold">📸 Photos</div>
                                <Pill>Total: {photos?.total ?? 0}</Pill>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <UiMetricCard
                                    title="Covers"
                                    icon="🖼️"
                                    value={photos?.cover_total ?? 0}
                                    hint={`Derniers 30j: ${photos?.last_30 ?? 0}`}
                                />
                                <UiMetricCard
                                    title="Catégories"
                                    icon="🧩"
                                    value={Object.keys(photos?.by_category ?? {}).length}
                                    hint={
                                        Object.entries(photos?.by_category ?? {})
                                            .slice(0, 4)
                                            .map(([k, v]) => `${k}:${v}`)
                                            .join(" · ") || "—"
                                    }
                                />
                            </div>

                            <div className="mt-3 text-xs text-white/45">
                                Prochaine upgrade: preview cover + filtre par catégorie.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </UiPanel>
    );
}
