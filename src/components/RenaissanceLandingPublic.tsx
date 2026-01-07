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

/* ============================================================================
🧠 DATA
============================================================================ */

const STEPS = [
    {
        title: "Pose le cadre",
        emoji: "🧭",
        text: "Tu définis ton aventure (objectif, contraintes, rythme). Le jeu devient ton contrat avec toi-même.",
    },
    {
        title: "Forge des quêtes jouables",
        emoji: "📜",
        text: "Chaque tâche devient un ordre de mission clair. Une ligne d’arrivée. Une micro-consigne finale.",
    },
    {
        title: "Progresse en chapitres",
        emoji: "🏆",
        text: "Quêtes accomplies → Renommée → niveaux. Ton effort devient visible, traçable, narré.",
    },
] as const;

const BENEFITS = [
    {
        emoji: "⚡",
        title: "Moins de friction",
        text: "Un seul prochain pas. Pas de pression de “tout faire”. Juste avancer.",
    },
    {
        emoji: "🧠",
        title: "Plus de clarté",
        text: "Contexte global d’aventure + focus du chapitre = direction stable, même dans le chaos.",
    },
    {
        emoji: "🔥",
        title: "Momentum réel",
        text: "Démarrer, faire, finir. La Renommée rend tes progrès concrets et addictifs (dans le bon sens).",
    },
    {
        emoji: "🎭",
        title: "Un MJ vivant",
        text: "Encouragements, félicitations, récits. Une voix qui te suit et te cadre sans te juger.",
    },
] as const;

const LOOP = [
    {
        emoji: "🧪",
        title: "Contexte d’aventure",
        text: "Le “pourquoi” et les règles du monde. Priorités, limites, ce que tu refuses de sacrifier.",
        chips: ["Objectif long-terme", "Contraintes", "Règles personnelles"],
    },
    {
        emoji: "🧩",
        title: "Focus de chapitre",
        text: "Le “quoi maintenant”. Un angle simple (7-14 jours) qui réduit le bruit.",
        chips: ["Angle du moment", "Rituel léger", "Cap hebdo"],
    },
    {
        emoji: "📜",
        title: "Ordres de mission",
        text: "Des quêtes courtes, concrètes, terminées par une micro-consigne. Pas une liste, un pas.",
        chips: ["Objectif clair", "Micro-pas final", "Difficulté"],
    },
    {
        emoji: "🏅",
        title: "Renommée & niveaux",
        text: "Progression visible: valeur, niveau, paliers. Tu vois ton arc, pas seulement tes tâches.",
        chips: ["Niveaux", "Badges", "Paliers narratifs"],
    },
    {
        emoji: "📓",
        title: "Journal & timeline",
        text: "Chronique + discussion fusionnées: un fil clair de ce qui s’est passé, décidé, accompli.",
        chips: ["Timeline", "Récit", "Synthèses"],
    },
] as const;

const FEATURES = [
    {
        emoji: "🧙",
        title: "Maître du Jeu personnalisable",
        text: "Choisis la voix: ton, style, verbosité. Un MJ calme, strict, drôle, ritualiste… c’est toi qui décides.",
    },
    {
        emoji: "🧭",
        title: "Profil joueur avancé",
        text: "Rythme de vie, pic d’énergie, style d’effort, relation à l’échec. Le jeu s’adapte à ta réalité.",
    },
    {
        emoji: "🗺️",
        title: "Chapitre = zone de jeu",
        text: "Une zone à la fois. Moins de dispersion. Plus d’impact. Les quêtes du chapitre se tiennent entre elles.",
    },
    {
        emoji: "🧱",
        title: "Micro-actions, gros résultat",
        text: "Renaissance est construit pour les jours “faible énergie”. Tu avances quand même, sans culpabilité.",
    },
    {
        emoji: "🎖️",
        title: "Badges & symbolique",
        text: "Pas des stickers vides: des sceaux qui marquent une victoire, un tournant, un rituel tenu.",
    },
    {
        emoji: "🪶",
        title: "Skins & atmosphère",
        text: "Même règles, sensation différente. Tu changes la texture du monde (typographies, panels, ambiance).",
    },
] as const;

const THEMES = [
    {
        title: "📜 Classic",
        desc: "Chaleur de grimoire. Ombres douces. Ambiance “livre de chapitre”.",
    },
    {
        title: "🟦 Cyber Ritual",
        desc: "Glyphes néon, panneaux-circuits. Précision, vitesse, étincelles.",
    },
    {
        title: "🌲 Forest Sigil",
        desc: "Runes verdoyantes. Focus calme. Comme rebâtir un sanctuaire.",
    },
    {
        title: "🪶 Ashen Codex",
        desc: "Élégance cendrée. Intensité feutrée. Pour les journées “on termine le dur”.",
    },
] as const;

