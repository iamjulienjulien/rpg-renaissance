"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

import { usePlayerStore } from "@/stores/playerStore";
import { useGameStore } from "@/stores/gameStore";

import { UserContextForm } from "@/components/account/UserContextForm";
import UiActionButton from "@/components/ui/UiActionButton";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function OnboardingIdentityPage() {
    const router = useRouter();

    // Lecture bootstrap (on ne “sauve” rien au fil de l’eau ici)
    const { profile, loading, error, bootstrap } = usePlayerStore();

    // Pour cohérence monde (MJ sélectionné à l’étape 1)
    const charsBootstrap = useGameStore((s) => s.bootstrap);
    const characters = useGameStore((s) => s.characters);
    const selectedId = useGameStore((s) => s.selectedId);

    // ✅ nouvelle action store (à créer ensuite)
    const completeOnboardingIdentity = useGameStore(
        (s) => (s as any).completeOnboardingIdentity
    ) as ((display_name: string, context?: any) => Promise<boolean>) | undefined;

    // Local drafts (pas de save par champ)
    const [nameDraft, setNameDraft] = useState("");

    // (Optionnel) Si tu veux que UserContextForm “remonte” un draft local,
    // tu pourras lui ajouter un callback onChange et stocker ici.
    // Pour l’instant on prépare la place.
    const [contextDraft, setContextDraft] = useState<any>(null);

    // état UI du CTA final
    const [submitting, setSubmitting] = useState(false);
    const busy = loading || submitting;

    useEffect(() => {
        void bootstrap();
        void charsBootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setNameDraft(profile?.display_name ?? "");
    }, [profile?.display_name]);

    const activeCharacterLabel = useMemo(() => {
        const id = selectedId ?? profile?.character_id ?? "";
        const c = characters.find((x) => x.id === id) ?? null;
        return c ? `${c.emoji ?? "🧙"} ${c.name}` : "—";
    }, [characters, selectedId, profile?.character_id]);

    const canStart =
        !!nameDraft.trim() && !busy && typeof completeOnboardingIdentity === "function";

    const onStart = async () => {
        if (!canStart || !completeOnboardingIdentity) return;

        setSubmitting(true);
        try {
            const ok = await completeOnboardingIdentity(nameDraft.trim(), contextDraft);

            if (ok) {
                // prochaine étape (à adapter à ta route)
                router.push("/onboarding/quests");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <RpgShell
            title="Identité"
            subtitle="🪞 Donne un nom au héros… et pose le décor intérieur. ✨"
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
                        className="absolute inset-0 bg-no-repeat bg-position-[right_bottom_-1rem] bg-size-[auto_250px] "
                        style={{
                            backgroundImage: "url('/assets/images/onboarding/identity.png')",
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
                            Nommer le joueur.
                        </h1>

                        <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                            Ton nom d’affichage et tes contextes aident le jeu à te parler juste.
                        </p>
                    </div>
                </div>
                {/* HERO */}

                {error ? (
                    <div className="rounded-2xl bg-red-500/10 p-4 rpg-text-sm text-red-200 ring-1 ring-red-400/20">
                        ⚠️ {error}
                    </div>
                ) : null}

                {/* DISPLAY NAME */}
                <Panel
                    title="Ton nom d’affichage"
                    emoji="👤"
                    subtitle="C’est ainsi que le jeu te nomme dans l’aventure."
                >
                    <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/50">DISPLAY NAME</div>

                        <div className="mt-3">
                            <input
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                placeholder="Ex: Julien, Capitaine du Foyer…"
                                className={cn(
                                    "w-full rounded-2xl bg-black/40 px-4 py-3 text-sm text-white/90",
                                    "ring-1 ring-white/10 outline-none placeholder:text-white/35",
                                    "focus:ring-2 focus:ring-white/20"
                                )}
                                disabled={busy}
                            />
                        </div>

                        <div className="mt-3 text-xs text-white/45">
                            Astuce: un nom simple rend les messages plus naturels.
                        </div>
                    </div>
                </Panel>

                {/* CONTEXTS */}
                <Panel
                    title="Tes contextes"
                    emoji="🧠"
                    subtitle="Ce que le jeu doit savoir pour te guider avec finesse."
                >
                    <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-sm text-white/70">
                            Remplis ce qui t’aide: rythme, contraintes, objectifs, état du moment,
                            environnement… Le MJ s’en sert pour mieux calibrer les quêtes.
                        </div>
                    </div>

                    <div className="mt-4">
                        <UserContextForm
                            mode="draft"
                            value={contextDraft}
                            onChange={(next) => setContextDraft(next)}
                            hideActions
                        />
                    </div>
                </Panel>

                {/* VALIDATION */}
                <Panel
                    title="Sceller le départ"
                    emoji="🏁"
                    subtitle="Tu es prêt. Le monde peut répondre à ton nom."
                >
                    <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                        <div className="rpg-text-sm text-white/70">
                            Joueur:{" "}
                            <b className="text-white/85">
                                {nameDraft.trim() || profile?.display_name || "—"}
                            </b>
                            <br />
                            MJ: <b className="text-white/85">{activeCharacterLabel}</b>
                        </div>

                        <div className="mt-4 flex justify-end">
                            {/* <ActionButton
                                disabled={busy}
                                onClick={() => router.push("/onboarding")}
                            >
                                ↩️ Retour
                            </ActionButton> */}

                            <UiActionButton
                                variant="master"
                                size="xl"
                                disabled={!canStart}
                                onClick={() => void onStart()}
                            >
                                {submitting ? "⏳" : "✨ Étape suivante"}
                            </UiActionButton>
                        </div>

                        {/* {!nameDraft.trim() ? (
                            <div className="mt-3 text-xs text-white/45">
                                Donne un nom d’affichage pour continuer.
                            </div>
                        ) : null}

                        {typeof completeOnboardingIdentity !== "function" ? (
                            <div className="mt-3 text-xs text-white/45">
                                (Action manquante: completeOnboardingIdentity)
                            </div>
                        ) : null} */}
                    </div>
                </Panel>
            </div>
        </RpgShell>
    );
}
