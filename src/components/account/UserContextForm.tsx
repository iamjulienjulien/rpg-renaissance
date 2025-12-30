"use client";

import { useEffect, useRef, useState } from "react";
import { useToastStore } from "@/stores/toastStore";
import { Panel } from "../RpgUi";

type UserContext = {
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

function UserContextField(p: {
    k: keyof UserContext;
    label: string;
    emoji: string;
    hint: string;
    placeholder: string;
    value: string | null;
    savedValue: string | null;
    saving: boolean;
    onChange: (k: keyof UserContext, v: string) => void;
    onSave: (k: keyof UserContext) => void;
    onClear: (k: keyof UserContext) => void;
}) {
    const dirty = p.value !== p.savedValue;

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

            <div className="flex items-center gap-3 text-xs">
                <button
                    type="button"
                    className="rounded-full border border-white/10 px-3 py-1 hover:border-white/20 disabled:opacity-40"
                    onClick={() => p.onSave(p.k)}
                    disabled={!dirty || p.saving}
                >
                    {p.saving ? "⏳ Sauvegarde…" : "💾 Sauvegarder"}
                </button>

                <button
                    type="button"
                    className="rounded-full border border-white/10 px-3 py-1 hover:border-white/20"
                    onClick={() => p.onClear(p.k)}
                    // disabled={p.value == null}
                >
                    Effacer
                </button>

                {dirty && !p.saving && <span className="opacity-70">✍️ Modifié</span>}
                {!dirty && <span className="opacity-50">✓ Sauvegardé</span>}
            </div>
        </div>
    );
}

export function UserContextForm() {
    const toast = useToastStore.getState();

    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<keyof UserContext | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<UserContext>(EMPTY);
    const lastSavedRef = useRef<UserContext>(EMPTY);

    function setFieldValue(key: keyof UserContext, v: string) {
        setForm((s) => ({ ...s, [key]: v }));
    }

    function clearField(key: keyof UserContext) {
        setForm((s) => ({ ...s, [key]: null }));
    }

    /* =========================================================================
    LOAD
    ========================================================================= */

    useEffect(() => {
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
    }, []);

    /* =========================================================================
    SAVE ONE FIELD
    ========================================================================= */

    async function saveField(key: keyof UserContext) {
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

    if (loading) {
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
                {error && <div className="mb-3 text-xs text-red-300">⚠️ {error}</div>}
                <UserContextField
                    k="context_self"
                    label="Moi"
                    emoji="🧭"
                    hint="Ton énergie, ta façon d’aborder les quêtes, ce qui te motive."
                    placeholder="Ex: Je préfère des missions courtes le soir…"
                    value={form.context_self}
                    savedValue={lastSavedRef.current.context_self}
                    saving={savingKey === "context_self"}
                    onChange={setFieldValue}
                    onSave={saveField}
                    onClear={clearField}
                />
                <UserContextField
                    k="context_family"
                    label="Ma famille"
                    emoji="❤️‍🔥"
                    hint="Personnes importantes, contraintes, équilibres."
                    placeholder="Ex: J’ai une petite de 2 ans…"
                    value={form.context_family}
                    savedValue={lastSavedRef.current.context_family}
                    saving={savingKey === "context_family"}
                    onChange={setFieldValue}
                    onSave={saveField}
                    onClear={clearField}
                />
                <UserContextField
                    k="context_home"
                    label="Mon foyer"
                    emoji="🏰"
                    hint="Organisation, pièces, zones sensibles."
                    placeholder="Ex: Salon multifonction, chambre enfant…"
                    value={form.context_home}
                    savedValue={lastSavedRef.current.context_home}
                    saving={savingKey === "context_home"}
                    onChange={setFieldValue}
                    onSave={saveField}
                    onClear={clearField}
                />
                <UserContextField
                    k="context_routine"
                    label="Mon quotidien"
                    emoji="🌗"
                    hint="Rythmes, horaires, moments calmes."
                    placeholder="Ex: Après 21h, créneaux courts…"
                    value={form.context_routine}
                    savedValue={lastSavedRef.current.context_routine}
                    saving={savingKey === "context_routine"}
                    onChange={setFieldValue}
                    onSave={saveField}
                    onClear={clearField}
                />
                <UserContextField
                    k="context_challenges"
                    label="Mes défis actuels"
                    emoji="🪨"
                    hint="Ce qui freine l’élan en ce moment."
                    placeholder="Ex: Manque d’énergie, dispersion…"
                    value={form.context_challenges}
                    savedValue={lastSavedRef.current.context_challenges}
                    saving={savingKey === "context_challenges"}
                    onChange={setFieldValue}
                    onSave={saveField}
                    onClear={clearField}
                />
            </Panel>
        </div>
    );
}
