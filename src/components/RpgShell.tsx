"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";

import CommandPalette from "@/components/CommandPalette";

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
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    rightSlot?: React.ReactNode;
}) {
    return (
        <div className="min-h-dvh bg-slate-950 text-white">
            <div className="relative isolate overflow-hidden min-h-dvh">
                <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            "radial-gradient(1200px 600px at 25% 20%, rgba(129,140,248,0.18), transparent 60%), radial-gradient(900px 500px at 70% 35%, rgba(34,211,238,0.12), transparent 55%), radial-gradient(700px 500px at 55% 80%, rgba(52,211,153,0.10), transparent 55%), linear-gradient(to bottom, rgba(2,6,23,1), rgba(0,0,0,1))",
                    }}
                />
                <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 50% 35%, transparent 35%, rgba(0,0,0,0.55) 75%)",
                    }}
                />
                <CRTNoise strength={0.1} />

                <main className="relative mx-auto max-w-6xl px-6 py-10">
                    {/* Top bar */}
                    <header className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-white/80 ring-1 ring-white/10 transition hover:bg-white/10"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Retour
                            </Link>

                            <div className="hidden sm:flex items-center gap-3">
                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                                    <Sparkles className="h-5 w-5" aria-hidden />
                                </div>
                                <div>
                                    <div className="text-xs tracking-[0.28em] text-white/60">
                                        RPG RENAISSANCE
                                    </div>
                                    <div className="text-sm text-white/90">{title}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">{rightSlot}</div>
                    </header>

                    {/* Title */}
                    <section className="mt-10">
                        <div className="text-xs tracking-[0.22em] text-white/55">CHAPITRE</div>
                        <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-white">
                            {title}
                        </h1>
                        {subtitle ? (
                            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/70">
                                {subtitle}
                            </p>
                        ) : null}
                    </section>

                    {/* Content */}
                    <section
                        className={cn(
                            "mt-8 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-md",
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
                            <span className="hidden sm:inline">
                                Placeholder UI, données plus tard.
                            </span>
                        </div>
                    </div>

                    <CommandPalette />
                </main>
            </div>
        </div>
    );
}
