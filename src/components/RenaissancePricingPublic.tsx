// src/components/RenaissancePricingPublic.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import RpgShell from "@/components/RpgShell";
import { useUiSettingsStore } from "@/stores/uiSettingsStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type Billing = "monthly" | "yearly";

type PlanKey = "prologue" | "disciple" | "elu" | "legende";

type Plan = {
    key: PlanKey;
    name: string;
    badge?: string;
    emoji: string;
    tagline: string;
    vibe: string;
    monthlyPrice: number;
    yearlyPrice: number; // total / an
    highlight?: boolean;
    ctaLabel: string;
    features: Array<{ label: string; note?: string }>;
    limits?: Array<string>;
};

const PLANS: Plan[] = [
    {
        key: "prologue",
        name: "Prologue",
        emoji: "🟢",
        tagline: "Entrer dans le monde de Renaissance",
        vibe: "Avant de devenir un héros, il faut accepter de jouer.",
        monthlyPrice: 0,
        yearlyPrice: 0,
        ctaLabel: "Créer un compte",
        features: [
            { label: "Création du personnage" },
            { label: "1 mini-chapitre d’introduction" },
            { label: "Jusqu’à 3 quêtes actives" },
            { label: "Encouragements du MJ (limités)" },
            { label: "Renommée & journal basique" },
            { label: "Timeline simplifiée" },
        ],
        limits: [
            "Pas de récit de chapitre",
            "Pas d’arcs narratifs longs",
            "Outils avancés limités",
        ],
    },
    {
        key: "disciple",
        name: "Disciple du MJ",
        badge: "Recommandé",
        emoji: "🔵",
        tagline: "Jouer sérieusement et progresser",
        vibe: "Je ne me motive plus. Je progresse.",
        monthlyPrice: 19,
        yearlyPrice: 190,
        highlight: true,
        ctaLabel: "Commencer Disciple",
        features: [
            { label: "Quêtes illimitées" },
            { label: "Encouragements illimités" },
            { label: "Félicitations de fin de quête" },
            { label: "Timeline complète (chronique + discussions)" },
            { label: "Profil joueur avancé" },
            { label: "Renommée, niveaux, paliers narratifs" },
            { label: "Style du MJ configurable" },
            { label: "Journal structuré & exportable" },
        ],
    },
    {
        key: "elu",
        name: "Élu de la Renaissance",
        emoji: "🟣",
        tagline: "Transformation personnelle",
        vibe: "Je veux comprendre mes schémas et les dépasser.",
        monthlyPrice: 39,
        yearlyPrice: 390,
        ctaLabel: "Passer Élu",
        features: [
            { label: "Récit de chapitre automatique" },
            { label: "Arcs narratifs de 30 jours (Saisons)" },
            { label: "Packs de quêtes premium inclus" },
            { label: "Synthèse hebdo du MJ (focus + clarté)" },
            { label: "Détection de patterns (cycles, blocages)" },
            { label: "Méta-progression (traits, archétypes, cicatrices)" },
            { label: "Journal enrichi long terme" },
        ],
    },
    {
        key: "legende",
        name: "Légende",
        emoji: "🔴",
        tagline: "Discipline & responsabilité",
        vibe: "Je veux être tenu responsable et me prendre en main.",
        monthlyPrice: 79,
        yearlyPrice: 790,
        ctaLabel: "Devenir Légende",
        features: [
            { label: "Audit mensuel complet (IA)" },
            { label: "Décrets du MJ (règles temporaires imposées)" },
            { label: "Livre du Héros (historique long terme)" },
            { label: "Accès anticipé aux nouvelles features" },
            { label: "Slot réservé pour futur coaching humain" },
            { label: "Statut prestige (profil Légende)" },
        ],
    },
];

const FAQ = [
    {
        q: "Je commence par quoi ?",
        a: "Prologue si tu veux tester la boucle. Disciple si tu veux immédiatement jouer “pour de vrai” (illimité + timeline + journal).",
    },
    {
        q: "Pourquoi un abonnement ?",
        a: "Parce que le MJ t’accompagne dans la durée. Tu paies un système vivant, pas une check-list figée.",
    },
    {
        q: "Et si je n’ai que 10 minutes par jour ?",
        a: "Parfait. Le jeu est construit autour du micro-pas. Même 10 minutes peuvent devenir une quête accomplie.",
    },
    {
        q: "Je peux annuler quand je veux ?",
        a: "Oui. Tu gardes ton histoire, tes quêtes et ton journal. Tu perds seulement les pouvoirs premium du MJ.",
    },
] as const;

function formatPriceEUR(n: number) {
    if (n === 0) return "Gratuit";
    return `${n}€`;
}

