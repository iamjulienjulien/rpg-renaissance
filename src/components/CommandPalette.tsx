"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Command = {
    id: string;
    title: string;
    subtitle?: string;
    emoji?: string;
    keywords?: string[];
    href?: string;
    action?: () => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function normalize(s: string) {
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

export default function CommandPalette() {
    const router = useRouter();
    const pathname = usePathname();

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement | null>(null);

    const commands: Command[] = useMemo(() => {
        const nav: Command[] = [
            {
                id: "home",
                title: "Accueil",
                subtitle: "Retour au menu principal",
                emoji: "🏠",
                keywords: ["home", "accueil", "menu", "start"],
                href: "/",
            },
            {
                id: "new",
                title: "Nouvelle aventure",
                subtitle: "Ouvrir un nouveau chapitre",
                emoji: "✨",
                keywords: ["nouvelle", "new", "chapitre", "start"],
                href: "/new",
            },
            {
                id: "quests",
                title: "Quêtes",
                subtitle: "Voir tes missions",
                emoji: "📜",
                keywords: ["quetes", "quêtes", "missions", "todo", "tasks"],
                href: "/quests",
            },
            {
                id: "journal",
                title: "Journal",
                subtitle: "Chroniques et événements",
                emoji: "📖",
                keywords: ["journal", "chroniques", "events", "événements"],
                href: "/journal",
            },
            {
                id: "inventory",
                title: "Inventaire",
                subtitle: "Objets, ressources, reliques",
                emoji: "🎒",
                keywords: ["inventaire", "inventory", "objets", "loot"],
                href: "/inventory",
            },
            {
                id: "settings",
                title: "Réglages",
                subtitle: "Ambiance, clavier, accessibilité",
                emoji: "⚙️",
                keywords: ["settings", "réglages", "options", "prefs"],
                href: "/settings",
            },
        ];

        const actions: Command[] = [
            {
                id: "toggle-focus",
                title: "Mode focus",
                subtitle: "Bientôt: switch global (placeholder)",
                emoji: "🧘",
                keywords: ["focus", "mode", "calme"],
                action: () => console.log("🧘 TOGGLE_FOCUS (placeholder)"),
            },
            {
                id: "toggle-sound",
                title: "Son",
                subtitle: "Bientôt: activer/désactiver (placeholder)",
                emoji: "🔊",
                keywords: ["sound", "son", "audio", "mute"],
                action: () => console.log("🔊 TOGGLE_SOUND (placeholder)"),
            },
        ];

        return [...nav, ...actions];
    }, []);

    const filtered = useMemo(() => {
        const q = normalize(query.trim());
        if (!q) return commands;

        return commands.filter((c) => {
            const hay = [c.title, c.subtitle ?? "", c.emoji ?? "", ...(c.keywords ?? [])]
                .map(normalize)
                .join(" ");

            return hay.includes(q);
        });
    }, [commands, query]);

    const close = () => {
        setOpen(false);
        setQuery("");
        setActiveIndex(0);
    };

    const run = (cmd: Command) => {
        if (cmd.action) cmd.action();
        if (cmd.href) router.push(cmd.href);
        close();
    };

    // Open / close shortcuts
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const isK = e.key.toLowerCase() === "k";
            const meta = e.metaKey || e.ctrlKey;

            if (meta && isK) {
                e.preventDefault();
                setOpen((v) => !v);
                return;
            }

            if (!open) return;

            if (e.key === "Escape") {
                e.preventDefault();
                close();
                return;
            }

            if (e.key === "ArrowDown" || e.key === "j") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
                return;
            }

            if (e.key === "ArrowUp" || e.key === "k") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
                return;
            }

            if (e.key === "Home") {
                e.preventDefault();
                setActiveIndex(0);
                return;
            }

            if (e.key === "End") {
                e.preventDefault();
                setActiveIndex(Math.max(filtered.length - 1, 0));
                return;
            }

            if (e.key === "Enter") {
                e.preventDefault();
                const cmd = filtered[activeIndex];
                if (cmd) run(cmd);
                return;
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, filtered, activeIndex]);

    // Autofocus search when opened
    useEffect(() => {
        if (!open) return;
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [open]);

    // Reset selected index when query changes
    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    // Nice-to-have: highlight current route
    const currentRouteHint = useMemo(() => {
        if (pathname === "/") return "🏠 Accueil";
        if (pathname === "/new") return "✨ Nouvelle aventure";
        if (pathname === "/quests") return "📜 Quêtes";
        if (pathname === "/journal") return "📖 Journal";
        if (pathname === "/inventory") return "🎒 Inventaire";
        if (pathname === "/settings") return "⚙️ Réglages";
        return "🗺️ Exploration";
    }, [pathname]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100]">
            <button
                aria-label="Fermer la palette"
                onClick={close}
                className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            />

            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2">
                <div className="rounded-[28px] bg-white/5 p-4 ring-1 ring-white/15 backdrop-blur-md outline-none">
                    <div className="flex items-center justify-between gap-3 px-2">
                        <div className="text-xs tracking-[0.22em] text-white/55">
                            🧠 COMMAND PALETTE
                        </div>
                        <div className="text-xs text-white/55">
                            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                                ⌘K / Ctrl+K
                            </span>
                        </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-black/30 ring-1 ring-white/10">
                        <div className="flex items-center gap-2 px-4 py-3">
                            <span className="text-white/60">🔎</span>
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={`Rechercher… (ici: ${currentRouteHint})`}
                                className="w-full bg-transparent text-sm text-white/90 placeholder:text-white/40 outline-none"
                            />
                            <span className="text-xs text-white/40">Esc</span>
                        </div>
                    </div>

                    <div className="mt-3 max-h-[52vh] overflow-auto rounded-2xl bg-black/20 ring-1 ring-white/10">
                        {filtered.length === 0 ? (
                            <div className="p-6 text-sm text-white/60">
                                Aucun résultat. Essaie “quêtes”, “journal”, “inventaire”… 🧩
                            </div>
                        ) : (
                            <div className="p-2">
                                {filtered.map((cmd, i) => {
                                    const active = i === activeIndex;
                                    return (
                                        <button
                                            key={cmd.id}
                                            onMouseEnter={() => setActiveIndex(i)}
                                            onClick={() => run(cmd)}
                                            className={cn(
                                                "w-full rounded-2xl px-4 py-3 text-left ring-1 transition-colors",
                                                active
                                                    ? "bg-black/60 ring-white/25"
                                                    : "bg-black/15 ring-white/10 hover:bg-black/30"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-xl" aria-hidden>
                                                        {cmd.emoji ?? "✨"}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-white/90">
                                                            {cmd.title}
                                                        </div>
                                                        {cmd.subtitle ? (
                                                            <div className="text-xs text-white/55">
                                                                {cmd.subtitle}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="text-xs text-white/45">
                                                    {cmd.href ? "↪︎" : "⤴︎"}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-white/50">
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                                ⬆️⬇️ / j k
                            </span>
                            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                                ⏎ valider
                            </span>
                            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                                Esc fermer
                            </span>
                        </div>
                        <div className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                            🧪 Placeholder actions incluses
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
