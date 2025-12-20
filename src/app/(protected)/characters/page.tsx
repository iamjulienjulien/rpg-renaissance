"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { useCharacterStore, type Character } from "@/stores/characterStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function kindLabel(kind: string) {
    if (kind === "history") return "Historique";
    if (kind === "fiction") return "Fiction";
    return kind;
}

function crestAccent(code: string) {
    const c = code.toLowerCase();

    if (c.includes("jeanne") || c.includes("geralt"))
        return "from-rose-400/20 via-white/5 to-transparent";
    if (c.includes("leonard") || c.includes("hypatie"))
        return "from-indigo-400/20 via-white/5 to-transparent";
    if (c.includes("athena") || c.includes("gandalf"))
        return "from-cyan-400/20 via-white/5 to-transparent";
    if (c.includes("napoleon")) return "from-amber-400/20 via-white/5 to-transparent";
    if (c.includes("thoreau")) return "from-emerald-400/20 via-white/5 to-transparent";
    if (c.includes("batman")) return "from-slate-300/15 via-white/5 to-transparent";
    if (c.includes("ulysse")) return "from-violet-400/20 via-white/5 to-transparent";

    return "from-white/10 via-white/5 to-transparent";
}

function crestIcon(kind: string) {
    if (kind === "history") return "🏛️";
    if (kind === "fiction") return "📖";
    return "🪶";
}

function CrestCard(props: {
    character: Character;
    active: boolean;
    selected: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    const { character: c, active, selected, disabled, onClick } = props;

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={cn(
                "group relative overflow-hidden rounded-3xl p-4 text-left ring-1 transition",
                "bg-black/25 ring-white/10 hover:bg-black/35 hover:ring-white/15",
                selected && "bg-black/60 ring-white/25",
                active && "ring-emerald-400/25",
                disabled && "opacity-60 pointer-events-none"
            )}
        >
            {/* Accent wash */}
            <div
                className={cn(
                    "pointer-events-none absolute inset-0 opacity-0 transition-opacity",
                    "bg-gradient-to-br",
                    crestAccent(c.code),
                    (selected || active) && "opacity-100",
                    !selected && !active && "group-hover:opacity-100"
                )}
            />

            {/* Shield watermark */}
            <div className="pointer-events-none absolute -right-6 -top-8 opacity-[0.10] blur-[0.2px]">
                <svg width="140" height="140" viewBox="0 0 120 120" fill="none" aria-hidden>
                    <path
                        d="M60 10c10 8 26 10 38 12v36c0 22-14 40-38 52C36 98 22 80 22 58V22c12-2 28-4 38-12Z"
                        stroke="white"
                        strokeWidth="2"
                        fill="white"
                        fillOpacity="0.05"
                    />
                    <path
                        d="M60 26c7 6 18 7 26 8v24c0 15-9 27-26 36-17-9-26-21-26-36V34c8-1 19-2 26-8Z"
                        stroke="white"
                        strokeOpacity="0.5"
                        strokeWidth="1.5"
                        fill="none"
                    />
                </svg>
            </div>

            {/* Top row */}
            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        {/* Sigil */}
                        <div
                            className={cn(
                                "grid h-11 w-11 place-items-center rounded-2xl ring-1 transition",
                                "bg-white/5 ring-white/10",
                                selected
                                    ? "bg-white/10 ring-white/20"
                                    : "group-hover:bg-white/10 group-hover:ring-white/15"
                            )}
                            aria-hidden
                        >
                            <span className="text-xl">{c.emoji ?? "🧙"}</span>
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <div className="truncate text-white/90 font-semibold">{c.name}</div>

                                {active ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-200 ring-1 ring-emerald-400/20">
                                        ✅ Actif
                                    </span>
                                ) : null}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                                <span className="inline-flex items-center gap-1">
                                    {crestIcon(c.kind)} {kindLabel(c.kind)}
                                </span>
                                <span className="opacity-40">•</span>
                                <span>🏷️ {c.archetype}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 rpg-text-sm text-white/60">{c.vibe}</div>
                </div>

                {/* Selection dot */}
                <div className="mt-1 text-xs text-white/50">{selected ? "⬤" : "◯"}</div>
            </div>

            {/* Motto ribbon */}
            <div className="relative mt-4 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                <div className="text-xs tracking-[0.18em] text-white/45">SERMENT</div>
                <div className="mt-1 rpg-text-sm text-white/75">“{c.motto}”</div>
            </div>
        </button>
    );
}

