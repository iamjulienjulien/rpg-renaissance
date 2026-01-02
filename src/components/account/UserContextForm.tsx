// src/components/account/UserContextForm.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useToastStore } from "@/stores/toastStore";
import { Panel } from "../RpgUi";

export type UserContext = {
    context_self: string | null;
    context_family: string | null;
    context_home: string | null;
    context_routine: string | null;
    context_challenges: string | null;
};

const EMPTY: UserContext = {
    context_self: null,
    context_family: null,
    context_home: null,
    context_routine: null,
    context_challenges: null,
};

function normalize(v: string) {
    const t = (v ?? "").trim();
    return t.length ? t : null;
}

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function UserContextField(p: {
    k: keyof UserContext;
    label: string;
    emoji: string;
    hint: string;
    placeholder: string;
    value: string | null;

    // only used in "account" mode (to show dirty/saved)
    savedValue?: string | null;

    // actions
    saving?: boolean;
    onChange: (k: keyof UserContext, v: string) => void;

    // optional actions
    onSave?: (k: keyof UserContext) => void;
    onClear?: (k: keyof UserContext) => void;
    hideActions?: boolean;
}) {
    const dirty = typeof p.savedValue !== "undefined" ? p.value !== p.savedValue : false;

    return (
        <div className="space-y-2 mb-4">
            <div className="space-y-1">
                <div className="text-sm font-semibold">
                    {p.emoji} {p.label}
                </div>
                <div className="text-xs opacity-70">{p.hint}</div>
            </div>

            <textarea
                className="w-full min-h-[120px] rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-white/20"
                placeholder={p.placeholder}
                value={p.value ?? ""}
                onChange={(e) => p.onChange(p.k, e.target.value)}
            />

            {!p.hideActions ? (
                <div className="flex items-center gap-3 text-xs">
                    <button
                        type="button"
                        className="rounded-full border border-white/10 px-3 py-1 hover:border-white/20 disabled:opacity-40"
                        onClick={() => p.onSave?.(p.k)}
                        disabled={!dirty || !!p.saving || typeof p.onSave !== "function"}
                    >
                        {p.saving ? "⏳ Sauvegarde…" : "💾 Sauvegarder"}
                    </button>

                    <button
                        type="button"
                        className="rounded-full border border-white/10 px-3 py-1 hover:border-white/20 disabled:opacity-40"
                        onClick={() => p.onClear?.(p.k)}
                        disabled={typeof p.onClear !== "function"}
                    >
                        Effacer
                    </button>

                    {dirty && !p.saving && <span className="opacity-70">✍️ Modifié</span>}
                    {!dirty && typeof p.savedValue !== "undefined" && (
                        <span className="opacity-50">✓ Sauvegardé</span>
                    )}
                </div>
            ) : null}
        </div>
    );
}

