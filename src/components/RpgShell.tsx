"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import CommandPalette from "@/components/CommandPalette";
import { DevEnvPill } from "@/helpers/dev";
import { useThemeLogo } from "@/helpers/getThemeLogo";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function CRTNoise({ strength = 0.08 }: { strength?: number }) {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
                backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(0,0,0,0.00) 2px, rgba(0,0,0,0.00) 4px), radial-gradient(circle at 15% 15%, rgba(255,255,255,0.10), transparent 40%), radial-gradient(circle at 85% 30%, rgba(255,255,255,0.08), transparent 45%)",
                mixBlendMode: "overlay",
                filter: "contrast(120%) brightness(105%)",
                opacity: strength,
            }}
        />
    );
}

export default function RpgShell({
    title,
    subtitle,
    children,
    rightSlot,
    returnButton = true,
    noRightSlot = false,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    rightSlot?: React.ReactNode;
    returnButton?: boolean;
    noRightSlot?: boolean;
}) {
    const logoSrc = useThemeLogo();

    return (
        <div className="min-h-dvh text-white">
            <div className="relative isolate min-h-dvh overflow-hidden">
                {/* ✅ Background like Home */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_20%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_500px_at_80%_25%,rgba(34,211,238,0.12),transparent_55%),radial-gradient(900px_520px_at_50%_95%,rgba(16,185,129,0.10),transparent_60%)]" />
                    <div className="absolute inset-0 bg-black/60" />
                    <div
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle at 50% 35%, transparent 35%, rgba(0,0,0,0.55) 75%)",
                        }}
                    />
                </div>

                <CRTNoise strength={0.1} />

                <main className="relative mx-auto max-w-6xl px-6 py-10">
                    {/* Top bar */}
                    <header className="flex items-center justify-between gap-4">
                        {returnButton && (
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-white/80 ring-1 ring-white/10 transition hover:bg-white/10"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Retour
                                </Link>
                            </div>
                        )}

                        {!noRightSlot && rightSlot && (
                            <div className="flex items-center gap-2">{rightSlot}</div>
                        )}
                        {!noRightSlot && !rightSlot && (
                            <div className="flex items-center gap-2">
                                <DevEnvPill env={process.env.NEXT_PUBLIC_APP_ENV ?? ""} />
                            </div>
                        )}
                    </header>

                    {/* Brand + Title (more like Home) */}
                    <section className="mt-10">
                        <div className="flex flex-col items-center text-center">
                            <Link
                                href="/"
                                aria-label="Retour à l’accueil"
                                className="group inline-flex"
                            >
                                <img
                                    src={logoSrc}
                                    alt="Renaissance"
                                    className="
                    h-20 w-auto select-none opacity-95
                    transition
                    group-hover:opacity-100
                    group-hover:scale-[1.03]
                "
                                    draggable={false}
                                />
                            </Link>

                            <h1 className="mt-2 text-4xl font-semibold text-white/95 sm:text-5xl">
                                <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent font-main-title text-gradient">
                                    {title}
                                </span>
                            </h1>

                            {subtitle ? (
                                <p className="mt-3 max-w-2xl rpg-text-sm leading-relaxed text-accent-darker">
                                    {subtitle}
                                </p>
                            ) : null}
                        </div>
                    </section>

                    {/* Content */}
                    <section
                        className={cn(
                            "mt-8 rounded-[28px] bg-black/25 ring-1 ring-white/10 backdrop-blur-md",
                            "p-5 sm:p-6"
                        )}
                    >
                        {children}
                    </section>

                    {/* Footer */}
                    <div className="mt-10 text-xs text-white/45">
                        <div className="h-px w-full bg-gradient-to-r from-white/0 via-white/15 to-white/0" />
                        <div className="mt-3 flex items-center justify-between">
                            <span>© Renaissance</span>
                            <span className="hidden sm:inline">A game by @iamjulienjulien</span>
                        </div>
                    </div>

                    <CommandPalette />
                </main>
            </div>
        </div>
    );
}
