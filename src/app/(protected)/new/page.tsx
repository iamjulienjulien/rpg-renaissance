"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { useJournalStore } from "@/stores/journalStore";

import { useCharacterStore, type Character } from "@/stores/characterStore";
import { useSessionStore } from "@/stores/sessionStore";
import { buildAdventureBriefing } from "@/lib/briefing/adventureBriefing";
import MasterCard from "@/components/ui/MasterCard";

type AdventureCard = {
    code: string;
    title: string;
    description: string;
    emoji: string;
    enabled: boolean;
    tags: Array<{ emoji: string; label: string }>;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function adventureInfoFromCard(a: AdventureCard) {
    // “Neutre”: la personnalité vient du personnage choisi.
    if (a.code === "home_realignment") {
        return {
            code: a.code,
            title: a.title,
            emoji: a.emoji,
            baseGoal: "Ré-aligner ton foyer en transformant chaque pièce en zone de jeu.",
            steps: [
                "Activer les pièces utiles pour l’aventure",
                "Générer ou ajouter des quêtes par pièce",
                "Lancer un chapitre en sélectionnant les quêtes",
                "Jouer les quêtes: démarrer, terminer, abandonner",
            ],
        };
    }

    if (a.code === "mind_forge") {
        return {
            code: a.code,
            title: a.title,
            emoji: a.emoji,
            baseGoal: "Forger un mental net: clarifier, prioriser, exécuter sans brouillard.",
            steps: [
                "Lister les points de friction et les pensées parasites",
                "Transformer en micro-quêtes actionnables",
                "Créer un chapitre ‘Focus’ et exécuter 3 quêtes",
                "Boucler avec un mini journal et un prochain pas",
            ],
        };
    }

    return {
        code: a.code,
        title: a.title,
        emoji: a.emoji,
        baseGoal: "Structurer une aventure du quotidien en chapitres et quêtes jouables.",
        steps: [
            "Définir le contexte et les zones (pièces / lieux / thèmes)",
            "Créer un backlog de quêtes",
            "Démarrer un chapitre",
            "Jouer et consigner les événements",
        ],
    };
}

export default function NewAdventurePage() {
    const router = useRouter();

    const createJournal = useJournalStore((s) => s.create);

    // Stores
    const bootstrap = useCharacterStore((s) => s.bootstrap);
    const loadingProfile = useCharacterStore((s) => s.loading);
    const characters = useCharacterStore((s) => s.characters);
    const profile = useCharacterStore((s) => s.profile);

    const bootstrapSession = useSessionStore((s) => s.bootstrap);
    const activeSessionId = useSessionStore((s) => s.activeSessionId);
    const createAndActivate = useSessionStore((s) => s.createAndActivate);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        void bootstrapSession();
    }, []);

    // ✅ Personnage actif (venant de BDD)
    const activeCharacter: Character | null = useMemo(() => {
        const activeId = profile?.character_id ?? null;
        if (activeId) {
            return (
                characters.find((c) => c.id === activeId) ??
                (profile?.character as Character | null) ??
                null
            );
        }
        return (profile?.character as Character | null) ?? null;
    }, [characters, profile]);

    const adventures: AdventureCard[] = useMemo(() => {
        return [
            {
                code: "home_realignment",
                title: "Réalignement du foyer",
                description:
                    "Pièce par pièce, on remet le quotidien d’équerre. Tu ajustes la carte du foyer, tu poses les quêtes, puis tu lances un chapitre jouable.",
                emoji: "🏠",
                enabled: true,
                tags: [
                    { emoji: "🚪", label: "Pièces" },
                    { emoji: "🧹", label: "Rangement" },
                    { emoji: "🔁", label: "Routines" },
                    { emoji: "🐾", label: "Petits pas" },
                ],
            },
            {
                code: "mind_forge",
                title: "La Forge Mentale",
                description:
                    "Une aventure d’intensité douce: tu transformes le chaos mental en plan clair, et tu avances à coups de micro-victoires.",
                emoji: "🧠",
                enabled: false,
                tags: [
                    { emoji: "🎯", label: "Focus" },
                    { emoji: "🧱", label: "Structure" },
                    { emoji: "🧘", label: "Clarté" },
                    { emoji: "⚙️", label: "Système" },
                ],
            },
            {
                code: "golden_weekend",
                title: "Week-end Doré",
                description:
                    "Une aventure ‘loot & joie’: tu planifies un week-end léger mais mémorable, avec des quêtes simples qui créent du souvenir.",
                emoji: "🌟",
                enabled: false,
                tags: [
                    { emoji: "🗺️", label: "Exploration" },
                    { emoji: "🍜", label: "Plaisirs" },
                    { emoji: "📸", label: "Souvenirs" },
                    { emoji: "⏳", label: "Rythme" },
                ],
            },
        ];
    }, []);

    const [selected, setSelected] = useState<AdventureCard>(adventures[0]);
    const [briefingOpen, setBriefingOpen] = useState(false);

    const startSelected = async () => {
        if (!selected.enabled) return;

        if (!activeSessionId) {
            const sid = await createAndActivate("Ma partie");
            if (!sid) return;
        }

        void createJournal({
            session_id: useSessionStore.getState().activeSessionId!,
            kind: "adventure_created",
            title: "✨ Une aventure commence",
            content: `Tu as choisi: ${selected.emoji} ${selected.title}.`,
        });

        // Placeholder routes futures
        router.push("/adventure/home-realignment");
    };

    const briefing = useMemo(() => {
        const info = adventureInfoFromCard(selected);
        return buildAdventureBriefing(activeCharacter ?? null, info);
    }, [activeCharacter, selected]);

    // Keyboard: Enter -> commencer si enabled, B -> briefing, Esc -> close
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && briefingOpen) {
                e.preventDefault();
                setBriefingOpen(false);
                return;
            }

            if (e.key === "b" || e.key === "B") {
                e.preventDefault();
                setBriefingOpen(true);
                return;
            }

            if (e.key === "Enter" && selected?.enabled) {
                e.preventDefault();
                startSelected();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [briefingOpen, selected]);

    return (
        <RpgShell
            title="Nouvelle aventure"
            subtitle="Choisis un thème. Ensuite: pièces/quêtes (IA) → chapitre → jeu."
            rightSlot={
                <div className="flex items-center gap-2">
                    {activeCharacter ? (
                        <Pill>
                            {activeCharacter.emoji} {activeCharacter.name}
                        </Pill>
                    ) : (
                        <Pill>{loadingProfile ? "⏳ Profil..." : "🧙 Aucun personnage"}</Pill>
                    )}
                    <Pill>⌘K</Pill>
                </div>
            }
        >
            <div className="grid gap-4">
                {/* ✅ Full width card: pas de CTA */}
                <Panel
                    title="Aventures disponibles"
                    emoji="🧭"
                    subtitle="Sélectionne une aventure. ‘Commencer’ lance la préparation. ‘Briefing’ ouvre le futur brief."
                >
                    <div className="space-y-3">
                        {adventures.map((a, idx) => {
                            const active = selected.code === a.code;
                            const disabled = !a.enabled;

                            return (
                                <motion.div
                                    key={a.code}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.18, delay: idx * 0.03 }}
                                    className={cn(
                                        "w-full rounded-3xl p-4 ring-1",
                                        active
                                            ? "bg-black/60 ring-white/25"
                                            : "bg-black/25 ring-white/10 hover:bg-black/35 hover:ring-white/15"
                                    )}
                                >
                                    {/* Item focusable + clickable */}
                                    <button
                                        type="button"
                                        onClick={() => setSelected(a)}
                                        onDoubleClick={() => a.enabled && startSelected()}
                                        className={cn(
                                            "w-full text-left outline-none",
                                            "focus-visible:ring-2 focus-visible:ring-white/25 rounded-2xl"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-2xl" aria-hidden>
                                                        {a.emoji}
                                                    </div>
                                                    <div className="text-white/95 font-semibold">
                                                        {a.title}
                                                    </div>

                                                    {!a.enabled ? (
                                                        <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/55 ring-1 ring-white/10">
                                                            🔒 Bientôt
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-200 ring-1 ring-emerald-400/20">
                                                            ✅ Disponible
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-2 rpg-text-sm text-white/65">
                                                    {a.description}
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {a.tags.map((t) => (
                                                        <Pill key={`${a.code}_${t.label}`}>
                                                            {t.emoji} {t.label}
                                                        </Pill>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-1 flex items-center gap-2">
                                                <ChevronRight
                                                    className={cn(
                                                        "h-5 w-5",
                                                        active ? "text-white/70" : "text-white/35"
                                                    )}
                                                    aria-hidden
                                                />
                                            </div>
                                        </div>
                                    </button>

                                    {/* ✅ Actions */}
                                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                        <ActionButton onClick={() => setBriefingOpen(true)}>
                                            ✨ Briefing
                                        </ActionButton>

                                        <ActionButton
                                            variant="solid"
                                            onClick={startSelected}
                                            disabled={disabled}
                                        >
                                            🗡️ Commencer
                                        </ActionButton>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">⌨️ RACCOURCIS</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55">
                            <Pill>⏎ Commencer (si dispo)</Pill>
                            <Pill>B Briefing</Pill>
                            <Pill>Esc Fermer</Pill>
                            <Pill>Double-clic: commencer</Pill>
                        </div>
                    </div>
                </Panel>
            </div>

            {/* ✅ Modal Briefing */}
            {mounted
                ? createPortal(
                      <AnimatePresence>
                          {briefingOpen ? (
                              <motion.div
                                  className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                              >
                                  {/* overlay */}
                                  <button
                                      onClick={() => setBriefingOpen(false)}
                                      className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
                                      aria-label="Fermer"
                                  />

                                  {/* dialog */}
                                  <motion.div
                                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                      transition={{ duration: 0.2 }}
                                      className="relative w-full max-w-xl"
                                  >
                                      {/* si le contenu dépasse, on scroll à l'intérieur */}
                                      <div className="max-h-[85vh] overflow-auto rounded-[28px] bg-white/5 p-4 ring-1 ring-white/15 backdrop-blur-md">
                                          <div className="flex items-start justify-between gap-3 px-2">
                                              <div>
                                                  <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                                      ✨ Détail de l'aventure
                                                  </div>
                                                  <div className="mt-2 text-lg text-white/90">
                                                      {selected.emoji}{" "}
                                                      <span className="font-semibold">
                                                          {selected.title}
                                                      </span>
                                                  </div>
                                                  {/* <div className="mt-2 text-xs text-white/55">
                                                      Voix:{" "}
                                                      <span className="text-white/75">
                                                          {activeCharacter
                                                              ? `${activeCharacter.emoji} ${activeCharacter.name}`
                                                              : "🧙 Aucun personnage"}
                                                      </span>
                                                  </div> */}
                                              </div>

                                              <button
                                                  onClick={() => setBriefingOpen(false)}
                                                  className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-white/80 ring-1 ring-white/10 transition hover:bg-white/10"
                                                  aria-label="Fermer"
                                              >
                                                  <X className="h-4 w-4" />
                                              </button>
                                          </div>

                                          <div className="mt-4 px-2">
                                              <MasterCard title="Briefing" emoji="✨">
                                                  <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                                      <div className="rpg-text-sm text-white/70">
                                                          {briefing.intro}
                                                      </div>
                                                  </div>

                                                  <div className="mt-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                                      <div className="text-xs tracking-[0.18em] text-white/55">
                                                          📜 PLAN
                                                      </div>
                                                      <ul className="mt-2 space-y-2 rpg-text-sm text-white/70">
                                                          {briefing.bullets.map((b) => (
                                                              <li key={b} className="flex gap-2">
                                                                  <span className="text-white/50">
                                                                      •
                                                                  </span>
                                                                  <span>{b}</span>
                                                              </li>
                                                          ))}
                                                      </ul>
                                                  </div>

                                                  {/* <div className="mt-3 text-xs text-white/50">
                                                      {briefing.outro}
                                                  </div> */}
                                              </MasterCard>
                                          </div>

                                          <div className="mt-5 flex flex-col gap-2 px-2 sm:flex-row sm:justify-end">
                                              <ActionButton onClick={() => setBriefingOpen(false)}>
                                                  ↩️ Retour
                                              </ActionButton>

                                              <ActionButton
                                                  variant="solid"
                                                  onClick={startSelected}
                                                  disabled={!selected.enabled}
                                              >
                                                  🗡️ Commencer
                                              </ActionButton>
                                          </div>
                                      </div>
                                  </motion.div>
                              </motion.div>
                          ) : null}
                      </AnimatePresence>,
                      document.body
                  )
                : null}
        </RpgShell>
    );
}
