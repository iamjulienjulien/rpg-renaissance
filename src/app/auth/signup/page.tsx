// src/app/auth/signup/page.tsx
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

export default function SignupPage() {
    const router = useRouter();
    const theme = useUiSettingsStore((s) => s.theme);

    // ✅ Auth store
    const signUpWithPassword = useAuthStore((s) => s.signUpWithPassword);
    const loading = useAuthStore((s) => s.loading);
    const storeError = useAuthStore((s) => s.error);
    const clearError = useAuthStore((s) => s.clearError);

    // ✅ Form
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    // ✅ Page feedback (success only here, errors come from store)
    const [success, setSuccess] = useState<string | null>(null);

    const canSubmit =
        firstName.trim().length >= 2 &&
        lastName.trim().length >= 2 &&
        isValidEmail(email) &&
        password.length >= 8 &&
        password2.length >= 8 &&
        password === password2 &&
        !loading;

    const onSignup = async () => {
        clearError();
        setSuccess(null);

        const fn = firstName.trim();
        const ln = lastName.trim();

        if (fn.length < 2) return; // store gère aussi, mais UX rapide
        if (ln.length < 2) return;

        const e = email.trim().toLowerCase();
        if (!isValidEmail(e)) return;
        if (password.length < 8) return;
        if (password !== password2) return;

        const result = await signUpWithPassword({
            email: e,
            password,
            first_name: fn,
            last_name: ln,
            emailRedirectTo:
                typeof window !== "undefined"
                    ? `${window.location.origin}/auth/callback`
                    : undefined,
        });

        if (!result) return;

        if (result.needsEmailConfirmation) {
            setSuccess(
                "Compte créé ✅ Vérifie tes emails pour confirmer ton inscription, puis reviens te connecter."
            );
            return;
        }

        setSuccess("Compte créé ✅ Connexion en cours…");
        router.push("/");
        router.refresh();
    };

    return (
        <RpgShell title="Créer un compte">
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
                                <Pill>🕯️ RPG du quotidien</Pill>
                            </div>

                            <div className="flex items-center gap-2">
                                <ActionButton onClick={() => router.push("/")}>
                                    ← Retour
                                </ActionButton>
                                <ActionButton onClick={() => router.push("/auth/signin")}>
                                    Se connecter
                                </ActionButton>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Renaissance
                            </div>

                            <h1 className="mt-2 font-main-title text-3xl sm:text-4xl text-white/95 leading-tight">
                                Crée ton compte. Forge ta quête.
                            </h1>

                            <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                                Une seule règle: avancer. Même petit. Même lent. Mais réel.
                            </p>
                        </div>
                    </div>
                </div>

                {/* FORM */}
                <Panel
                    title="Inscription"
                    emoji="✨"
                    subtitle="Email + mot de passe. Puis tu démarres ta première aventure."
                >
                    <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-2">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Prénom
                                </div>
                                <input
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Julien"
                                    className={cn(
                                        "rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/90",
                                        "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                        "focus:ring-2 focus:ring-white/25"
                                    )}
                                    autoComplete="given-name"
                                />
                            </label>

                            <label className="grid gap-2">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Nom
                                </div>
                                <input
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Julien"
                                    className={cn(
                                        "rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/90",
                                        "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                        "focus:ring-2 focus:ring-white/25"
                                    )}
                                    autoComplete="family-name"
                                />
                            </label>
                        </div>

                        <div className="grid gap-3 mt-3">
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
                                    placeholder="Au moins 8 caractères"
                                    className={cn(
                                        "rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/90",
                                        "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                        "focus:ring-2 focus:ring-white/25"
                                    )}
                                    autoComplete="new-password"
                                />
                            </label>

                            <label className="grid gap-2">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Confirmer le mot de passe
                                </div>
                                <input
                                    type="password"
                                    value={password2}
                                    onChange={(e) => setPassword2(e.target.value)}
                                    placeholder="Répète-le une fois"
                                    className={cn(
                                        "rounded-2xl bg-black/30 px-4 py-3 rpg-text-sm text-white/90",
                                        "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                        "focus:ring-2 focus:ring-white/25"
                                    )}
                                    autoComplete="new-password"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && canSubmit) void onSignup();
                                    }}
                                />
                            </label>

                            {storeError ? (
                                <div className="rounded-2xl bg-red-500/10 p-3 text-red-200 ring-1 ring-red-400/20">
                                    ⚠️ {storeError}
                                </div>
                            ) : null}

                            {success ? (
                                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-200 ring-1 ring-emerald-400/20">
                                    ✅ {success}
                                </div>
                            ) : null}

                            <div className="mt-1 flex flex-wrap gap-2">
                                <ActionButton
                                    variant="master"
                                    hint="Gratuit"
                                    onClick={() => void onSignup()}
                                    disabled={!canSubmit}
                                >
                                    {loading ? "⏳ Création…" : "✨ Créer mon compte"}
                                </ActionButton>

                                <ActionButton onClick={() => router.push("/auth/signin")}>
                                    J’ai déjà un compte
                                </ActionButton>
                            </div>

                            <div className="mt-2 text-xs text-white/45">
                                En créant un compte, tu acceptes de recevoir l’email de confirmation
                                si cette option est activée sur le projet.
                            </div>
                        </div>
                    </div>
                </Panel>

                {/* MICRO COPY */}
                <Panel
                    title="Ce que tu obtiens"
                    emoji="🎁"
                    subtitle="Rien de flou. Juste un système qui te remet en mouvement."
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="text-white/90 font-semibold">📜 Ordres de mission</div>
                            <div className="mt-2 rpg-text-sm text-white/65">
                                Un objectif, des étapes, et une micro-consigne finale.
                            </div>
                        </div>
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="text-white/90 font-semibold">🏆 Renommée</div>
                            <div className="mt-2 rpg-text-sm text-white/65">
                                Tes petites victoires deviennent visibles et cumulables.
                            </div>
                        </div>
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="text-white/90 font-semibold">🎭 Maître du Jeu</div>
                            <div className="mt-2 rpg-text-sm text-white/65">
                                Une voix, un ton, une intention. Tu choisis ton style.
                            </div>
                        </div>
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="text-white/90 font-semibold">🎨 Skins</div>
                            <div className="mt-2 rpg-text-sm text-white/65">
                                Même règles, ambiance différente. À toi de choisir le décor.
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>
        </RpgShell>
    );
}
