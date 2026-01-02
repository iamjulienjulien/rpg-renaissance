// src/components/RenaissanceLandingPublic.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import RpgShell from "@/components/RpgShell";
import { useUiSettingsStore } from "@/stores/uiSettingsStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const STEPS = [
    {
        title: "Crée ton aventure",
        emoji: "🧭",
        text: "Choisis un thème, pose le cadre, et définis ce que “gagner ta journée” signifie vraiment.",
    },
    {
        title: "Transforme tes tâches en quêtes",
        emoji: "📜",
        text: "Chaque quête devient un ordre de mission court: objectif clair, étapes, et ligne d’arrivée.",
    },
    {
        title: "Joue des chapitres, gagne de la Renommée",
        emoji: "🏆",
        text: "Termine des quêtes, monte de niveau, et retrouve une trajectoire nette et motivante.",
    },
] as const;

const BENEFITS = [
    {
        emoji: "⚡",
        title: "Moins de friction",
        text: "Un seul prochain pas à la fois. Pas de montagne de charge mentale.",
    },
    {
        emoji: "🧠",
        title: "Plus de clarté",
        text: "Contexte global d’aventure + focus du chapitre: tu restes aligné.",
    },
    {
        emoji: "🔥",
        title: "Un vrai momentum",
        text: "Démarrer, faire, finir. La Renommée rend tes progrès visibles.",
    },
    {
        emoji: "🎭",
        title: "Un narrateur vivant",
        text: "Ton Maître du Jeu parle avec style, présence et intention.",
    },
] as const;

const FAQ = [
    {
        q: "C’est une to-do app ?",
        a: "Oui, mais avec une structure RPG: chapitres, quêtes, ordres de mission et une narration qui t’embarque.",
    },
    {
        q: "Il faut beaucoup de temps ?",
        a: "Non. Les quêtes peuvent être minuscules. Le système récompense les petites victoires et la régularité.",
    },
    {
        q: "Je peux changer le skin de l’UI ?",
        a: "Oui. Les thèmes changent l’ambiance, la typographie et le ressenti des panneaux.",
    },
] as const;

export default function RenaissanceLandingPublic() {
    const router = useRouter();
    const theme = useUiSettingsStore((s) => s.theme);

    const goSignup = () => router.push("/auth/signup");
    const goSignin = () => router.push("/auth/signin");

    return (
        <RpgShell title="Renaissance" returnButton={false} noRightSlot={true}>
            <div className="grid gap-4">
                {/* HERO */}
                <div
                    className={cn(
                        "rounded-[28px] p-6 sm:p-8 ring-1",
                        "bg-black/30 ring-white/10",
                        "relative overflow-hidden"
                    )}
                >
                    {/* subtle aura */}
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
                                {/* <Pill title="Thème actuel">🎨 Thème: {theme}</Pill> */}
                                <Pill>🕯️ RPG de la vraie vie</Pill>
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
                                Renaissance
                            </div>

                            <h1 className="mt-2 font-main-title text-3xl sm:text-4xl text-white/95 leading-tight">
                                Transforme ton chaos quotidien en quête jouable.
                            </h1>

                            <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                                Pas une to-do de plus. Un système narratif: contexte d’aventure,
                                focus de chapitre, ordres de mission et renommée. Tu ne
                                “t’organises” pas… tu progresses.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <ActionButton variant="solid" onClick={goSignup}>
                                    ✨ Lancer ta première aventure
                                </ActionButton>
                                <ActionButton onClick={() => router.push("/new")}>
                                    👁️ Découvrir la boucle de jeu
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                </div>

                {/* HOW IT WORKS */}
                <Panel
                    title="Comment ça marche"
                    emoji="🧩"
                    subtitle="Une boucle simple, qui reste fun."
                >
                    <div className="grid gap-3 sm:grid-cols-3">
                        {STEPS.map((s) => (
                            <div
                                key={s.title}
                                className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-white/90 font-semibold">
                                    {s.emoji} {s.title}
                                </div>
                                <div className="mt-2 rpg-text-sm text-white/65">{s.text}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-white/85 font-semibold">🗝️ Le secret</div>
                        <div className="mt-2 rpg-text-sm text-white/65">
                            Chaque quête se termine par un micro-pas. C’est comme ça que tu avances
                            même les jours à faible énergie.
                        </div>
                    </div>
                </Panel>

                {/* BENEFITS */}
                <Panel
                    title="Ce que tu y gagnes"
                    emoji="🎁"
                    subtitle="Des bénéfices concrets, sans fumée motivationnelle."
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        {BENEFITS.map((b) => (
                            <div
                                key={b.title}
                                className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-white/90 font-semibold">
                                    {b.emoji} {b.title}
                                </div>
                                <div className="mt-2 rpg-text-sm text-white/65">{b.text}</div>
                            </div>
                        ))}
                    </div>
                </Panel>

                {/* THEMES / SKINS */}
                <Panel
                    title="Skins & Atmosphère"
                    emoji="🎭"
                    subtitle="Change la texture du monde. Même règles, sort différent."
                    right={
                        <ActionButton onClick={() => router.push("/settings")}>
                            🛠️ Personnaliser
                        </ActionButton>
                    }
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="text-white/90 font-semibold">📜 Classic</div>
                            <div className="mt-2 rpg-text-sm text-white/65">
                                Chaleur de grimoire. Ombres douces. Ambiance “livre de chapitre”.
                            </div>
                        </div>

                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="text-white/90 font-semibold">🟦 Cyber Ritual</div>
                            <div className="mt-2 rpg-text-sm text-white/65">
                                Glyphes néon et panneaux façon circuits. Précision, vitesse,
                                étincelles.
                            </div>
                        </div>

                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="text-white/90 font-semibold">🌲 Forest Sigil</div>
                            <div className="mt-2 rpg-text-sm text-white/65">
                                Runes verdoyantes. Focus calme. Comme rebâtir un sanctuaire.
                            </div>
                        </div>

                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="text-white/90 font-semibold">🪶 Ashen Codex</div>
                            <div className="mt-2 rpg-text-sm text-white/65">
                                Élégance cendrée. Intensité feutrée. Pour les journées “on termine
                                le dur”.
                            </div>
                        </div>
                    </div>
                </Panel>

                {/* FAQ */}
                <Panel title="FAQ" emoji="❓" subtitle="Réponses rapides avant de te lancer.">
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
                        🏁 Prêt à lancer ta Renaissance ?
                    </div>
                    <div className="mt-2 rpg-text-sm text-white/65 max-w-2xl">
                        Crée un compte, choisis un Maître du Jeu, et transforme une toute petite
                        action en quête accomplie.
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <ActionButton variant="master" onClick={goSignup} hint="Gratuit">
                            ✨ Créer un compte
                        </ActionButton>
                        <ActionButton onClick={goSignin}>Se connecter</ActionButton>
                    </div>

                    <div className="mt-4 text-xs text-white/45">
                        Pas de spam. Pas de bruit. Juste du progrès.
                    </div>
                </div>
            </div>
        </RpgShell>
    );
}
