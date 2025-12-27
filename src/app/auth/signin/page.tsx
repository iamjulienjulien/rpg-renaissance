// src/app/auth/signin/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { useUiSettingsStore } from "@/stores/uiSettingsStore";
import { useAuthStore } from "@/stores/authStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SigninPage() {
    const router = useRouter();
    const theme = useUiSettingsStore((s) => s.theme);

    // ✅ Auth store
    const signInWithPassword = useAuthStore((s) => s.signInWithPassword);
    const loading = useAuthStore((s) => s.loading);
    const storeError = useAuthStore((s) => s.error);
    const clearError = useAuthStore((s) => s.clearError);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const canSubmit = isValidEmail(email) && password.length >= 1 && !loading;

    const onSignin = async () => {
        clearError();

        const e = email.trim().toLowerCase();
        if (!isValidEmail(e)) return;
        if (!password) return;

        const ok = await signInWithPassword({ email: e, password });
        if (!ok) return;

        router.push("/");
        router.refresh();
    };

    return (
        <RpgShell title="Connexion">
            <div className="grid gap-4">
                {/* HERO */}
                <div
                    className={cn(
                        "rounded-[28px] p-6 sm:p-8 ring-1",
                        "bg-black/30 ring-white/10",
                        "relative overflow-hidden"
                    )}
                >
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                "radial-gradient(900px 500px at 18% 12%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(700px 500px at 82% 40%, rgba(255,255,255,0.05), transparent 55%)",
                        }}
                    />

                    <div className="relative">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                <Pill title="Thème actuel">🎨 Thème: {theme}</Pill>
                                <Pill>🔐 Accès</Pill>
                            </div>

                            <div className="flex items-center gap-2">
                                <ActionButton onClick={() => router.push("/")}>
                                    ← Retour
                                </ActionButton>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Renaissance
                            </div>

                            <h1 className="mt-2 font-main-title text-3xl sm:text-4xl text-white/95 leading-tight">
                                Reviens au chapitre.
                            </h1>

                            <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                                Une clé. Une session. Et on reprend là où tu t’étais arrêté.
                            </p>
                        </div>
                    </div>
                </div>

                {/* FORM */}
                <Panel title="Se connecter" emoji="🔑" subtitle="Email + mot de passe.">
                    <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                        <div className="grid gap-3">
                            <label className="grid gap-2">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Email
                                </div>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="toi@exemple.com"
                                    className={cn(
                                        "rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/90",
                                        "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                        "focus:ring-2 focus:ring-white/25"
                                    )}
                                    autoComplete="email"
                                    inputMode="email"
                                />
                            </label>

                            <label className="grid gap-2">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Mot de passe
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={cn(
                                        "rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/90",
                                        "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                        "focus:ring-2 focus:ring-white/25"
                                    )}
                                    autoComplete="current-password"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && canSubmit) void onSignin();
                                    }}
                                />
                            </label>

                            {storeError ? (
                                <div className="rounded-2xl bg-red-500/10 p-3 text-red-200 ring-1 ring-red-400/20">
                                    ⚠️ {storeError}
                                </div>
                            ) : null}

                            <div className="mt-1 flex flex-wrap gap-2 justify-end">
                                <ActionButton
                                    variant="master"
                                    hint="OK"
                                    onClick={() => void onSignin()}
                                    disabled={!canSubmit}
                                >
                                    {loading ? "⏳ Connexion…" : "🔑 Se connecter"}
                                </ActionButton>
                            </div>

                            <div className="mt-2 text-xs text-white/45">
                                Mot de passe oublié ? (à ajouter plus tard: reset password)
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>
        </RpgShell>
    );
}
