// app/admin/layout.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { clientEnv } from "@/lib/env/client";

/* ============================================================================
🧠 ADMIN LAYOUT
- Sidebar + Topbar
- Dark mode persistant (localStorage)
- Pas de gestion de droits (pour l'instant)
============================================================================ */

const LS_THEME_KEY = "rpg_admin_theme";
type AdminTheme = "dark" | "light";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function useAdminTheme() {
    const [theme, setTheme] = useState<AdminTheme>("dark");

    useEffect(() => {
        try {
            const saved = (localStorage.getItem(LS_THEME_KEY) as AdminTheme | null) ?? "dark";
            setTheme(saved);
        } catch {}
    }, []);

    useEffect(() => {
        if (typeof document === "undefined") return;

        // On applique un data attr pour stylage global (sans dépendre de Tailwind dark:)
        document.documentElement.setAttribute("data-admin-theme", theme);

        try {
            localStorage.setItem(LS_THEME_KEY, theme);
        } catch {}
    }, [theme]);

    return {
        theme,
        isDark: theme === "dark",
        toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
        setTheme,
    };
}

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1 transition",
                "ring-white/10 hover:ring-white/20",
                isDark
                    ? "bg-white/5 text-white/85 hover:bg-white/10"
                    : "bg-black/5 text-black/80 hover:bg-black/10 ring-black/10 hover:ring-black/20"
            )}
            aria-label="Toggle theme"
            title="Basculer le thème"
        >
            <span className="text-base">{isDark ? "🌙" : "☀️"}</span>
            <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
        </button>
    );
}

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs ring-1 ring-white/10 bg-white/5 text-white/75">
            {children}
        </span>
    );
}

