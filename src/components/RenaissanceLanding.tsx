"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

import { useGameStore } from "@/stores/gameStore";

type Chapter = {
    id: string;
    adventure_id: string | null;
    title: string;
    pace: "calme" | "standard" | "intense";
    status: "draft" | "active" | "done";
    created_at: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function paceEmoji(pace: Chapter["pace"]) {
    if (pace === "calme") return "🌙";
    if (pace === "intense") return "🔥";
    return "⚡";
}

function adventureNameFromCode(code?: string | null) {
    if (code === "home_realignment") return "Réalignement du foyer";
    if (code) return code;
    return "Aventure";
}

function adventureEmojiFromCode(code?: string | null) {
    if (code === "home_realignment") return "🏠";
    return "";
}

export default function RenaissanceLanding() {
    const router = useRouter();

    const chapter = useGameStore((s) => s.chapter);
    const loading = useGameStore((s) => s.chapterLoading);
    const loadLatest = useGameStore((s) => s.loadLatestChapter);

    const menu = useMemo(() => {
        return [
            {
                key: "new",
                title: "Nouvelle aventure",
                subtitle: "Choisir un thème, préparer les quêtes",
                emoji: "✨",
                href: "/new",
                disabled: false,
            },
            {
                key: "characters",
                title: "Personnages",
                subtitle: "Choisir ton avatar, le ton du Maître du Jeu",
                emoji: "🧙",
                href: "/characters",
                disabled: false,
            },
            {
                key: "journal",
                title: "Journal",
                subtitle: "Chroniques et traces du chemin",
                emoji: "📖",
                href: "/journal",
                disabled: false,
            },
            {
                key: "inventory",
                title: "Inventaire",
                subtitle: "Objets, ressources, reliques",
                emoji: "🎒",
                href: "/inventory",
                disabled: false,
            },
            {
                key: "account",
                title: "Compte",
                subtitle: "Profil, personnage, session",
                emoji: "👤",
                href: "/account",
                disabled: false,
            },
            {
                key: "settings",
                title: "Réglages",
                subtitle: "Ambiance, clavier, accessibilité",
                emoji: "⚙️",
                href: "/settings",
                disabled: false,
            },
        ];
    }, []);

    useEffect(() => {
        void loadLatest();
    }, []);

    const onNavigate = (href: string) => {
        router.push(href);
    };

    const hasRun = !!chapter?.id;

    return (
        <div className="relative min-h-[calc(100vh-0px)] overflow-hidden">
            {/* ✅ Blue background aura (comme les autres pages) */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_20%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_500px_at_80%_25%,rgba(34,211,238,0.12),transparent_55%),radial-gradient(900px_520px_at_50%_95%,rgba(16,185,129,0.10),transparent_60%)]" />
                <div className="absolute inset-0 bg-black/60" />
            </div>

            <div className="relative mx-auto max-w-6xl px-6 py-10">
                {/* ✅ Top centered title */}
                <div className="flex flex-col items-center text-center">
                    {/* <div className="text-xs tracking-[0.22em] text-white/55">🜁</div> */}

                    <img src="/assets/images/logo-renaissance_cropped.png" alt="Renaissance" />

                    <h1 className="mt-2 text-5xl font-semibold text-white/95 sm:text-6xl">
                        <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent fondamento-regular">
                            Renaissance
                        </span>
                    </h1>

                    <div className="mt-3 max-w-2xl rpg-text-sm text-white/60">
                        🛡️ Ton RPG du quotidien, à la lame douce 🗡️
                    </div>

                    {/* <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                        <Pill>UX first</Pill>
                        <Pill>🧪 Dev</Pill>
                        <button
                            onClick={loadLatest}
                            className="rounded-2xl bg-white/5 px-4 py-2 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-white/10"
                        >
                            🔄 Sync
                        </button>
                    </div> */}
                </div>

                {/* ✅ Status banner (sans raccourcis) */}
                <div className="mt-8">
                    <Panel
                        title={hasRun ? "Aventure détectée" : "Aucune aventure en cours"}
                        emoji={hasRun ? "🧭" : "🕯️"}
                        subtitle={
                            hasRun
                                ? adventureEmojiFromCode((chapter as any)?.adventure_code ?? null) +
                                  " " +
                                  adventureNameFromCode((chapter as any)?.adventure_code ?? null)
                                : "Tu es au seuil du jeu. Clique sur ✨ Nouvelle aventure et choisis 🏠 Réalignement du foyer"
                        }
                        right={
                            hasRun ? (
                                <ActionButton
                                    onClick={() => onNavigate("/adventure")}
                                    variant="solid"
                                >
                                    ▶️ Reprendre l'aventure
                                </ActionButton>
                            ) : (
                                <ActionButton onClick={() => onNavigate("/new")} variant="solid">
                                    ✨ Nouvelle aventure
                                </ActionButton>
                            )
                        }
                    >
                        {loading ? (
                            <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                                ⏳ Lecture de l’état…
                            </div>
                        ) : hasRun ? (
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    {/* <div className="text-xs tracking-[0.22em] text-white/55">
                                            🧭 AVENTURE DÉTECTÉE
                                        </div> */}

                                    {/* <div className="text-lg font-semibold text-white/90">
                                        {adventureEmojiFromCode(
                                            (chapter as any)?.adventure_code ?? null
                                        )}
                                        &nbsp;
                                        {adventureNameFromCode(
                                            (chapter as any)?.adventure_code ?? null
                                        )}
                                    </div> */}

                                    <div className="mt-1 grid gap-1">
                                        <div className="rpg-text-sm text-white/60">
                                            📖 Chapitre en cours : {chapter.title}
                                        </div>
                                        <div className="rpg-text-sm text-white/60">
                                            🎯 Quête en cours :
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </Panel>
                </div>

                {/* ✅ Main menu (sans "Reprendre") */}
                <div className="mt-8">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs tracking-[0.22em] text-white/55">
                            🧭 MENU PRINCIPAL
                        </div>
                        <div className="text-xs text-white/45">
                            {hasRun ? "Aventure en cours" : "Commencer une aventure"}
                        </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        {menu.map((item, idx) => (
                            <motion.button
                                key={item.key}
                                onClick={() => onNavigate(item.href)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                                className={cn(
                                    "w-full rounded-2xl p-4 text-left ring-1 transition-colors",
                                    "bg-black/25 text-white/85 ring-white/10 hover:bg-black/35 hover:ring-white/15"
                                )}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="text-xl" aria-hidden>
                                                {item.emoji}
                                            </div>
                                            <div className="text-white/90 font-semibold">
                                                {item.title}
                                            </div>
                                            {item.key === "new" ? <Pill>Setup</Pill> : null}
                                        </div>
                                        <div className="mt-1 rpg-text-sm text-white/60">
                                            {item.subtitle}
                                        </div>
                                    </div>

                                    <div className="text-xs text-white/50">↪︎</div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Footer note */}
                <div className="mt-8 rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">🧠 NOTE</div>
                    <div className="mt-2 rpg-text-sm text-white/60">
                        Ton flow cible: <span className="text-white/80">Aventure</span> →{" "}
                        <span className="text-white/80">Backlog de quêtes (IA)</span> →{" "}
                        <span className="text-white/80">Chapitre</span> →{" "}
                        <span className="text-white/80">Quêtes jouées</span>.
                    </div>
                </div>
            </div>
        </div>
    );
}
