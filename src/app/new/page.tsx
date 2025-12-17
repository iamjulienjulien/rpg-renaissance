"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Home, ChevronRight, X, ScrollText, Wand2, Map } from "lucide-react";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

type AdventureCard = {
    code: "home_realignment";
    title: string;
    subtitle: string;
    description: string;
    emoji: string;
    icon: React.ElementType;
    tags: string[];
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function NewAdventurePage() {
    const router = useRouter();

    const adventures: AdventureCard[] = useMemo(() => {
        return [
            {
                code: "home_realignment",
                title: "Réalignement du foyer",
                subtitle: "Pièce par pièce, on remet le quotidien d’équerre.",
                description:
                    "Tu définis d’abord des quêtes (avec l’aide de l’IA), puis tu démarres un chapitre en sélectionnant les quêtes à jouer. Les pièces du foyer servent de carte et de contexte.",
                emoji: "🏠",
                icon: Home,
                tags: ["Pièces", "Rangement", "Routines", "Petits pas"],
            },
        ];
    }, []);

    const [selected, setSelected] = useState<AdventureCard | null>(adventures[0] ?? null);
    const [open, setOpen] = useState(false);

    // Keyboard: Enter opens modal, Esc closes modal
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open) {
                e.preventDefault();
                setOpen(false);
                return;
            }

            if (e.key === "Enter" && !open && selected) {
                e.preventDefault();
                setOpen(true);
                return;
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, selected]);

    const start = () => {
        // Pour l’instant: une seule aventure
        router.push("/adventure/home-realignment");
    };

    return (
        <RpgShell
            title="Nouvelle aventure"
            subtitle="Choisis un thème. Ensuite: quêtes (IA) → chapitre → jeu."
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>✨ Setup</Pill>
                    <Pill>⌘K</Pill>
                </div>
            }
        >
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Panel
                    title="Aventure disponible"
                    emoji="🧭"
                    subtitle="Une aventure à la fois, bien sculptée."
                    right={
                        <ActionButton onClick={() => setOpen(true)} variant="solid">
                            🗝️ Ouvrir
                        </ActionButton>
                    }
                >
                    <div className="space-y-3">
                        {adventures.map((a) => {
                            const Icon = a.icon;
                            const active = selected?.code === a.code;

                            return (
                                <button
                                    key={a.code}
                                    onClick={() => setSelected(a)}
                                    onDoubleClick={() => setOpen(true)}
                                    className={cn(
                                        "w-full rounded-2xl p-4 text-left ring-1 transition-colors",
                                        active
                                            ? "bg-black/60 ring-white/25"
                                            : "bg-black/25 ring-white/10 hover:bg-black/35"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                                                <Icon
                                                    className="h-5 w-5 text-white/90"
                                                    aria-hidden
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-white/95">
                                                        {a.emoji}{" "}
                                                        <span className="font-semibold">
                                                            {a.title}
                                                        </span>
                                                    </div>
                                                    <Pill>Entrée</Pill>
                                                </div>
                                                <div className="mt-1 text-sm text-white/65">
                                                    {a.subtitle}
                                                </div>
                                            </div>
                                        </div>

                                        <ChevronRight
                                            className={cn(
                                                "h-5 w-5",
                                                active ? "text-white/70" : "text-white/35"
                                            )}
                                        />
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {a.tags.map((t) => (
                                            <Pill key={t}>🏷️ {t}</Pill>
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">⌨️ RACCOURCIS</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55">
                            <Pill>⏎ Ouvrir</Pill>
                            <Pill>Esc Fermer</Pill>
                            <Pill>Double-clic: ouvrir</Pill>
                        </div>
                    </div>
                </Panel>

                <div className="space-y-4">
                    <Panel
                        title="Déroulé"
                        emoji="🗺️"
                        subtitle="L’ordre du jeu (comme tu l’as défini)."
                    >
                        <div className="space-y-2">
                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                <div className="text-xs text-white/60">
                                    1) 🧠 Définir les quêtes
                                </div>
                                <div className="mt-1 text-sm text-white/70">
                                    Avec l’aide de l’IA: suggestions, reformulations, découpage.
                                </div>
                            </div>

                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                <div className="text-xs text-white/60">
                                    2) 📚 Commencer un chapitre
                                </div>
                                <div className="mt-1 text-sm text-white/70">
                                    Tu choisis les quêtes à intégrer dans le chapitre (IA possible).
                                </div>
                            </div>

                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                <div className="text-xs text-white/60">3) 🗡️ Jouer</div>
                                <div className="mt-1 text-sm text-white/70">
                                    Un chapitre = un set de quêtes actionnables. Progression +
                                    journal.
                                </div>
                            </div>
                        </div>
                    </Panel>

                    <Panel
                        title="Indice"
                        emoji="🔮"
                        subtitle="L’IA arrive juste après la structure."
                        right={
                            <ActionButton onClick={() => setOpen(true)}>
                                ✨ Voir le briefing
                            </ActionButton>
                        }
                    >
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 text-sm text-white/70">
                            On branche d’abord: Aventure → Backlog → Chapitre → Quêtes du chapitre.
                            Ensuite l’IA devient le MJ: propose, adapte, raconte.
                        </div>
                    </Panel>
                </div>
            </div>

            <AnimatePresence>
                {open && selected ? (
                    <motion.div
                        className="fixed inset-0 z-[90]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
                            aria-label="Fermer"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 14, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2"
                        >
                            <div className="rounded-[28px] bg-white/5 p-4 ring-1 ring-white/15 backdrop-blur-md">
                                <div className="flex items-start justify-between gap-3 px-2">
                                    <div>
                                        <div className="text-xs tracking-[0.22em] text-white/55">
                                            🗝️ BRIEFING D’AVENTURE
                                        </div>
                                        <div className="mt-2 text-lg text-white/90">
                                            {selected.emoji}{" "}
                                            <span className="font-semibold">{selected.title}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setOpen(false)}
                                        className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-white/80 ring-1 ring-white/10 transition hover:bg-white/10"
                                        aria-label="Fermer"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="mt-3 px-2 text-sm text-white/70">
                                    {selected.description}
                                </div>

                                <div className="mt-4 grid gap-2 px-2">
                                    <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                        <div className="flex items-center gap-2 text-white/85">
                                            <Wand2 className="h-4 w-4" /> 🧠 Phase 1: définir les
                                            quêtes (IA)
                                        </div>
                                        <div className="mt-2 text-sm text-white/60">
                                            Suggestions par pièce, reformulation, découpage en
                                            actions simples.
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                        <div className="flex items-center gap-2 text-white/85">
                                            <ScrollText className="h-4 w-4" /> 📚 Phase 2: commencer
                                            un chapitre
                                        </div>
                                        <div className="mt-2 text-sm text-white/60">
                                            Sélection guidée des quêtes à intégrer au chapitre.
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                        <div className="flex items-center gap-2 text-white/85">
                                            <Map className="h-4 w-4" /> 🗺️ Pièces du foyer
                                        </div>
                                        <div className="mt-2 text-sm text-white/60">
                                            On te propose une liste de pièces (tu peux l’ajuster),
                                            puis l’IA s’y cale.
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-col gap-2 px-2 sm:flex-row sm:justify-end">
                                    <ActionButton onClick={() => setOpen(false)}>
                                        ↩️ Retour
                                    </ActionButton>

                                    <ActionButton variant="solid" onClick={start}>
                                        🗡️ Commencer la préparation
                                    </ActionButton>
                                </div>

                                <div className="mt-3 px-2 text-xs text-white/45">
                                    Astuce: ⌘K ouvre la Command Palette.
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </RpgShell>
    );
}