export default function RenaissancePricingPublic() {
    const router = useRouter();
    const theme = useUiSettingsStore((s) => s.theme);

    const [billing, setBilling] = useState<Billing>("monthly");

    const yearlySavings = useMemo(() => {
        const disciple = PLANS.find((p) => p.key === "disciple")!;
        const monthlyTotal = disciple.monthlyPrice * 12;
        const yearly = disciple.yearlyPrice;
        return Math.max(0, monthlyTotal - yearly);
    }, []);

    const goSignup = () => router.push("/auth/signup");
    const goSignin = () => router.push("/auth/signin");

    const goPlan = (key: PlanKey) => {
        // tu adapteras quand tu brancheras Stripe: ?plan=...
        if (key === "prologue") return goSignup();
        router.push(`/auth/signup?plan=${key}&billing=${billing}`);
    };

    return (
        <RpgShell
            title="Tarifs"
            subtitle="🧾 Choisis ton pacte. Garde le contrôle. Progresse pour de vrai. 🗝️"
            returnButton={true}
            noRightSlot={true}
        >
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
                                "radial-gradient(900px 500px at 20% 10%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(700px 500px at 80% 40%, rgba(255,255,255,0.05), transparent 55%)",
                        }}
                    />

                    <div className="relative">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                <Pill>🎮 RPG de coaching virtuel</Pill>
                                <Pill>🕯️ Thème: {theme}</Pill>
                            </div>

                            <div className="flex items-center gap-2">
                                <ActionButton onClick={goSignin}>Se connecter</ActionButton>
                                <ActionButton variant="master" onClick={goSignup} hint="Gratuit">
                                    Créer un compte
                                </ActionButton>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Pricing
                            </div>

                            <h1 className="mt-2 font-main-title text-3xl sm:text-4xl text-white/95 leading-tight">
                                Le même monde. Des pouvoirs différents.
                            </h1>

                            <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                                Prologue pour tester. Disciple pour jouer au quotidien. Élu pour la
                                transformation. Légende pour la discipline et la responsabilité.
                            </p>

                            <div className="mt-5 flex flex-wrap items-center gap-2">
                                <div className="rounded-2xl bg-black/25 p-1 ring-1 ring-white/10">
                                    <button
                                        onClick={() => setBilling("monthly")}
                                        className={cn(
                                            "px-3 py-2 rounded-2xl text-sm",
                                            billing === "monthly"
                                                ? "bg-white/10 text-white/90 ring-1 ring-white/15"
                                                : "text-white/70 hover:bg-white/5"
                                        )}
                                    >
                                        Mensuel
                                    </button>
                                    <button
                                        onClick={() => setBilling("yearly")}
                                        className={cn(
                                            "px-3 py-2 rounded-2xl text-sm",
                                            billing === "yearly"
                                                ? "bg-white/10 text-white/90 ring-1 ring-white/15"
                                                : "text-white/70 hover:bg-white/5"
                                        )}
                                    >
                                        Annuel
                                    </button>
                                </div>

                                <Pill>
                                    💰 Annuel: {formatPriceEUR(yearlySavings)} économisés sur
                                    Disciple
                                </Pill>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PLANS */}
                <Panel
                    title="Les pactes"
                    emoji="🧿"
                    subtitle="Choisis ton rythme. Tu peux évoluer quand tu veux."
                >
                    <div className="grid gap-3 lg:grid-cols-4">
                        {PLANS.map((p) => {
                            const price = billing === "monthly" ? p.monthlyPrice : p.yearlyPrice;
                            const priceLabel =
                                p.monthlyPrice === 0
                                    ? "Gratuit"
                                    : billing === "monthly"
                                      ? `${formatPriceEUR(price)}/mois`
                                      : `${formatPriceEUR(price)}/an`;

                            return (
                                <div
                                    key={p.key}
                                    className={cn(
                                        "rounded-3xl p-4 ring-1 relative overflow-hidden",
                                        p.highlight
                                            ? "bg-black/35 ring-white/15"
                                            : "bg-black/25 ring-white/10"
                                    )}
                                >
                                    {p.highlight ? (
                                        <div
                                            className="pointer-events-none absolute inset-0 opacity-80"
                                            style={{
                                                background:
                                                    "radial-gradient(520px 260px at 30% 10%, hsl(var(--accent)/0.22), transparent 65%)",
                                            }}
                                        />
                                    ) : null}

                                    <div className="relative">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-white/90 font-semibold">
                                                {p.emoji} {p.name}
                                            </div>
                                            {/* {p.badge ? <Pill>{p.badge}</Pill> : null} */}
                                        </div>

                                        <div className="mt-2 text-xs tracking-[0.18em] text-white/55 uppercase">
                                            {p.tagline}
                                        </div>

                                        <div className="mt-3 text-2xl font-semibold text-white/95">
                                            {priceLabel}
                                        </div>

                                        <div className="mt-2 text-sm text-white/65">“{p.vibe}”</div>

                                        <div className="mt-4">
                                            <ActionButton
                                                variant={p.highlight ? "master" : "solid"}
                                                onClick={() => goPlan(p.key)}
                                                hint={p.key === "prologue" ? "Gratuit" : undefined}
                                                className="w-full justify-center"
                                            >
                                                {p.ctaLabel}
                                            </ActionButton>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            {p.features.slice(0, 6).map((f, i) => (
                                                <div key={i} className="text-sm text-white/75">
                                                    ✅ {f.label}
                                                </div>
                                            ))}
                                            {p.features.length > 6 ? (
                                                <div className="text-xs text-white/50">
                                                    + {p.features.length - 6} autres pouvoirs
                                                </div>
                                            ) : null}
                                        </div>

                                        {p.limits?.length ? (
                                            <div className="mt-4 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                                                <div className="text-xs text-white/55 uppercase tracking-[0.18em]">
                                                    Limites
                                                </div>
                                                <div className="mt-2 space-y-1">
                                                    {p.limits.map((x, i) => (
                                                        <div
                                                            key={i}
                                                            className="text-sm text-white/60"
                                                        >
                                                            ▸ {x}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-white/85 font-semibold">🗝️ Note</div>
                        <div className="mt-2 rpg-text-sm text-white/65">
                            Le plan Disciple est conçu comme le “vrai jeu” du quotidien: illimité,
                            timeline complète, journal solide. Les plans au-dessus ajoutent la
                            couche “transformation”.
                        </div>
                    </div>
                </Panel>

                {/* COMPARAISON */}
                <Panel
                    title="Comparaison rapide"
                    emoji="🧪"
                    subtitle="Un tableau, sans poudre aux yeux."
                >
                    <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10 bg-black/20">
                        <table className="min-w-[860px] w-full text-sm">
                            <thead>
                                <tr className="text-left">
                                    <th className="p-4 text-white/60">Pouvoir</th>
                                    <th className="p-4 text-white/80">🟢 Prologue</th>
                                    <th className="p-4 text-white/80">🔵 Disciple</th>
                                    <th className="p-4 text-white/80">🟣 Élu</th>
                                    <th className="p-4 text-white/80">🔴 Légende</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {[
                                    ["Quêtes actives", "3", "∞", "∞", "∞"],
                                    ["Encouragements MJ", "Limité", "∞", "∞", "∞"],
                                    ["Félicitations fin de quête", "—", "✅", "✅", "✅"],
                                    ["Timeline complète", "—", "✅", "✅", "✅"],
                                    ["Récit de chapitre", "—", "—", "✅", "✅"],
                                    ["Arcs narratifs (Saisons)", "—", "—", "✅", "✅"],
                                    ["Détection de patterns", "—", "—", "✅", "✅"],
                                    ["Décrets MJ (cadre imposé)", "—", "—", "—", "✅"],
                                    ["Accès anticipé", "—", "—", "—", "✅"],
                                ].map((row) => (
                                    <tr key={row[0]}>
                                        <td className="p-4 text-white/75">{row[0]}</td>
                                        <td className="p-4 text-white/65">{row[1]}</td>
                                        <td className="p-4 text-white/65">{row[2]}</td>
                                        <td className="p-4 text-white/65">{row[3]}</td>
                                        <td className="p-4 text-white/65">{row[4]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                {/* FAQ */}
                <Panel title="FAQ Tarifs" emoji="❓" subtitle="Deux minutes et c’est clair.">
                    <div className="space-y-2">
                        {FAQ.map((f) => (
                            <div
                                key={f.q}
                                className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-white/90 font-semibold">{f.q}</div>
                                <div className="mt-2 rpg-text-sm text-white/65">{f.a}</div>
                            </div>
                        ))}
                    </div>
                </Panel>

                {/* FINAL CTA */}
                <div className="rounded-[28px] bg-black/30 p-6 ring-1 ring-white/10">
                    <div className="text-white/90 font-semibold text-lg">
                        🏁 Prêt à choisir ton pacte ?
                    </div>
                    <div className="mt-2 rpg-text-sm text-white/65 max-w-2xl">
                        Si tu veux juste tester: Prologue. Si tu veux avancer dès aujourd’hui:
                        Disciple.
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <ActionButton variant="master" onClick={() => goPlan("disciple")}>
                            🔵 Commencer Disciple
                        </ActionButton>
                        <ActionButton
                            variant="solid"
                            onClick={() => goPlan("prologue")}
                            hint="Gratuit"
                        >
                            🟢 Tester Prologue
                        </ActionButton>
                        <ActionButton onClick={goSignin}>Se connecter</ActionButton>
                    </div>

                    <div className="mt-4 text-xs text-white/45">
                        Pas de spam. Tu peux annuler quand tu veux.
                    </div>
                </div>
            </div>
        </RpgShell>
    );
}
