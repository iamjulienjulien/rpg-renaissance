"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel } from "@/components/RpgUi";
import { useGameStore, type Character } from "@/stores/gameStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function kindLabel(kind: string) {
    if (kind === "history") return "Historique";
    if (kind === "fiction") return "Fiction";
    return kind;
}

function CharacterCard(props: {
    character: Character;
    active: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    const { character: c, active, disabled, onClick } = props;

    const src = `/assets/images/characters/${c.code}.png`;

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={cn(
                "group relative overflow-hidden rounded-3xl text-left ring-1 transition",
                "bg-black/25 ring-white/10 hover:bg-black/35 hover:ring-white/15",
                active && "ring-emerald-400/30",
                disabled && "opacity-60 pointer-events-none"
            )}
        >
            {/* Illustration */}
            <div className="relative aspect-square w-full">
                <Image
                    src={src}
                    alt={c.name}
                    fill
                    sizes="(min-width: 1024px) 260px, (min-width: 640px) 45vw, 92vw"
                    className="object-cover object-top transition-transform duration-200"
                    priority={active}
                />

                {/* Soft vignette for readability */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                {/* Top badges */}
                <div className="absolute left-3 top-3 flex items-center gap-2">
                    <span className="rounded-full bg-black/40 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                        {kindLabel(c.kind)}
                    </span>
                    <span className="rounded-full bg-black/40 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                        🏷️ {c.archetype}
                    </span>
                </div>

                {/* Active badge */}
                {active ? (
                    <div className="absolute right-3 top-3">
                        <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-200 ring-1 ring-emerald-400/20">
                            ✅ Actif
                        </span>
                    </div>
                ) : null}

                {/* Name strip */}
                <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <div className="truncate text-white/95 font-semibold">
                                {c.emoji ? `${c.emoji} ` : ""}
                                {c.name}
                            </div>
                            <div className="mt-1 text-xs text-white/70 line-clamp-2">{c.vibe}</div>
                        </div>
                        <div
                            className={cn(
                                "grid h-9 w-9 place-items-center rounded-2xl ring-1 transition",
                                "bg-white/5 ring-white/10",
                                active
                                    ? "bg-white/10 ring-white/20"
                                    : "group-hover:bg-white/10 group-hover:ring-white/15"
                            )}
                        >
                            <span className="text-base">⮕</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Motto */}
            <div className="p-4">
                <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10 min-h-[96px] flex flex-col">
                    <div className="text-xs tracking-[0.18em] text-white/45">SERMENT</div>
                    <div className="mt-1 rpg-text-sm text-white/75 line-clamp-2">“{c.motto}”</div>
                </div>
            </div>
        </button>
    );
}

export default function CharactersPage() {
    const bootstrap = useGameStore((s) => s.bootstrap);
    const characters = useGameStore((s) => s.characters);
    const profile = useGameStore((s) => s.profile);

    const loading = useGameStore((s) => s.characterLoading);
    const saving = useGameStore((s) => s.saving);
    const error = useGameStore((s) => s.error);

    const refreshProfile = useGameStore((s) => s.refreshProfile);
    const activateCharacter = useGameStore((s) => s.activateCharacter);

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeCharacterId = profile?.character_id ?? null;

    return (
        <RpgShell
            title="Personnages"
            subtitle="Choisis ton avatar. Il influencera le ton des briefs et la voix du Maître du Jeu."
            rightSlot={null}
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
                <Panel
                    title="Galerie"
                    emoji="🛡️"
                    subtitle="Clique un blason pour l’activer (enregistré en BDD)."
                    right={
                        <div className="flex items-center gap-2">
                            <ActionButton onClick={() => void refreshProfile()}>
                                {loading ? "⏳" : "🔄"}
                            </ActionButton>
                            <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/65 ring-1 ring-white/10">
                                {characters.length} persos
                            </span>
                        </div>
                    }
                >
                    {characters.length === 0 ? (
                        <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                            Aucun personnage trouvé. Vérifie le seed en BDD.
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {characters.map((c) => (
                                <CharacterCard
                                    key={c.id}
                                    character={c}
                                    active={c.id === activeCharacterId}
                                    disabled={saving}
                                    onClick={() => void activateCharacter(c.id)}
                                />
                            ))}
                        </div>
                    )}

                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">⌨️ TIP</div>
                        <div className="mt-2 rpg-text-sm text-white/60">
                            Un clic = activation immédiate (persistée en BDD + survit au refresh).{" "}
                            {saving ? "⏳ Sauvegarde…" : null}
                        </div>
                    </div>
                </Panel>
            )}
        </RpgShell>
    );
}
