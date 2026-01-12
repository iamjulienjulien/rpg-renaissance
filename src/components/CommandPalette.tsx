"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/stores/uiStore";
import { ActionButton, Pill } from "@/components/RpgUi";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function CommandPalette() {
    const router = useRouter();
    const open = useUiStore((s) => s.commandPaletteOpen);
    const close = useUiStore((s) => s.closeCommandPalette);

    if (!open) return null;

    const go = (href: string) => {
        close();
        router.push(href);
    };

    return (
        <div className="fixed inset-0 z-50">
            <button
                className="absolute inset-0 bg-black/60"
                onClick={close}
                aria-label="Close palette"
            />

            <div className="absolute left-1/2 top-24 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 rounded-3xl bg-black/70 p-4 ring-1 ring-white/15 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2">
                    <div className="rpg-text-sm text-white/80">
                        ⌘K Command Palette
                        <span className="ml-2 text-xs text-white/50">Esc pour fermer</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Pill>Dev</Pill>
                        <ActionButton onClick={close}>✖</ActionButton>
                    </div>
                </div>

                <div className="mt-4 grid gap-2">
                    {[
                        { label: "🏠 Menu principal", href: "/" },
                        { label: "✨ Aventure", href: "/adventure" },
                        { label: "🧙 Personnages", href: "/characters" },
                        { label: "📖 Journal", href: "/journal" },
                        { label: "🎒 Inventaire", href: "/inventory" },
                        { label: "👤 Compte", href: "/account" },
                        { label: "⚙️ Réglages", href: "/settings" },
                    ].map((it) => (
                        <button
                            key={it.href}
                            onClick={() => go(it.href)}
                            className={cn(
                                "w-full rounded-2xl bg-white/5 px-4 py-3 text-left rpg-text-sm text-white/80 ring-1 ring-white/10",
                                "hover:bg-white/10 hover:ring-white/15 transition"
                            )}
                        >
                            {it.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
