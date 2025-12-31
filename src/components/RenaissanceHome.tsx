"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// UI
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import RenownScoreboard from "@/components/adventure/RenownScoreboard";

// Stores
import { useGameStore } from "@/stores/gameStore";

// Helpers
import {
    getCurrentAdventureName,
    getCurrentChapterName,
    getCurrentQuestsName,
} from "@/helpers/adventure";
import { useThemeLogo } from "@/helpers/getThemeLogo";

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

export default function RenaissanceHome() {
    const router = useRouter();

    const chapter = useGameStore((s) => s.chapter);
    const loading = useGameStore((s) => s.chapterLoading);
    const bootstrap = useGameStore((s) => s.bootstrap);

    const activeCharacter = useGameStore((s) => s.profile?.character ?? null);

    const logoSrc = useThemeLogo();

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
        void bootstrap();
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

                    <img src={logoSrc} alt="Renaissance" />

                    <h1 className="mt-2 text-5xl font-semibold text-white/95 sm:text-6xl">
                        <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent text-gradient font-main-title">
                            Renaissance
                        </span>
                    </h1>

                    <div className="mt-3 max-w-2xl rpg-text-sm ">
                        🛡️{" "}
                        <span className="text-accent-darker">
                            Ton RPG du quotidien, à la lame douce
                        </span>{" "}
                        🗡️
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

                {/* ✅ Status banner (mobile friendly) */}
                <div className="mt-8">
                    {hasRun && (
                        <Panel>
                            <div
                                className={cn(
                                    "relative overflow-hidden rounded-[22px]",
                                    "bg-black/20 ring-1 ring-white/10"
                                )}
                            >
                                {/* Optional: soft background glow (theme accent) */}
                                <div
                                    className="pointer-events-none absolute inset-0 opacity-60"
                                    style={{
                                        background:
                                            "radial-gradient(900px 380px at 15% 20%, hsl(var(--accent) / 0.16), transparent 60%), radial-gradient(700px 360px at 85% 30%, hsl(var(--accent-2) / 0.14), transparent 55%)",
                                    }}
                                />

                                {/* Optional: adventure illustration (uncomment if you have it) */}
                                {/* <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
                                    <img
                                        src={`/assets/images/adventures/realignement_du_foyer.png`}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        draggable={false}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/90" />
                                </div> */}

                                <div className="relative p-4 sm:p-5 lg:p-6">
                                    <div className="grid gap-4 lg:grid-cols-3 lg:items-center">
                                        {/* LEFT: Adventure (mirrored mini-card) */}
                                        <div className="min-w-0">
                                            <div className="text-[11px] tracking-[0.18em] text-white/55">
                                                🧭 AVENTURE
                                            </div>

                                            <div
                                                className={cn(
                                                    "mt-2 flex items-center gap-3",
                                                    "rounded-3xl bg-black/25 p-3 ring-1 ring-white/10",
                                                    "max-w-full"
                                                )}
                                            >
                                                {/* Infos */}
                                                <div className="min-w-0 flex-1 text-left">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="truncate font-semibold text-white/85">
                                                            🏠 Réalignement du foyer
                                                        </div>

                                                        {/* <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/60 ring-1 ring-white/10">
                                                            En cours
                                                        </span> */}
                                                    </div>

                                                    {/* <div className="mt-1 grid gap-1"> */}
                                                    <div className="mt-0.5 text-xs text-white/65 line-clamp-2">
                                                        {/* 📖{" "}
                                                            <span className="text-white/50">
                                                                Chapitre :
                                                            </span>{" "} */}
                                                        {getCurrentChapterName()}
                                                    </div>

                                                    <div className="mt-1 text-[11px] text-white/40 line-clamp-1">
                                                        {/* 🎯{" "}
                                                            <span className="text-white/45">
                                                                Quête :
                                                            </span>{" "} */}
                                                        {getCurrentQuestsName()}
                                                    </div>
                                                    {/* </div> */}
                                                </div>

                                                {/* Illustration */}
                                                <div className="grid h-18 w-18 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
                                                    <img
                                                        src={`/assets/images/adventures/realignement_du_foyer.png`}
                                                        alt="Réalignement du foyer"
                                                        className="h-full w-full object-cover"
                                                        draggable={false}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* CENTER: CTA + Renown */}
                                        <div className="flex flex-col items-stretch gap-3 lg:items-center lg:justify-center">
                                            <ActionButton
                                                onClick={() => onNavigate("/adventure")}
                                                variant="solid"
                                                className="w-full lg:w-auto"
                                            >
                                                ▶️ Reprendre l&apos;aventure
                                            </ActionButton>

                                            <div className="lg:mt-1">
                                                <RenownScoreboard />
                                            </div>
                                        </div>

                                        {/* RIGHT: Character */}
                                        <div className="min-w-0 lg:text-right">
                                            <div className="text-[11px] tracking-[0.18em] text-white/55">
                                                🧙‍♀️ PERSONNAGE
                                            </div>

                                            <div
                                                className={cn(
                                                    "mt-2 flex items-center gap-3",
                                                    "rounded-3xl bg-black/25 p-3 ring-1 ring-white/10",
                                                    "lg:ml-auto lg:max-w-[360px] lg:justify-end"
                                                )}
                                            >
                                                {/* Avatar */}
                                                <div className="grid h-18 w-18 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
                                                    {activeCharacter?.code ? (
                                                        <img
                                                            src={`/assets/images/characters/${activeCharacter.code}.png`}
                                                            alt={
                                                                activeCharacter.name ?? "Personnage"
                                                            }
                                                            className="h-full w-full object-cover object-top"
                                                            draggable={false}
                                                        />
                                                    ) : (
                                                        <span className="text-xl">
                                                            {activeCharacter?.emoji ?? "🧙"}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Infos */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate font-semibold text-white/85">
                                                        {activeCharacter?.name ??
                                                            "Aucun personnage"}{" "}
                                                        {activeCharacter?.emoji ?? "🧙"}
                                                    </div>

                                                    {activeCharacter?.vibe ? (
                                                        <div className="mt-0.5 text-xs text-white/65 line-clamp-2">
                                                            {activeCharacter.vibe}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-0.5 text-xs text-white/45">
                                                            Choisis une voix dans l’onboarding.
                                                        </div>
                                                    )}

                                                    {activeCharacter?.motto ? (
                                                        <div className="mt-1 text-[11px] text-white/40 line-clamp-1">
                                                            “{activeCharacter.motto}”
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile helper line */}
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/40 lg:hidden">
                                        <span>Astuce : garde ce bouton sous le pouce ✨</span>
                                        <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                                            {activeCharacter ? "MJ prêt" : "MJ à choisir"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Panel>
                    )}
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

                {/* Footer */}
                <div className="mt-20 text-xs text-white/45">
                    <div className="h-px w-full bg-gradient-to-r from-white/0 via-white/15 to-white/0" />
                    <div className="mt-3 flex items-center justify-between">
                        <span>© Renaissance</span>
                        <span className="hidden sm:inline">A game by @iamjulienjulien</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
