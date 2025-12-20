// src/app/login/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { supabaseBrowser } from "@/lib/supabase/client";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function LoginPage() {
    const router = useRouter();
    const supabase = supabaseBrowser();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    const canSubmit = email.trim().length > 3;

    const magicLink = async () => {
        setLoading(true);
        setError(null);
        setInfo(null);

        const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        setInfo("Lien magique envoyé. Ouvre ton email 🕯️");
    };

    const signInPassword = async () => {
        setLoading(true);
        setError(null);
        setInfo(null);

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        router.push("/");
        router.refresh();
    };

    const signUpPassword = async () => {
        setLoading(true);
        setError(null);
        setInfo(null);

        const { error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        setInfo("Compte créé. Vérifie ton email si nécessaire, puis connecte-toi ✅");
    };

    return (
        <RpgShell
            title="Connexion"
            subtitle="Une clé, une partie, un royaume."
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>🔐 Auth</Pill>
                </div>
            }
        >
            <div className="grid gap-4 max-w-xl">
                <Panel title="Accès" emoji="🔐" subtitle="Magic link ou mot de passe.">
                    <div className="grid gap-3">
                        <label className="grid gap-1">
                            <div className="text-xs tracking-[0.18em] text-white/55">EMAIL</div>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="julien@mail.com"
                                className={cn(
                                    "w-full rounded-2xl bg-black/30 px-4 py-3 text-white/90 ring-1 ring-white/10",
                                    "outline-none focus:ring-2 focus:ring-white/20"
                                )}
                            />
                        </label>

                        <label className="grid gap-1">
                            <div className="text-xs tracking-[0.18em] text-white/55">
                                MOT DE PASSE
                            </div>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                type="password"
                                className={cn(
                                    "w-full rounded-2xl bg-black/30 px-4 py-3 text-white/90 ring-1 ring-white/10",
                                    "outline-none focus:ring-2 focus:ring-white/20"
                                )}
                            />
                        </label>

                        {error ? (
                            <div className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-400/20">
                                {error}
                            </div>
                        ) : null}

                        {info ? (
                            <div className="rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-200 ring-1 ring-emerald-400/20">
                                {info}
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <ActionButton onClick={magicLink} disabled={!canSubmit || loading}>
                                ✉️ Magic link
                            </ActionButton>

                            <ActionButton
                                variant="solid"
                                onClick={signInPassword}
                                disabled={!canSubmit || !password || loading}
                            >
                                🔑 Se connecter
                            </ActionButton>

                            <ActionButton
                                onClick={signUpPassword}
                                disabled={!canSubmit || !password || loading}
                            >
                                🧾 Créer un compte
                            </ActionButton>
                        </div>
                    </div>
                </Panel>
            </div>
        </RpgShell>
    );
}