const FAQ = [
    {
        q: "C’est une to-do app ?",
        a: "C’est une to-do, mais jouable: chapitres, quêtes, ordres de mission et un MJ qui transforme ton effort en progression visible.",
    },
    {
        q: "J’ai peu de temps, ça marche quand même ?",
        a: "Oui. Renaissance est pensé pour les micro-quêtes. Même 10 minutes deviennent une victoire traçable.",
    },
    {
        q: "Le MJ remplace un coach ?",
        a: "Le MJ remplace surtout le chaos: il cadre, recentre, encourage, et raconte. Le coaching humain peut venir plus tard, en bonus.",
    },
    {
        q: "Je peux changer l’UI ?",
        a: "Oui. Les skins changent l’atmosphère et le ressenti. Même boucle de jeu, vibe différente.",
    },
] as const;

/* ============================================================================
🧱 MAIN
============================================================================ */

export default function RenaissanceLandingPublic() {
    const router = useRouter();
    const theme = useUiSettingsStore((s) => s.theme);

    const goSignup = () => router.push("/auth/signup");
    const goSignin = () => router.push("/auth/signin");
    const goPricing = () => router.push("/pricing");

    return (
        <RpgShell
            title="Renaissance"
            subtitle="🛡️ Ton RPG du quotidien, à la lame douce 🗡️"
            returnButton={false}
            noRightSlot={true}
            largeLogo
        >
            <div className="grid gap-4">
                {/* =========================================================================
                 HERO (upgraded)
                ========================================================================= */}
                <div
                    className={cn(
                        "rounded-[28px] ring-1",
                        "bg-black/30 ring-white/10",
                        "relative overflow-hidden"
                    )}
                >
                    {/* aura / noise */}
                    <div
                        className="pointer-events-none absolute inset-0 opacity-90"
                        style={{
                            background:
                                "radial-gradient(900px 520px at 18% 12%, rgba(255,255,255,0.10), transparent 62%), radial-gradient(800px 540px at 80% 35%, rgba(255,255,255,0.06), transparent 58%), radial-gradient(900px 420px at 60% 95%, hsl(var(--accent)/0.10), transparent 55%)",
                        }}
                    />

                    {/* subtle grid */}
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.08]"
                        style={{
                            backgroundImage:
                                "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }}
                    />

                    <div className="relative p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                <Pill>🕯️ RPG de la vraie vie</Pill>
                                <Pill>🎭 MJ narratif</Pill>
                                <Pill>🏅 Renommée</Pill>
                                <Pill>🎨 Thème: {theme}</Pill>
                            </div>

                            <div className="flex items-center gap-2">
                                <ActionButton onClick={goSignin}>Se connecter</ActionButton>
                                <ActionButton variant="master" onClick={goSignup} hint="Gratuit">
                                    Créer un compte
                                </ActionButton>
                            </div>
                        </div>

                        <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                            {/* Left hero copy */}
                            <div>
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Renaissance
                                </div>

                                <h1 className="mt-2 font-main-title text-3xl sm:text-5xl text-white/95 leading-tight">
                                    Transforme ton chaos quotidien en quête jouable.
                                </h1>

                                <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                                    Pas une to-do de plus. Un système de progression:{" "}
                                    <span className="text-white/85">
                                        aventure → chapitres → quêtes → renommée → récit.
                                    </span>{" "}
                                    Tu ne “t’organises” pas… tu avances, et tu le vois.
                                </p>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    <ActionButton
                                        variant="master"
                                        onClick={goSignup}
                                        hint="Gratuit"
                                    >
                                        ✨ Lancer ta première aventure
                                    </ActionButton>
                                    <ActionButton variant="solid" onClick={goPricing}>
                                        🧾 Voir les tarifs
                                    </ActionButton>
                                    <ActionButton onClick={() => router.push("/new")}>
                                        👁️ Découvrir la boucle de jeu
                                    </ActionButton>
                                </div>

                                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                                    {[
                                        { k: "Micro-pas", v: "1 seul pas final" },
                                        { k: "Clarté", v: "global + focus" },
                                        { k: "Momentum", v: "renommée visible" },
                                    ].map((x) => (
                                        <div
                                            key={x.k}
                                            className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10"
                                        >
                                            <div className="text-xs tracking-[0.18em] text-white/55 uppercase">
                                                {x.k}
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-white/85">
                                                {x.v}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right hero “snapshot” */}
                            <div className="rounded-3xl bg-black/25 p-4 ring-1 ring-white/10">
                                <div className="text-white/90 font-semibold">
                                    🧠 À quoi ça ressemble ?
                                </div>
                                <div className="mt-2 text-xs text-white/55">
                                    Exemple de boucle en une journée
                                </div>

                                <div className="mt-4 space-y-3">
                                    <div className="rounded-2xl bg-black/30 p-3 ring-1 ring-white/10">
                                        <div className="text-xs text-white/55 uppercase tracking-[0.18em]">
                                            Aventure
                                        </div>
                                        <div className="mt-1 text-white/85 text-sm font-semibold">
                                            “Reprendre le contrôle”
                                        </div>
                                        <div className="mt-1 text-white/60 text-xs">
                                            Règle: 1 victoire {">"} 0 perfection.
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-black/30 p-3 ring-1 ring-white/10">
                                        <div className="text-xs text-white/55 uppercase tracking-[0.18em]">
                                            Chapitre (7 jours)
                                        </div>
                                        <div className="mt-1 text-white/85 text-sm font-semibold">
                                            “Semaine de clarté”
                                        </div>
                                        <div className="mt-1 text-white/60 text-xs">
                                            Focus: réduire la friction du matin.
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-black/30 p-3 ring-1 ring-white/10">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs text-white/55 uppercase tracking-[0.18em]">
                                                Quête
                                            </div>
                                            <Pill>⭐ Standard</Pill>
                                        </div>
                                        <div className="mt-1 text-white/85 text-sm font-semibold">
                                            “Préparer le sac”
                                        </div>
                                        <div className="mt-1 text-white/60 text-xs">
                                            Micro-pas: pose le sac près de la porte.
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-black/30 p-3 ring-1 ring-white/10">
                                        <div className="text-xs text-white/55 uppercase tracking-[0.18em]">
                                            Renommée
                                        </div>
                                        <div className="mt-1 text-white/85 text-sm font-semibold">
                                            +12 points • Niveau 3
                                        </div>
                                        <div className="mt-1 text-white/60 text-xs">
                                            Badge: “Jour faible énergie, jour gagné”.
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 text-xs text-white/45">
                                    Le MJ te parle, mais ne te juge pas. Il cadre.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* =========================================================================
                 LOOP DETAILS
                ========================================================================= */}
                <Panel
                    title="La boucle de jeu, en détail"
                    emoji="🧩"
                    subtitle="Un système stable qui transforme tes actions en progression."
                    right={
                        <ActionButton onClick={() => router.push("/new")}>
                            👁️ Voir un exemple
                        </ActionButton>
                    }
                >
                    <div className="grid gap-3 lg:grid-cols-5">
                        {LOOP.map((x) => (
                            <div
                                key={x.title}
                                className="rounded-3xl bg-black/30 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-white/90 font-semibold">
                                    {x.emoji} {x.title}
                                </div>
                                <div className="mt-2 rpg-text-sm text-white/65">{x.text}</div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {x.chips.map((c) => (
                                        <span
                                            key={c}
                                            className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60 ring-1 ring-white/10"
                                        >
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-white/85 font-semibold">
                            🗝️ Le secret (version claire)
                        </div>
                        <div className="mt-2 rpg-text-sm text-white/65">
                            Renaissance n’essaie pas de te faire “plus motivé”. Il te donne{" "}
                            <span className="text-white/85">un prochain pas jouable</span>, puis il{" "}
                            <span className="text-white/85">rend ta progression visible</span>.
                        </div>
                    </div>
                </Panel>

                {/* =========================================================================
                 HOW IT WORKS (short + punchy)
                ========================================================================= */}
                <Panel title="Comment ça marche" emoji="🏁" subtitle="En 3 mouvements, sans bruit.">
                    <div className="grid gap-3 sm:grid-cols-3">
                        {STEPS.map((s) => (
                            <div
                                key={s.title}
                                className="rounded-3xl bg-black/30 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-white/90 font-semibold">
                                    {s.emoji} {s.title}
                                </div>
                                <div className="mt-2 rpg-text-sm text-white/65">{s.text}</div>
                            </div>
                        ))}
                    </div>
                </Panel>

                {/* =========================================================================
                 BENEFITS
                ========================================================================= */}
                <Panel
                    title="Ce que tu y gagnes"
                    emoji="🎁"
                    subtitle="Des bénéfices concrets, sans fumée motivationnelle."
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        {BENEFITS.map((b) => (
                            <div
                                key={b.title}
                                className="rounded-3xl bg-black/30 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-white/90 font-semibold">
                                    {b.emoji} {b.title}
                                </div>
                                <div className="mt-2 rpg-text-sm text-white/65">{b.text}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        {[
                            {
                                title: "📓 Timeline unique",
                                text: "Chronique + discussion fusionnées. Un fil chronologique propre, lisible, actionnable.",
                            },
                            {
                                title: "🧠 Contexte hiérarchisé",
                                text: "Le global guide. Le chapitre ajuste. Les quêtes exécutent. Fini les tâches orphelines.",
                            },
                            {
                                title: "🎭 Narration utile",
                                text: "Le MJ n’écrit pas pour faire joli: il cadre, relie, scelle, te remet sur les rails.",
                            },
                        ].map((x) => (
                            <div
                                key={x.title}
                                className="rounded-3xl bg-black/25 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-white/90 font-semibold">{x.title}</div>
                                <div className="mt-2 rpg-text-sm text-white/65">{x.text}</div>
                            </div>
                        ))}
                    </div>
                </Panel>

                {/* =========================================================================
                 FEATURES (more detailed)
                ========================================================================= */}
                <Panel
                    title="Ce qui rend Renaissance différent"
                    emoji="🧙"
                    subtitle="Des features pensées pour une niche engagée: geeks, joueurs, builders."
                    right={<ActionButton onClick={goPricing}>🧾 Tarifs</ActionButton>}
                >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map((f) => (
                            <div
                                key={f.title}
                                className="rounded-3xl bg-black/30 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-white/90 font-semibold">
                                    {f.emoji} {f.title}
                                </div>
                                <div className="mt-2 rpg-text-sm text-white/65">{f.text}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-white/85 font-semibold">🧠 Philosophie</div>
                        <div className="mt-2 rpg-text-sm text-white/65">
                            Tu n’as pas besoin d’un système qui te crie “GO GO GO”. Tu as besoin
                            d’un système qui te dit:{" "}
                            <span className="text-white/85">
                                “Voici le prochain pas. Fais-le. Je m’occupe du reste.”
                            </span>
                        </div>
                    </div>
                </Panel>

                {/* =========================================================================
                 THEMES / SKINS
                ========================================================================= */}
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
                        {THEMES.map((t) => (
                            <div
                                key={t.title}
                                className="rounded-3xl bg-black/30 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-white/90 font-semibold">{t.title}</div>
                                <div className="mt-2 rpg-text-sm text-white/65">{t.desc}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-white/85 font-semibold">
                            🎨 Pourquoi c’est important
                        </div>
                        <div className="mt-2 rpg-text-sm text-white/65">
                            Ton cerveau réagit à l’ambiance. Les skins te permettent d’avoir un
                            “mode” qui colle à ton moment: apaiser, accélérer, terminer le dur,
                            reconstruire.
                        </div>
                    </div>
                </Panel>

                {/* =========================================================================
                 FAQ
                ========================================================================= */}
                <Panel title="FAQ" emoji="❓" subtitle="Réponses rapides avant de te lancer.">
                    <div className="space-y-2">
                        {FAQ.map((f) => (
                            <div
                                key={f.q}
                                className="rounded-3xl bg-black/30 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-white/90 font-semibold">{f.q}</div>
                                <div className="mt-2 rpg-text-sm text-white/65">{f.a}</div>
                            </div>
                        ))}
                    </div>
                </Panel>

                {/* =========================================================================
                 FINAL CTA (upgraded)
                ========================================================================= */}
                <div className="rounded-[28px] bg-black/30 p-6 sm:p-8 ring-1 ring-white/10 relative overflow-hidden">
                    <div
                        className="pointer-events-none absolute inset-0 opacity-80"
                        style={{
                            background:
                                "radial-gradient(900px 420px at 25% 0%, hsl(var(--accent)/0.18), transparent 60%), radial-gradient(700px 420px at 80% 65%, rgba(255,255,255,0.06), transparent 60%)",
                        }}
                    />

                    <div className="relative">
                        <div className="text-white/90 font-semibold text-lg">
                            🏁 Prêt à lancer ta Renaissance ?
                        </div>
                        <div className="mt-2 rpg-text-sm text-white/65 max-w-2xl">
                            Crée un compte, choisis un Maître du Jeu, puis transforme une action
                            minuscule en quête accomplie. La progression fait le reste.
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            <ActionButton variant="master" onClick={goSignup} hint="Gratuit">
                                ✨ Créer un compte
                            </ActionButton>
                            <ActionButton variant="solid" onClick={goPricing}>
                                🧾 Voir les tarifs
                            </ActionButton>
                            <ActionButton onClick={goSignin}>Se connecter</ActionButton>
                        </div>

                        <div className="mt-5 grid gap-2 sm:grid-cols-3">
                            {[
                                { t: "Zéro spam", d: "Juste des quêtes." },
                                { t: "Annulable", d: "Tu gardes ton histoire." },
                                { t: "Niche engagée", d: "Pour les joueurs du réel." },
                            ].map((x) => (
                                <div
                                    key={x.t}
                                    className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10"
                                >
                                    <div className="text-xs tracking-[0.18em] text-white/55 uppercase">
                                        {x.t}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-white/85">
                                        {x.d}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 text-xs text-white/45">
                            Tu ne cherches pas une app. Tu cherches un système. Renaissance est un
                            système.
                        </div>
                    </div>
                </div>
            </div>
        </RpgShell>
    );
}
