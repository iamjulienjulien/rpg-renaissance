"use client";

import { Pill } from "@/components/RpgUi";

// Storesd
import { useGameStore } from "@/stores/gameStore";
import { UiChip, UiGradientPanel, UiPanel, UiPill } from "@/components/ui";
import UiImage from "@/components/ui/UiImage";

function formatShortDateFR(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "2-digit" });
}

function safeNumber(x: any, fallback = 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : fallback;
}

export default function RenownView() {
    const currentPlayer = useGameStore((s) => s.currentPlayer);

    const renownValue = safeNumber(currentPlayer?.renown?.value, 0);
    const renownUpdatedAt = currentPlayer?.renown?.updated_at ?? null;

    const level = currentPlayer?.renown?.level ?? null;
    const levelNumber = level?.number ?? null;
    const levelTitle = (level?.title ?? "").trim();
    const tierTitle = (level?.tier_title ?? "").trim();
    const levelSuffix = (level?.level_suffix ?? "").trim();
    const isMilestone = !!level?.is_milestone;

    const displayName =
        (currentPlayer?.display_name ?? "").trim() ||
        (currentPlayer?.first_name ?? "").trim() ||
        "Aventurier";

    const badges = Array.isArray(currentPlayer?.badges) ? currentPlayer!.badges : [];
    const badgesSorted = badges
        .slice()
        .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime());

    // ⚠️ Si tu n’as pas encore de table d’événements de renommée, on évite les fausses datas.
    // Petite jauge "symbolique" (mod 100) en attendant un vrai calcul.
    const into = renownValue % 100;
    const pct = Math.max(0, Math.min(100, (into / 100) * 100));

    return (
        <UiPanel
            title="Renommée"
            emoji="🏆"
            subtitle="Ta trace dans le monde: niveau, titre, et badges gagnés."
            // variant="ghost"
            // right={
            //     <div className="flex items-center gap-2">
            //         <Pill>🏷️ {displayName}</Pill>
            //         <Pill>🏅 {badges.length}</Pill>
            //     </div>
            // }
        >
            <div className="grid gap-4">
                {/* Carte Renommée */}
                <UiGradientPanel innerClassName="p-4" gradient="theme">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Niveau actuel
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <div className="text-3xl font-semibold text-white/90">
                                        {levelNumber != null ? levelNumber : "—"}
                                    </div>

                                    {levelTitle ? (
                                        <UiChip size="md" tone="theme">
                                            ✨ {levelTitle}
                                        </UiChip>
                                    ) : null}

                                    {tierTitle ? (
                                        <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                                            🏛️ {tierTitle}
                                        </span>
                                    ) : null}

                                    {/* {levelSuffix ? (
                                        <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                                            {levelSuffix}
                                        </span>
                                    ) : null} */}

                                    {isMilestone ? (
                                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200 ring-1 ring-emerald-400/20">
                                            ⭐ Palier
                                        </span>
                                    ) : null}
                                </div>

                                <div className="mt-2 text-sm text-white/60">
                                    Renommée totale:{" "}
                                    <span className="text-white/85">{renownValue}</span>
                                </div>

                                {/* <div className="mt-1 text-xs text-white/45">
                                    Maj: {formatShortDateFR(renownUpdatedAt)}
                                </div> */}
                            </div>
                            <div className="flex">
                                <div className="mr-4 ring-1 ring-white/10 p-1 rounded">
                                    <img
                                        src={`/assets/images/levels/1.png`}
                                        alt="level"
                                        className="w-24.5 h-24.5 rounded"
                                    />
                                </div>
                                <div className="rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                                    <div className="text-xs text-white/55">Progression</div>
                                    <div className="mt-1 text-sm text-white/85 font-semibold">
                                        ✨ {into}/100
                                    </div>
                                    <div className="mt-1 text-[11px] text-white/45">
                                        {" "}
                                        Maj: {formatShortDateFR(renownUpdatedAt)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Barre */}
                        <div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                                <div
                                    className="h-full rounded-full bg-white/25"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            {/* <div className="mt-2 flex items-center justify-between text-xs text-white/55">
                                <span>Chaque pas compte.</span>
                                <span>Reste: {100 - into}</span>
                            </div> */}
                        </div>

                        {/* Petit texte narratif */}
                        {/* <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10 text-sm text-white/70 leading-7">
                            <span className="text-white/85 font-semibold">Le MJ note:</span> ta
                            renommée n’est pas une note, c’est une trace. Elle grimpe quand tu
                            avances, même lentement. Elle reste quand tu reviens. 👁️‍🗨️
                        </div> */}
                    </div>
                </UiGradientPanel>

                {/* Badges acquis */}
                <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-white/85 font-semibold">🏅 Badges acquis</div>
                        <Pill>{badges.length}</Pill>
                    </div>

                    {badgesSorted.length === 0 ? (
                        <div className="mt-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                            Aucun badge pour l’instant. Termine une quête, franchis un palier, et
                            ils apparaîtront ici.
                        </div>
                    ) : (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {badgesSorted.map((b) => {
                                const emoji = (b.emoji ?? "🏅").trim() || "🏅";
                                const title = (b.title ?? "").trim() || b.code;
                                const desc = (b.description ?? "").trim();
                                const source = (b.source ?? "").trim();
                                console.log("b", b);
                                return (
                                    <div
                                        key={b.code + b.unlocked_at}
                                        className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
                                    >
                                        <div className="flex">
                                            <div className="w-[100px] mr-6">
                                                <UiImage
                                                    src={`/assets/images/achievements/${b.code}.png`}
                                                    alt={b.title}
                                                    aspect="square"
                                                />
                                            </div>
                                            <div className="flex items-start justify-between gap-3 w-full">
                                                <div className="min-w-0 h-full flex flex-col justify-center">
                                                    <div className="text- font-semibold text-white/90">
                                                        {emoji} {title}
                                                    </div>

                                                    {desc ? (
                                                        <div className="mt-2 text-sm text-white/65 ">
                                                            {desc}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <span className="shrink-0">
                                                    <UiPill>
                                                        🕯️ {formatShortDateFR(b.unlocked_at)}
                                                    </UiPill>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* <div className="mt-3 text-xs text-white/45">
                        Plus tard: tri par source, recherche, et affichage “rare/épique” via
                        metadata.
                    </div> */}
                </div>

                {/* Historique */}
                <div className="rounded-[28px] bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-white/85 font-semibold">📜 Historique</div>
                        <Pill>🧱 À brancher</Pill>
                    </div>

                    <div className="mt-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                        Quand tu auras une table d’événements (gain/perte) on affichera ici les
                        lignes détaillées: “+20 Quête terminée”, “+5 régularité”, etc.
                    </div>
                </div>
            </div>
        </UiPanel>
    );
}