export default function CharactersPage() {
    const router = useRouter();
    const characters = useCharacterStore((s) => s.characters);
    const profile = useCharacterStore((s) => s.profile);

    const loading = useCharacterStore((s) => s.loading);
    const saving = useCharacterStore((s) => s.saving);
    const error = useCharacterStore((s) => s.error);

    const selectedId = useCharacterStore((s) => s.selectedId);

    const bootstrap = useCharacterStore((s) => s.bootstrap);
    const refreshProfile = useCharacterStore((s) => s.refreshProfile);
    const activateCharacter = useCharacterStore((s) => s.activateCharacter);

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeCharacterId = profile?.character_id ?? null;

    const activeCharacter = useMemo(() => {
        if (activeCharacterId) {
            return characters.find((c) => c.id === activeCharacterId) ?? profile?.character ?? null;
        }
        return profile?.character ?? null;
    }, [characters, activeCharacterId, profile]);

    const selectedCharacter = useMemo(() => {
        if (!selectedId) return null;
        return characters.find((c) => c.id === selectedId) ?? null;
    }, [characters, selectedId]);

    return (
        <RpgShell
            title="Personnages"
            subtitle="Choisis ton avatar. Il influencera le ton des briefs et la voix du Maître du Jeu."
            rightSlot={
                <div className="flex items-center gap-2">
                    {activeCharacter ? (
                        <Pill>
                            {activeCharacter.emoji} {activeCharacter.name}
                        </Pill>
                    ) : (
                        <Pill>🧙 Aucun</Pill>
                    )}

                    <ActionButton onClick={() => void refreshProfile()}>
                        {loading ? "⏳" : "🔄"}
                    </ActionButton>

                    <ActionButton onClick={() => router.push("/")} variant="soft">
                        ↩️ Home
                    </ActionButton>
                </div>
            }
        >
            {error ? (
                <div className="mb-4 rounded-2xl bg-black/30 p-4 rpg-text-sm text-red-200 ring-1 ring-white/10">
                    ⚠️ {error}
                </div>
            ) : null}

            {loading && characters.length === 0 ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement des personnages…
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <Panel
                        title="Galerie"
                        emoji="🛡️"
                        subtitle="Clique un blason pour l’activer (enregistré en BDD)."
                        right={<Pill>{characters.length} persos</Pill>}
                    >
                        {characters.length === 0 ? (
                            <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                                Aucun personnage trouvé. Vérifie le seed en BDD.
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {characters.map((c) => (
                                    <CrestCard
                                        key={c.id}
                                        character={c}
                                        active={c.id === activeCharacterId}
                                        selected={c.id === selectedId}
                                        disabled={saving}
                                        onClick={() => void activateCharacter(c.id)}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                            <div className="text-xs tracking-[0.18em] text-white/55">⌨️ TIP</div>
                            <div className="mt-2 rpg-text-sm text-white/60">
                                Un clic = activation immédiate (persistée en BDD + survit au
                                refresh). {saving ? "⏳ Sauvegarde…" : null}
                            </div>
                        </div>
                    </Panel>

                    <Panel
                        title="Fiche"
                        emoji="📜"
                        subtitle="Aperçu du personnage actif et de ta sélection."
                    >
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="text-xs tracking-[0.22em] text-white/55">
                                PERSONNAGE ACTIF
                            </div>

                            <div className="mt-2 text-white/90 font-semibold">
                                {activeCharacter ? (
                                    <>
                                        <span className="mr-2" aria-hidden>
                                            {activeCharacter.emoji ?? "🧙"}
                                        </span>
                                        {activeCharacter.name}
                                    </>
                                ) : (
                                    <>Aucun</>
                                )}
                            </div>

                            <div className="mt-3 rpg-text-sm text-white/60">
                                {activeCharacter
                                    ? activeCharacter.motto
                                    : "Choisis un personnage pour influencer le ton du jeu."}
                            </div>

                            {activeCharacter ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Pill>🏷️ {activeCharacter.archetype}</Pill>
                                    <Pill>
                                        {crestIcon(activeCharacter.kind)}{" "}
                                        {kindLabel(activeCharacter.kind)}
                                    </Pill>
                                    <Pill>🎭 {(activeCharacter.ai_style as any)?.tone ?? "—"}</Pill>
                                    <Pill>
                                        ✍️ {(activeCharacter.ai_style as any)?.style ?? "—"}
                                    </Pill>
                                    <Pill>
                                        📏 {(activeCharacter.ai_style as any)?.verbosity ?? "—"}
                                    </Pill>
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                            <div className="text-xs tracking-[0.22em] text-white/55">
                                APERÇU (SÉLECTION)
                            </div>

                            {selectedCharacter ? (
                                <div className="mt-3">
                                    <div className="text-white/90 font-semibold">
                                        <span className="mr-2" aria-hidden>
                                            {selectedCharacter.emoji ?? "🧙"}
                                        </span>
                                        {selectedCharacter.name}
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <Pill>🏷️ {selectedCharacter.archetype}</Pill>
                                        <Pill>
                                            {crestIcon(selectedCharacter.kind)}{" "}
                                            {kindLabel(selectedCharacter.kind)}
                                        </Pill>
                                        {selectedCharacter.id === activeCharacterId ? (
                                            <Pill>✅ Actif</Pill>
                                        ) : (
                                            <Pill>◯ Sélection</Pill>
                                        )}
                                    </div>

                                    <div className="mt-3 rpg-text-sm text-white/60">
                                        {selectedCharacter.vibe}
                                    </div>

                                    <div className="mt-3 rounded-2xl bg-black/30 p-3 ring-1 ring-white/10 rpg-text-sm text-white/75">
                                        “{selectedCharacter.motto}”
                                    </div>

                                    <div className="mt-4 text-xs text-white/50">
                                        Prochaine étape: utiliser ce style pour le Briefing
                                        d’aventure et la génération IA.
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-3 rpg-text-sm text-white/60">
                                    Clique un blason à gauche.
                                </div>
                            )}
                        </div>
                    </Panel>
                </div>
            )}
        </RpgShell>
    );
}
