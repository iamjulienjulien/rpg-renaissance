"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronRight, X, ScrollText } from "lucide-react";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

import { useGameStore, type Character } from "@/stores/gameStore";
import MasterCard from "@/components/ui/MasterCard";
import { UiAnimatePresence, UiMotionDiv } from "@/components/motion/UiMotion";

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

    // Stores (Game)
    const bootstrap = useGameStore((s) => s.bootstrap);
    const loadingProfile = useGameStore((s) => s.characterLoading);
    const characters = useGameStore((s) => s.characters);
    const profile = useGameStore((s) => s.profile);

    const startAdventure = useGameStore((s) => s.startAdventure);
    const startingAdventure = useGameStore((s) => s.startingAdventure);

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        void bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    "Un grand tri version RPG. Tu cartographies tes pièces, tu poses des quêtes simples, puis tu avances par petites victoires (et tu gagnes de la renommée).",
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
                    "Tu prends le chaos mental, tu le passes au marteau. Résultat: une liste de quêtes nettes, des priorités claires, et un cerveau qui respire.",
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
                    "Planifie un week-end qui compte: quêtes légères, souvenirs, et un peu de ‘loot’ émotionnel. Simple, fun, mémorable.",
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

    const available = useMemo(() => adventures.filter((a) => a.enabled), [adventures]);
    const comingSoon = useMemo(() => adventures.filter((a) => !a.enabled), [adventures]);

    const [selected, setSelected] = useState<AdventureCard>(adventures[0]);
    const [briefingOpen, setBriefingOpen] = useState(false);
    const [rulesOpen, setRulesOpen] = useState(false);

    const startSelected = async () => {
        if (!selected.enabled || startingAdventure) return;

        const result = await startAdventure({
            type_code: selected.code,
            title: selected.title,
            journal: {
                emoji: selected.emoji,
                content: `Tu as choisi: ${selected.emoji} ${selected.title}.`,
            },
        });

        if (!result) return;

        router.push(`/start/adventure/${encodeURIComponent(result.instance_code ?? "")}`);
    };

    const [briefingLoading, setBriefingLoading] = useState(false);
    const [briefingError, setBriefingError] = useState<string | null>(null);
    const [briefingAi, setBriefingAi] = useState<{
        title: string;
        intro: string;
        bullets: string[];
        rules_paragraph: string;
        outro: string;
    } | null>(null);

    useEffect(() => {
        const run = async () => {
            setBriefingLoading(true);
            setBriefingError(null);

            try {
                const info = adventureInfoFromCard(selected);

                const res = await fetch("/api/briefing", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ adventure: info }),
                });

                const json = await res.json().catch(() => null);

                if (!res.ok) {
                    setBriefingError(json?.error ?? "Briefing generation failed");
                    setBriefingAi(null);
                    return;
                }

                setBriefingAi(json?.briefing ?? null);
            } catch (e) {
                setBriefingError(e instanceof Error ? e.message : "Briefing generation failed");
                setBriefingAi(null);
            } finally {
                setBriefingLoading(false);
            }
        };

        void run();
    }, [selected.code, profile?.character_id]); // ✅ update quand tu changes perso

    // Keyboard: Enter -> commencer si enabled, B -> briefing, R -> rules, Esc -> close
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && (briefingOpen || rulesOpen)) {
                e.preventDefault();
                setBriefingOpen(false);
                setRulesOpen(false);
                return;
            }

            if (e.key === "b" || e.key === "B") {
                e.preventDefault();
                setBriefingOpen(true);
                return;
            }

            if (e.key === "r" || e.key === "R") {
                e.preventDefault();
                setRulesOpen(true);
                return;
            }

            if (e.key === "Enter" && selected?.enabled) {
                e.preventDefault();
                void startSelected();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [briefingOpen, rulesOpen, selected, startingAdventure]);

    const AdventureRow = ({ a, idx }: { a: AdventureCard; idx: number }) => {
        const active = selected.code === a.code;
        const disabled = !a.enabled;

        return (
            <UiMotionDiv
                key={a.code}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.03 }}
                className={cn(
                    "w-full rounded-3xl p-4 ring-1 relative overflow-hidden",
                    active ? "bg-black/60 ring-white/25" : "bg-black/25 ring-white/10",
                    !active && !disabled && "hover:bg-black/35 hover:ring-white/15",
                    disabled && "bg-black/15 ring-white/10 opacity-70"
                )}
            >
                {/* 🌫️ Overlay “Bientôt” plus marqué */}
                {disabled ? (
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-40" />
                        <div className="absolute inset-0 bg-black/40" />
                        <div className="absolute left-4 top-4 rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/70 ring-1 ring-white/15">
                            🔒 Bientôt
                        </div>
                        <div className="absolute right-4 top-4 rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/55 ring-1 ring-white/10">
                            👀 En cours de forge
                        </div>
                    </div>
                ) : null}

                <button
                    type="button"
                    onClick={() => setSelected(a)}
                    onDoubleClick={() => a.enabled && startSelected()}
                    className={cn(
                        "w-full text-left outline-none relative",
                        "focus-visible:ring-2 focus-visible:ring-white/25 rounded-2xl",
                        disabled && "cursor-not-allowed"
                    )}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <div className="text-2xl" aria-hidden>
                                    {a.emoji}
                                </div>

                                <div
                                    className={cn(
                                        "font-semibold",
                                        disabled ? "text-white/80" : "text-white/95"
                                    )}
                                >
                                    {a.title}
                                </div>

                                {!disabled ? (
                                    <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-200 ring-1 ring-emerald-400/20">
                                        ✅ Disponible
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/55 ring-1 ring-white/10">
                                        🔒 Verrouillé
                                    </span>
                                )}
                            </div>

                            <div
                                className={cn(
                                    "mt-2 rpg-text-sm",
                                    disabled ? "text-white/55" : "text-white/70"
                                )}
                            >
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

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <ActionButton
                        onClick={() => setBriefingOpen(true)}
                        disabled={startingAdventure}
                    >
                        ✨ Briefing
                    </ActionButton>
                    <ActionButton
                        variant="solid"
                        onClick={startSelected}
                        disabled={disabled || startingAdventure}
                    >
                        {startingAdventure ? "⏳" : "🗡️ Commencer"}
                    </ActionButton>
                </div>
            </UiMotionDiv>
        );
    };

    return (
        <RpgShell
            title="Nouvelle aventure"
            subtitle="Choisis un mode de jeu. Termine des quêtes, gagne de la renommée, monte en niveau."
            rightSlot={
                <div className="flex items-center gap-2">
                    {activeCharacter ? (
                        <Pill>
                            {activeCharacter.emoji} {activeCharacter.name}
                        </Pill>
                    ) : (
                        <Pill>{loadingProfile ? "⏳ Profil..." : "🧙 Aucun personnage"}</Pill>
                    )}

                    <ActionButton onClick={() => setRulesOpen(true)} variant="soft">
                        <ScrollText className="h-4 w-4" /> Règles
                    </ActionButton>

                    <Pill>⌘K</Pill>
                </div>
            }
        >
            <div className="grid gap-4">
                <Panel
                    title="Choisis ton aventure"
                    emoji="🧭"
                    subtitle="Disponible: tu peux jouer maintenant. Bientôt: aperçu, mais verrouillé."
                >
                    {/* ✅ DISPONIBLES */}
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/55">
                            ✅ DISPONIBLES
                        </div>
                        <Pill>{available.length} jouables</Pill>
                    </div>

                    <div className="space-y-3">
                        {available.map((a, idx) => (
                            <AdventureRow key={a.code} a={a} idx={idx} />
                        ))}
                    </div>

                    {/* ✅ BIEN TÔT */}
                    {comingSoon.length ? (
                        <>
                            <div className="mt-6 mb-3 flex items-center justify-between gap-2">
                                <div className="text-xs tracking-[0.18em] text-white/55">
                                    🔒 BIENTÔT
                                </div>
                                <Pill>{comingSoon.length} en préparation</Pill>
                            </div>

                            <div className="space-y-3">
                                {comingSoon.map((a, idx) => (
                                    <AdventureRow key={a.code} a={a} idx={idx + available.length} />
                                ))}
                            </div>
                        </>
                    ) : null}

                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">⌨️ RACCOURCIS</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55">
                            <Pill>⏎ Commencer (si dispo)</Pill>
                            <Pill>B Briefing</Pill>
                            <Pill>R Règles</Pill>
                            <Pill>Esc Fermer</Pill>
                            <Pill>Double-clic: commencer</Pill>
                        </div>
                    </div>
                </Panel>
            </div>

            {/* ✅ Modal Briefing */}
            {mounted
                ? createPortal(
                      <UiAnimatePresence>
                          {briefingOpen ? (
                              <UiMotionDiv
                                  className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                              >
                                  <button
                                      onClick={() => setBriefingOpen(false)}
                                      className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
                                      aria-label="Fermer"
                                  />

                                  <UiMotionDiv
                                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                      transition={{ duration: 0.2 }}
                                      className="relative w-full max-w-xl"
                                  >
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
                                                  {briefingLoading ? (
                                                      <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 rpg-text-sm text-white/60">
                                                          ⏳ Le Maître du Jeu écrit le briefing…
                                                      </div>
                                                  ) : briefingError ? (
                                                      <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 rpg-text-sm text-red-200">
                                                          ⚠️ {briefingError}
                                                      </div>
                                                  ) : briefingAi ? (
                                                      <>
                                                          <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                                              <div className="rpg-text-sm text-white/70">
                                                                  {briefingAi.intro}
                                                              </div>
                                                          </div>

                                                          <div className="mt-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                                              <div className="text-xs tracking-[0.18em] text-white/55">
                                                                  📜 PLAN
                                                              </div>
                                                              <ul className="mt-2 space-y-2 rpg-text-sm text-white/70">
                                                                  {briefingAi.bullets.map((b) => (
                                                                      <li
                                                                          key={b}
                                                                          className="flex gap-2"
                                                                      >
                                                                          <span className="text-white/50">
                                                                              •
                                                                          </span>
                                                                          <span>{b}</span>
                                                                      </li>
                                                                  ))}
                                                              </ul>
                                                          </div>

                                                          <div className="mt-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                                              <div className="text-xs tracking-[0.18em] text-white/55">
                                                                  ⭐ RENOMMÉE
                                                              </div>
                                                              <div className="mt-2 rpg-text-sm text-white/70">
                                                                  {briefingAi.rules_paragraph}
                                                              </div>
                                                          </div>
                                                      </>
                                                  ) : null}
                                              </MasterCard>
                                          </div>

                                          <div className="mt-5 flex flex-col gap-2 px-2 sm:flex-row sm:justify-end">
                                              <ActionButton onClick={() => setBriefingOpen(false)}>
                                                  ↩️ Retour
                                              </ActionButton>

                                              <ActionButton
                                                  variant="solid"
                                                  onClick={startSelected}
                                                  disabled={!selected.enabled || startingAdventure}
                                              >
                                                  {startingAdventure ? "⏳" : "🗡️ Commencer"}
                                              </ActionButton>
                                          </div>
                                      </div>
                                  </UiMotionDiv>
                              </UiMotionDiv>
                          ) : null}
                      </UiAnimatePresence>,
                      document.body
                  )
                : null}

            {/* ✅ Modal Règles (Renown/Score) */}
            {mounted
                ? createPortal(
                      <UiAnimatePresence>
                          {rulesOpen ? (
                              <UiMotionDiv
                                  className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                              >
                                  <button
                                      onClick={() => setRulesOpen(false)}
                                      className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
                                      aria-label="Fermer"
                                  />

                                  <UiMotionDiv
                                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                      transition={{ duration: 0.2 }}
                                      className="relative w-full max-w-xl"
                                  >
                                      <div className="max-h-[85vh] overflow-auto rounded-[28px] bg-white/5 p-4 ring-1 ring-white/15 backdrop-blur-md">
                                          <div className="flex items-start justify-between gap-3 px-2">
                                              <div>
                                                  <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                                      📜 Règles du jeu
                                                  </div>
                                                  <div className="mt-2 text-lg text-white/90">
                                                      ⭐ Renommée & niveaux
                                                  </div>
                                                  <div className="mt-2 text-xs text-white/55">
                                                      Le score est ta progression. Simple, lisible,
                                                      motivant.
                                                  </div>
                                              </div>

                                              <button
                                                  onClick={() => setRulesOpen(false)}
                                                  className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-white/80 ring-1 ring-white/10 transition hover:bg-white/10"
                                                  aria-label="Fermer"
                                              >
                                                  <X className="h-4 w-4" />
                                              </button>
                                          </div>

                                          <div className="mt-4 px-2">
                                              <MasterCard title="Renommée" emoji="⭐">
                                                  <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                                      <div className="rpg-text-sm text-white/70">
                                                          Tu gagnes de la <b>renommée</b> quand tu
                                                          termines des quêtes. Plus la difficulté
                                                          est haute, plus la récompense est
                                                          généreuse.
                                                      </div>
                                                  </div>

                                                  <div className="mt-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                                      <div className="text-xs tracking-[0.18em] text-white/55">
                                                          🧮 CALCUL (simple)
                                                      </div>
                                                      <ul className="mt-2 space-y-2 rpg-text-sm text-white/70">
                                                          <li className="flex gap-2">
                                                              <span className="text-white/50">
                                                                  •
                                                              </span>
                                                              <span>
                                                                  Terminer une quête ={" "}
                                                                  <b>+renommée</b>.
                                                              </span>
                                                          </li>
                                                          <li className="flex gap-2">
                                                              <span className="text-white/50">
                                                                  •
                                                              </span>
                                                              <span>
                                                                  Difficulté 🟢/🟡/🔴 = gain
                                                                  croissant.
                                                              </span>
                                                          </li>
                                                          <li className="flex gap-2">
                                                              <span className="text-white/50">
                                                                  •
                                                              </span>
                                                              <span>
                                                                  Le niveau monte automatiquement
                                                                  selon ta renommée.
                                                              </span>
                                                          </li>
                                                      </ul>
                                                  </div>

                                                  <div className="mt-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                                      <div className="text-xs tracking-[0.18em] text-white/55">
                                                          🎁 POURQUOI C’EST COOL
                                                      </div>
                                                      <div className="mt-2 rpg-text-sm text-white/70">
                                                          La renommée transforme le quotidien en
                                                          progression visible. Tu ne “fais pas juste
                                                          des tâches”: tu montes en puissance, quête
                                                          après quête. ⚔️
                                                      </div>
                                                  </div>
                                              </MasterCard>
                                          </div>

                                          <div className="mt-5 flex flex-col gap-2 px-2 sm:flex-row sm:justify-end">
                                              <ActionButton onClick={() => setRulesOpen(false)}>
                                                  ↩️ Retour
                                              </ActionButton>
                                          </div>
                                      </div>
                                  </UiMotionDiv>
                              </UiMotionDiv>
                          ) : null}
                      </UiAnimatePresence>,
                      document.body
                  )
                : null}
        </RpgShell>
    );
}
