// src/components/CharacterGrid.tsx
"use client";

import React from "react";
import Image from "next/image";
import type { Character } from "@/types/game";

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
                // "bg-black/25 hover:bg-black/35",
                active
                    ? "bg-amber-900/30 hover:bg-amber-900/40 ring-amber-400/30 ring-amber-400/40"
                    : "bg-black/25 hover:bg-black/35 ring-white/10 hover:ring-amber-400/15",
                disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
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
                    {/* <span className="rounded-full bg-black/40 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                        {kindLabel(c.kind)}
                    </span> */}
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

export default function CharacterGrid(props: {
    characters: Character[];
    activeCharacterId?: string | null;
    disabled?: boolean;
    onSelect: (character: Character) => void;
    className?: string;
}) {
    const { characters, activeCharacterId, disabled, onSelect, className } = props;

    return (
        <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3", className)}>
            {characters.map((c) => (
                <CharacterCard
                    key={c.id}
                    character={c}
                    active={c.id === (activeCharacterId ?? null)}
                    disabled={disabled}
                    onClick={() => onSelect(c)}
                />
            ))}
        </div>
    );
}
