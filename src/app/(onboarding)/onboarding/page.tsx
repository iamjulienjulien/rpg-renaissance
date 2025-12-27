// src/app/(onboarding)/onboarding/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import CharacterGrid from "@/components/CharacterGrid";
import { useGameStore } from "@/stores/gameStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function OnboardingPage() {
    const bootstrap = useGameStore((s) => s.bootstrap);

    const characters = useGameStore((s) => s.characters);
    const profile = useGameStore((s) => s.profile);

    const loading = useGameStore((s) => s.characterLoading || s.loading);
    const saving = useGameStore((s) => s.saving);
    const error = useGameStore((s) => s.error);

    // ✅ ta fonction unique
    const completeOnboarding = useGameStore((s) => (s as any).completeOnboarding) as
        | ((input: { display_name: string; character_id: string }) => Promise<boolean>)
        | undefined;

    const [displayName, setDisplayName] = useState("");
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // si l'utilisateur a déjà un profil (cas rare), préremplir
        if (profile?.display_name) setDisplayName(profile.display_name);
        if (profile?.character_id) setSelectedCharacterId(profile.character_id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.display_name, profile?.character_id]);

    const activeCharacterId = selectedCharacterId ?? profile?.character_id ?? null;

    const selectedCharacter = useMemo(() => {
        return characters.find((c) => c.id === activeCharacterId) ?? null;
    }, [characters, activeCharacterId]);

    const canSubmit =
        displayName.trim().length >= 2 &&
        !!activeCharacterId &&
        !loading &&
        !saving &&
        typeof completeOnboarding === "function";

    const onSelectCharacter = (characterId: string) => {
        setSelectedCharacterId(characterId);
        // ❗ pas de persist immédiate: l'onboarding se fait en 1 seule action
    };

    const onComplete = async () => {
        if (typeof completeOnboarding !== "function") {
            console.error("completeOnboarding() missing in gameStore");
            return;
        }
        const dn = displayName.trim();
        const cid = activeCharacterId;

        if (dn.length < 2 || !cid) return;

        const ok = await completeOnboarding({
            display_name: dn,
            character_id: cid,
        });

        if (ok) {
            // ✅ redirection vers la home privée ("/")
            window.location.href = "/";
        }
    };

    return (
        <RpgShell title="Onboarding">
            <div className="grid gap-4">
                {/* HERO */}
                <div
                    className={cn(
                        "rounded-[28px] p-6 sm:p-8 ring-1",
                        "bg-black/30 ring-white/10",
                        "relative overflow-hidden"
                    )}
                >
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                "radial-gradient(900px 500px at 18% 12%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(700px 500px at 82% 40%, rgba(255,255,255,0.05), transparent 55%)",
                        }}
                    />

                    <div className="relative">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                <Pill>🕯️ Profil joueur</Pill>
                                <Pill>🎭 Maître du Jeu</Pill>
                                <Pill>🏷️ Nom en jeu</Pill>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Renaissance
                            </div>

                            <h1 className="mt-2 font-main-title text-3xl sm:text-4xl text-white/95 leading-tight">
                                Forge ton identité.
                            </h1>

                            <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                                Deux choix seulement: ton <b>nom en jeu</b> et la voix de ton{" "}
                                <b>Maître du Jeu</b>.
                            </p>
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-2xl bg-red-500/10 p-4 rpg-text-sm text-red-200 ring-1 ring-red-400/20">
                        ⚠️ {error}
                    </div>
                ) : null}

                {/* DISPLAY NAME */}
                <Panel
                    title="Nom en jeu"
                    emoji="🏷️"
                    subtitle="C’est le nom utilisé dans l’univers Renaissance."
                >
                    <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                        <label className="grid gap-2">
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Display name
                            </div>
                            <input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Ex: Julien le Réparateur"
                                className={cn(
                                    "rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/90",
                                    "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                    "focus:ring-2 focus:ring-white/25"
                                )}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && canSubmit) void onComplete();
                                }}
                            />
                        </label>

                        <div className="mt-2 text-xs text-white/45">
                            (Le display_name est créé pendant l’onboarding, en une seule action.)
                        </div>
                    </div>
                </Panel>

                {/* CHARACTER PICK */}
                <Panel
                    title="Choisis ton Maître du Jeu"
                    emoji="🎭"
                    subtitle="Clique un blason pour le sélectionner. Rien n’est envoyé tant que tu n’as pas validé."
                    right={
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/65 ring-1 ring-white/10">
                                {characters.length} persos
                            </span>
                        </div>
                    }
                >
                    {loading && characters.length === 0 ? (
                        <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                            ⏳ Chargement des personnages…
                        </div>
                    ) : characters.length === 0 ? (
                        <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                            Aucun personnage trouvé. Vérifie le seed en BDD.
                        </div>
                    ) : (
                        <>
                            <CharacterGrid
                                characters={characters}
                                activeCharacterId={activeCharacterId}
                                disabled={saving}
                                onSelect={(c) => onSelectCharacter(c.id)}
                            />

                            <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                <div className="text-xs tracking-[0.18em] text-white/55">
                                    🔮 SÉLECTION
                                </div>
                                <div className="mt-2 rpg-text-sm text-white/60">
                                    {selectedCharacter ? (
                                        <>
                                            Actuel:{" "}
                                            <b className="text-white/80">
                                                {selectedCharacter.emoji} {selectedCharacter.name}
                                            </b>
                                            {" · "}
                                            <span className="text-white/55">
                                                {selectedCharacter.vibe}
                                            </span>
                                        </>
                                    ) : (
                                        "Choisis un personnage pour définir la voix du jeu."
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </Panel>

                {/* VALIDATION */}
                <Panel
                    title="Valider"
                    emoji="🏁"
                    subtitle="Une seule action: création du profil + choix du MJ."
                >
                    <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                        <div className="rpg-text-sm text-white/70">
                            Nom en jeu:{" "}
                            <b className="text-white/85">
                                {displayName.trim() ? displayName.trim() : "—"}
                            </b>
                            <br />
                            Maître du jeu:{" "}
                            <b className="text-white/85">
                                {selectedCharacter
                                    ? `${selectedCharacter.emoji} ${selectedCharacter.name}`
                                    : "—"}
                            </b>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 justify-end">
                            <ActionButton
                                variant="master"
                                hint="OK"
                                disabled={!canSubmit}
                                onClick={() => void onComplete()}
                            >
                                {saving ? "⏳" : "✨ Terminer l’onboarding"}
                            </ActionButton>
                        </div>

                        {typeof completeOnboarding !== "function" ? (
                            <div className="mt-3 text-xs text-amber-200/80">
                                ⚠️ `completeOnboarding` n’existe pas (encore) dans `gameStore`.
                                Ajoute-la et je rebranche sans toucher à l’UI.
                            </div>
                        ) : null}
                    </div>
                </Panel>
            </div>
        </RpgShell>
    );
}