export function UserContextForm(p?: {
    /**
     * account (default): charge depuis API, permet save/clear par champ
     * draft: pas d’API, contrôle via value/onChange
     */
    mode?: "account" | "draft";
    value?: UserContext;
    onChange?: (next: UserContext) => void;

    /**
     * Cache les boutons Sauvegarder/Effacer + états dirty/saved
     * (utile pour onboarding)
     */
    hideActions?: boolean;
}) {
    const toast = useToastStore.getState();

    const mode = p?.mode ?? "account";
    const hideActions = !!p?.hideActions;

    // -------------------- STATE (account mode) --------------------
    const [loading, setLoading] = useState(mode === "account");
    const [savingKey, setSavingKey] = useState<keyof UserContext | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<UserContext>(EMPTY);
    const lastSavedRef = useRef<UserContext>(EMPTY);

    // -------------------- STATE (draft mode) --------------------
    const draftValue: UserContext = useMemo(() => {
        return (p?.value ?? EMPTY) as UserContext;
    }, [p?.value]);

    const liveForm = mode === "draft" ? draftValue : form;
    const savedForm = mode === "draft" ? undefined : lastSavedRef.current;

    const setFieldValue = (key: keyof UserContext, v: string) => {
        if (mode === "draft") {
            const next: UserContext = { ...draftValue, [key]: v };
            p?.onChange?.(next);
            return;
        }

        setForm((s) => ({ ...s, [key]: v }));
    };

    const clearField = (key: keyof UserContext) => {
        if (mode === "draft") {
            const next: UserContext = { ...draftValue, [key]: null };
            p?.onChange?.(next);
            return;
        }

        setForm((s) => ({ ...s, [key]: null }));
    };

    /* =========================================================================
    LOAD (account mode only)
    ========================================================================= */

    useEffect(() => {
        if (mode !== "account") return;

        let mounted = true;

        (async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch("/api/account/context", { cache: "no-store" });
                const json = await res.json().catch(() => null);

                if (!res.ok) throw new Error(json?.error ?? res.statusText);

                const ctx = (json?.context ?? EMPTY) as UserContext;

                if (!mounted) return;
                setForm(ctx);
                lastSavedRef.current = ctx;
            } catch (e) {
                if (!mounted) return;
                setError(e instanceof Error ? e.message : "Load failed");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [mode]);

    /* =========================================================================
    SAVE ONE FIELD (account mode only)
    ========================================================================= */

    async function saveField(key: keyof UserContext) {
        if (mode !== "account") return;

        const value = normalize(form[key] ?? "");
        const prev = lastSavedRef.current[key];
        if (value === prev) return;

        setSavingKey(key);
        setError(null);

        try {
            const res = await fetch("/api/account/context", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: value }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error ?? "Save failed");

            lastSavedRef.current = {
                ...lastSavedRef.current,
                [key]: value,
            };

            toast.success("Contexte sauvegardé", "Le MJ a pris note.");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
            toast.error("Contexte", "Sauvegarde impossible");
        } finally {
            setSavingKey(null);
        }
    }

    if (mode === "account" && loading) {
        return <div className="text-sm opacity-80">Chargement du contexte…</div>;
    }

    /* =========================================================================
    RENDER
    ========================================================================= */

    return (
        <div className="space-y-6">
            <Panel
                title="Contexte utilisateur"
                emoji="🧠"
                subtitle="Ces informations guident le Maître du Jeu."
            >
                {mode === "account" && error ? (
                    <div className="mb-3 text-xs text-red-300">⚠️ {error}</div>
                ) : null}

                <UserContextField
                    k="context_self"
                    label="Moi"
                    emoji="🧭"
                    hint="Ton énergie, ta façon d’aborder les quêtes, ce qui te motive."
                    placeholder="Ex: Je préfère des missions courtes le soir…"
                    value={liveForm.context_self}
                    savedValue={savedForm?.context_self}
                    saving={savingKey === "context_self"}
                    onChange={setFieldValue}
                    onSave={mode === "account" ? saveField : undefined}
                    onClear={mode === "account" ? clearField : undefined}
                    hideActions={hideActions || mode === "draft"}
                />

                <UserContextField
                    k="context_family"
                    label="Ma famille"
                    emoji="❤️‍🔥"
                    hint="Personnes importantes, contraintes, équilibres."
                    placeholder="Ex: J’ai une petite de 2 ans…"
                    value={liveForm.context_family}
                    savedValue={savedForm?.context_family}
                    saving={savingKey === "context_family"}
                    onChange={setFieldValue}
                    onSave={mode === "account" ? saveField : undefined}
                    onClear={mode === "account" ? clearField : undefined}
                    hideActions={hideActions || mode === "draft"}
                />

                <UserContextField
                    k="context_home"
                    label="Mon foyer"
                    emoji="🏰"
                    hint="Organisation, pièces, zones sensibles."
                    placeholder="Ex: Salon multifonction, chambre enfant…"
                    value={liveForm.context_home}
                    savedValue={savedForm?.context_home}
                    saving={savingKey === "context_home"}
                    onChange={setFieldValue}
                    onSave={mode === "account" ? saveField : undefined}
                    onClear={mode === "account" ? clearField : undefined}
                    hideActions={hideActions || mode === "draft"}
                />

                <UserContextField
                    k="context_routine"
                    label="Mon quotidien"
                    emoji="🌗"
                    hint="Rythmes, horaires, moments calmes."
                    placeholder="Ex: Après 21h, créneaux courts…"
                    value={liveForm.context_routine}
                    savedValue={savedForm?.context_routine}
                    saving={savingKey === "context_routine"}
                    onChange={setFieldValue}
                    onSave={mode === "account" ? saveField : undefined}
                    onClear={mode === "account" ? clearField : undefined}
                    hideActions={hideActions || mode === "draft"}
                />

                <UserContextField
                    k="context_challenges"
                    label="Mes défis actuels"
                    emoji="🪨"
                    hint="Ce qui freine l’élan en ce moment."
                    placeholder="Ex: Manque d’énergie, dispersion…"
                    value={liveForm.context_challenges}
                    savedValue={savedForm?.context_challenges}
                    saving={savingKey === "context_challenges"}
                    onChange={setFieldValue}
                    onSave={mode === "account" ? saveField : undefined}
                    onClear={mode === "account" ? clearField : undefined}
                    hideActions={hideActions || mode === "draft"}
                />
            </Panel>
        </div>
    );
}
