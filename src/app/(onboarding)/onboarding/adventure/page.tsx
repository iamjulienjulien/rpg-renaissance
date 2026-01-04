// src/app/(onboarding)/onboarding/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel } from "@/components/RpgUi";
import CharacterGrid from "@/components/CharacterGrid";
import { useGameStore } from "@/stores/gameStore";
import UIActionButton from "@/components/ui/UiActionButton";
import { UiPanel } from "@/components/ui";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧭 AVENTURE CATALOG (temporaire)
============================================================================ */

const ADVENTURES = [
    {
        id: "realignement_du_foyer",
        code: "home_realignment",
        title: "Réalignement du Foyer",
        description: "Réordonner son espace de vie pour retrouver clarté, énergie et sérénité.",
        emoji: "🏠",
        enabled: true,
    },
    {
        id: "corps_en_mouvement",
        code: null,
        title: "Corps en Mouvement",
        description: "Reprendre contact avec son corps, pas à pas.",
        emoji: "🚶",
        enabled: false,
    },
    {
        id: "esprit_clair",
        code: null,
        title: "Esprit Clair",
        description: "Apaiser le mental et retrouver une direction.",
        emoji: "🧠",
        enabled: false,
    },
] as const;

export default function OnboardingAdventurePage() {
    const bootstrap = useGameStore((s) => s.bootstrap);

    const characters = useGameStore((s) => s.characters);
    const profile = useGameStore((s) => s.profile);

    const loading = useGameStore((s) => s.characterLoading || s.loading);
    const saving = useGameStore((s) => s.saving);
    const error = useGameStore((s) => s.error);

    const completeOnboardingAdventure = useGameStore(
        (s) => (s as any).completeOnboardingAdventure
    ) as
        | ((input: { character_id: string; adventure_code: string }) => Promise<boolean>)
        | undefined;

    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
    const [selectedAdventureId, setSelectedAdventureId] = useState<string | null>(
        ADVENTURES.find((a) => a.enabled)?.id ?? null
    );

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (profile?.character_id) setSelectedCharacterId(profile.character_id);
    }, [profile?.character_id]);

    const selectedCharacter = useMemo(() => {
        return characters.find((c) => c.id === selectedCharacterId) ?? null;
    }, [characters, selectedCharacterId]);

    const selectedAdventure = ADVENTURES.find((a) => a.id === selectedAdventureId) ?? null;

    const canSubmit =
        !!selectedAdventure?.enabled &&
        !!selectedCharacterId &&
        !loading &&
        !saving &&
        typeof completeOnboardingAdventure === "function";

    const onComplete = async () => {
        if (!completeOnboardingAdventure || !selectedAdventure || !selectedCharacterId) return;

        const ok = await completeOnboardingAdventure({
            character_id: selectedCharacterId,
            adventure_code: selectedAdventure.code ?? "",
        });

        if (ok) {
            window.location.href = "/onboarding/identity";
        }
    };

    return (
        <RpgShell
            title="Bienvenue"
            subtitle="🧭 Choisis ton aventure, puis la voix qui t’accompagnera. 🧙‍♂️"
            noRightSlot
            returnButton={false}
            largeLogo
        >
            <div className="grid gap-4">
                {/* HERO */}
                <div
                    className={cn(
                        "relative overflow-hidden rounded-[28px] ring-1",
                        "bg-black/30 ring-white/10"
                    )}
                >
                    {/* Background image */}
                    <div
                        className="absolute inset-0 bg-no-repeat bg-position-[right_top_-1rem] bg-size-[auto_250px] "
                        style={{
                            backgroundImage: "url('/assets/images/onboarding/adventure.png')",
                        }}
                    />

                    {/* Gradient overlay (left → right) */}
                    <div
                        className={cn(
                            "absolute inset-0",
                            "bg-gradient-to-r",
                            "from-black via-black/85 to-transparent"
                        )}
                    />

                    {/* Content */}
                    <div className="relative p-6 sm:p-8">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Renaissance
                        </div>

                        <h1 className="mt-4 font-main-title text-3xl sm:text-4xl text-white/95">
                            Choisir le chemin.
                        </h1>

                        <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                            Chaque aventure façonne la manière dont le jeu te guidera.
                        </p>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-2xl bg-red-500/10 p-4 rpg-text-sm text-red-200 ring-1 ring-red-400/20">
                        ⚠️ {error}
                    </div>
                ) : null}

                <UiPanel variant="soft">
                    <p>
                        <strong className="text-white/90">Bienvenue, voyageur.</strong> ✨<br />
                        Tu entres dans <strong className="text-white/90">Renaissance</strong>.
                    </p>

                    <p className="mt-3">
                        Avant que l’aventure ne commence vraiment, il faut en définir les fondations
                        : le chemin que tu veux suivre, et la voix qui t’accompagnera tout au long
                        du voyage.
                    </p>

                    <p className="mt-3 text-white/60">
                        Ces étapes ne sont pas des formalités. Elles donnent forme à ton expérience.
                    </p>
                </UiPanel>

                {/* AVENTURE PICK */}
                <Panel
                    title="Ton aventure"
                    emoji="🗺️"
                    subtitle="Une aventure définit le cadre, le rythme et la nature des quêtes."
                >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {ADVENTURES.map((adv) => {
                            const active = adv.id === selectedAdventureId;
                            const disabled = !adv.enabled;
                            const src = `/assets/images/adventures/${adv.id}.png`;

                            return (
                                <button
                                    key={adv.id}
                                    disabled={disabled}
                                    onClick={() => adv.enabled && setSelectedAdventureId(adv.id)}
                                    className={cn(
                                        "group relative overflow-hidden rounded-3xl text-left ring-1 transition",
                                        // "bg-black/25 hover:bg-black/35",
                                        active
                                            ? "bg-amber-900/30 hover:bg-amber-900/40 ring-amber-400/30 ring-amber-400/40"
                                            : "bg-black/25 hover:bg-black/35 ring-white/10 hover:ring-white/15",
                                        disabled
                                            ? "opacity-60 cursor-not-allowed"
                                            : "cursor-pointer"
                                    )}
                                >
                                    {/* Illustration */}
                                    <div className="relative aspect-square w-full">
                                        <Image
                                            src={src}
                                            alt={adv.title}
                                            fill
                                            sizes="(min-width: 1024px) 420px, (min-width: 640px) 48vw, 92vw"
                                            className={cn(
                                                "object-cover object-center transition-transform duration-200"
                                                // !disabled && "group-hover:scale-[1.02]"
                                            )}
                                            priority={active}
                                        />

                                        {/* Soft vignette for readability */}
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                                        {/* Top badges */}
                                        {/* <div className="absolute left-3 top-3 flex items-center gap-2">
                                            <span className="rounded-full bg-black/40 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                                                🗺️ Aventure
                                            </span>
                                            <span className="rounded-full bg-black/40 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                                                {adv.emoji} {adv.title}
                                            </span>
                                        </div> */}

                                        {/* Active badge */}
                                        {active ? (
                                            <div className="absolute right-3 top-3">
                                                <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-200 ring-1 ring-emerald-400/20">
                                                    ✅ Active
                                                </span>
                                            </div>
                                        ) : null}

                                        {/* Disabled badge */}
                                        {!adv.enabled ? (
                                            <div className="absolute right-3 top-3">
                                                <span className="rounded-full bg-black/45 px-2 py-1 text-[11px] text-white/70 ring-1 ring-white/10">
                                                    🔒 Bientôt
                                                </span>
                                            </div>
                                        ) : null}

                                        {/* Title strip */}
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <div className="truncate text-white/95 font-semibold">
                                                {adv.emoji} {adv.title}
                                            </div>
                                            <div className="mt-1 text-xs text-white/70 line-clamp-2">
                                                {adv.description}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pitch */}
                                    <div className="p-3">
                                        <div className="rounded-2xl bg-black/45 p-3 ring-1 ring-white/10 min-h-[96px] flex flex-col">
                                            <div className="text-xs tracking-[0.18em] text-white/45">
                                                PROMESSE
                                            </div>
                                            <div className="mt-1 rpg-text-sm text-white/75 line-clamp-2">
                                                {adv.description}
                                            </div>
                                            {/* {!adv.enabled ? (
                                                <div className="mt-2 text-xs text-white/45">
                                                    Cette aventure arrive bientôt.
                                                </div>
                                            ) : null} */}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </Panel>

                {/* CHARACTER PICK */}
                <Panel
                    title="Ton maître du jeu"
                    emoji="🎭"
                    subtitle="Le Maître du Jeu façonne la narration et la manière dont tu es guidé."
                >
                    {loading && characters.length === 0 ? (
                        <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                            ⏳ Chargement des personnages…
                        </div>
                    ) : (
                        <CharacterGrid
                            characters={characters}
                            activeCharacterId={selectedCharacterId}
                            disabled={saving}
                            onSelect={(c) => setSelectedCharacterId(c.id)}
                        />
                    )}
                </Panel>

                {/* VALIDATION */}
                <Panel
                    title="Entrer en Renaissance"
                    emoji="🏁"
                    subtitle="Aventure et voix sont définies. Le voyage peut commencer."
                >
                    <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                        <div className="rpg-text-sm text-white/70">
                            Aventure:{" "}
                            <b className="text-white/85">
                                {selectedAdventure
                                    ? `${selectedAdventure.emoji} ${selectedAdventure.title}`
                                    : "—"}
                            </b>
                            <br />
                            Maître du Jeu:{" "}
                            <b className="text-white/85">
                                {selectedCharacter
                                    ? `${selectedCharacter.emoji} ${selectedCharacter.name}`
                                    : "—"}
                            </b>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <UIActionButton
                                variant="master"
                                size="xl"
                                disabled={!canSubmit}
                                onClick={() => void onComplete()}
                            >
                                {saving ? "⏳" : "✨ Étape suivante"}
                            </UIActionButton>
                        </div>
                    </div>
                </Panel>
            </div>
        </RpgShell>
    );
}