function SidebarLink({
    href,
    label,
    emoji,
    active,
    onClick,
}: {
    href: string;
    label: string;
    emoji: string;
    active: boolean;
    onClick?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm ring-1 transition",
                "ring-white/10 hover:ring-white/20",
                active ? "bg-white/10 text-white" : "bg-white/0 text-white/75 hover:bg-white/5"
            )}
        >
            <span className="text-base">{emoji}</span>
            <span className="truncate">{label}</span>
        </Link>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const theme = useAdminTheme();

    const nav = useMemo(
        () => [
            { href: "/admin", label: "Dashboard", emoji: "📊", active: true },
            { href: "/admin?tab=ai", label: "IA: Générations", emoji: "🧠", active: true },
            { href: "/admin?tab=users", label: "Utilisateurs", emoji: "👤", active: true },
            { href: "/admin?tab=sessions", label: "Sessions", emoji: "🧩", active: true },
            { href: "/admin?tab=adventures", label: "Aventures", emoji: "🧭", active: true },
            { href: "/admin?tab=chapters", label: "Chapitres", emoji: "📚", active: true },
            { href: "/admin?tab=quests", label: "Quêtes", emoji: "📜", active: true },
            { href: "/admin?tab=journal", label: "Journal", emoji: "📝", active: false },
            { href: "/admin?tab=health", label: "Santé / Debug", emoji: "🛠️", active: false },
        ],
        []
    );

    // Styles globaux basés sur data-admin-theme
    // (On évite Tailwind dark: si ton projet n'est pas configuré pour)
    const shellBg = theme.isDark ? "bg-[#07070a]" : "bg-[#f6f7fb]";
    const shellText = theme.isDark ? "text-white" : "text-black";
    const panelBg = theme.isDark ? "bg-white/5" : "bg-black/5";
    const ring = theme.isDark ? "ring-white/10" : "ring-black/10";
    const topbarBg = theme.isDark ? "bg-black/35" : "bg-white/60";

    return (
        <div className={cn("min-h-screen", shellBg, shellText)}>
            {/* Background décor */}
            <div
                className={cn(
                    "pointer-events-none fixed inset-0 opacity-60",
                    theme.isDark
                        ? "bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(130,255,200,0.08),transparent_45%),radial-gradient(circle_at_30%_90%,rgba(120,160,255,0.06),transparent_50%)]"
                        : "bg-[radial-gradient(circle_at_20%_10%,rgba(0,0,0,0.06),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(0,120,90,0.08),transparent_45%),radial-gradient(circle_at_30%_90%,rgba(30,60,160,0.08),transparent_50%)]"
                )}
            />

            <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 md:grid-cols-[280px_1fr] md:gap-5 md:p-6">
                {/* Sidebar */}
                <aside className={cn("rounded-[28px] p-4 ring-1 backdrop-blur-md", panelBg, ring)}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div
                                className={cn(
                                    "text-xs tracking-[0.22em] uppercase",
                                    theme.isDark ? "text-white/50" : "text-black/50"
                                )}
                            >
                                Renaissance
                            </div>
                            <div
                                className={cn(
                                    "mt-1 text-lg font-semibold",
                                    theme.isDark ? "text-white/90" : "text-black/90"
                                )}
                            >
                                Admin Console
                            </div>
                            {/* <div
                                className={cn(
                                    "mt-1 text-sm",
                                    theme.isDark ? "text-white/55" : "text-black/55"
                                )}
                            >
                                Monitoring, IA, données, debug.
                            </div> */}
                        </div>

                        <ThemeToggle isDark={theme.isDark} onToggle={theme.toggle} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <Badge>env: {clientEnv.appEnv ?? ""}</Badge>
                        <Badge>auth: off</Badge>
                        <Badge>v: {clientEnv.appVersion ?? ""}</Badge>
                    </div>

                    <div className="mt-5 space-y-2">
                        {nav.map((item) => (
                            <SidebarLink
                                key={item.href}
                                href={item.href}
                                label={item.label}
                                emoji={item.emoji}
                                active={
                                    pathname === "/admin" &&
                                    (item.href === "/admin" ||
                                        (item.href.includes("?tab=") &&
                                            new URLSearchParams(item.href.split("?")[1]).get(
                                                "tab"
                                            ) != null)) &&
                                    item.active
                                }
                            />
                        ))}
                    </div>

                    {/* <div
                        className={cn(
                            "mt-5 rounded-2xl p-3 ring-1",
                            ring,
                            theme.isDark ? "bg-black/25" : "bg-white/70"
                        )}
                    >
                        <div
                            className={cn(
                                "text-sm font-semibold",
                                theme.isDark ? "text-white/85" : "text-black/85"
                            )}
                        >
                            ⚠️ Note
                        </div>
                        <div
                            className={cn(
                                "mt-1 text-xs leading-relaxed",
                                theme.isDark ? "text-white/60" : "text-black/60"
                            )}
                        >
                            Cette console utilise des fake data. On branchera Supabase et les droits
                            ensuite.
                        </div>
                    </div> */}
                </aside>

                {/* Main */}
                <main className="min-w-0">
                    {/* Topbar */}
                    <div
                        className={cn(
                            "sticky top-3 z-10 rounded-[28px] p-4 ring-1 backdrop-blur-md",
                            topbarBg,
                            ring
                        )}
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <div
                                    className={cn(
                                        "text-xs tracking-[0.22em] uppercase",
                                        theme.isDark ? "text-white/50" : "text-black/50"
                                    )}
                                >
                                    Back-office
                                </div>
                                <div
                                    className={cn(
                                        "mt-1 text-lg font-semibold",
                                        theme.isDark ? "text-white/90" : "text-black/90"
                                    )}
                                >
                                    /admin
                                </div>
                            </div>

                            {/* <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    className={cn(
                                        "rounded-2xl px-3 py-2 text-sm ring-1 transition",
                                        theme.isDark
                                            ? "bg-white/5 text-white/80 ring-white/10 hover:bg-white/10 hover:ring-white/20"
                                            : "bg-black/5 text-black/80 ring-black/10 hover:bg-black/10 hover:ring-black/20"
                                    )}
                                >
                                    🔄 Refresh (fake)
                                </button>

                                <button
                                    type="button"
                                    className={cn(
                                        "rounded-2xl px-3 py-2 text-sm ring-1 transition",
                                        theme.isDark
                                            ? "bg-emerald-400/10 text-emerald-200 ring-emerald-400/20 hover:bg-emerald-400/15"
                                            : "bg-emerald-600/10 text-emerald-800 ring-emerald-600/20 hover:bg-emerald-600/15"
                                    )}
                                >
                                    ✅ Run healthcheck (fake)
                                </button>

                                <button
                                    type="button"
                                    className={cn(
                                        "rounded-2xl px-3 py-2 text-sm ring-1 transition",
                                        theme.isDark
                                            ? "bg-rose-400/10 text-rose-200 ring-rose-400/20 hover:bg-rose-400/15"
                                            : "bg-rose-600/10 text-rose-800 ring-rose-600/20 hover:bg-rose-600/15"
                                    )}
                                >
                                    🧨 Clear caches (fake)
                                </button>
                            </div> */}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mt-4">{children}</div>

                    {/* Footer */}
                    {/* <div className={cn("mt-6 rounded-[28px] p-4 ring-1", panelBg, ring)}>
                        <div
                            className={cn(
                                "text-sm font-semibold",
                                theme.isDark ? "text-white/85" : "text-black/85"
                            )}
                        >
                            ✳️ Admin Console
                        </div>
                        <div
                            className={cn(
                                "mt-1 text-xs",
                                theme.isDark ? "text-white/55" : "text-black/55"
                            )}
                        >
                            Objectif: observer, diagnostiquer, et itérer vite. Plus tard: droits +
                            vraies stats + exports.
                        </div>
                    </div> */}
                </main>
            </div>
        </div>
    );
}

/* ============================================================================
🧩 clsx minimal (sans dépendance)
============================================================================ */
function clsx(...args: Array<string | false | null | undefined>) {
    return args.filter(Boolean).join(" ");
}
