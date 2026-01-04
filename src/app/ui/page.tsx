// src/app/ui/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import MasterCard from "@/components/MasterCard";

// ✅ NEW: Onboarding components showcase
import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { StickyCtaBar } from "@/components/onboarding/StickyCtaBar";
import { ChoiceCard } from "@/components/onboarding/ChoiceCard";
import { InlineNotice, EmptyState } from "@/components/onboarding/InlineNotice";

import UIActionButtonPanel from "@/app/ui/_panels/UiActionButtonPanel";
import UiActionButtonGroupPanel from "./_panels/UiActionButtonGroupPanel";
import UiChipPanel from "./_panels/UiChipPanel";
import UiGradientPanelPanel from "./_panels/UiGradientPanelPanel";
import UiPillPanel from "./_panels/UiPillPanel";
import UiPanelPanel from "./_panels/UiPanelPanel";
import { UiFormSelect } from "@/components/ui/UiFormSelect";
import UiFormSelectPanel from "./_panels/UiFormSelectPanel";
import UiFormTextPanelV2 from "./_panels/UiFormTextPanelV2";
import UiCardPanel from "./_panels/UiCardPanel";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function CodeBlock({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 900);
        } catch {
            // noop
        }
    };

    return (
        <div className="mt-3 rounded-2xl bg-black/40 ring-1 ring-white/10 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
                <div className="text-xs tracking-[0.18em] text-white/50">CODE</div>
                <ActionButton onClick={onCopy} variant="soft">
                    {copied ? "✅ Copié" : "📋 Copier"}
                </ActionButton>
            </div>

            <pre className="p-4 overflow-auto text-xs leading-relaxed text-white/70">
                <code>{code}</code>
            </pre>
        </div>
    );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="space-y-1">
            <div className="text-lg font-semibold text-white/90">{title}</div>
            {subtitle ? <div className="text-sm text-white/55">{subtitle}</div> : null}
        </div>
    );
}

export default function UiShowcasePage() {
    const [toggle, setToggle] = useState(false);
    const [variant, setVariant] = useState<"soft" | "solid" | "master">("solid");

    // ✅ NEW: onboarding showcase states
    const [stepKey, setStepKey] = useState<"adventure" | "identity" | "quests" | "finish">(
        "identity"
    );

    const [cardSelected, setCardSelected] = useState<Record<string, boolean>>({
        kitchen: true,
        bedroom: false,
    });

    const [noticeTone, setNoticeTone] = useState<"info" | "warning" | "error" | "success">("info");

    const snippets = useMemo(() => {
        return {
            pills: `import { Pill } from "@/components/RpgUi";

<Pill>⌘K</Pill>
<Pill>🧙 Mage</Pill>
<Pill>✅ Disponible</Pill>`,

            buttons: `import { ActionButton } from "@/components/RpgUi";

<ActionButton onClick={() => {}}>Soft</ActionButton>

<ActionButton variant="solid" onClick={() => {}}>
    Solid
</ActionButton>

<ActionButton disabled onClick={() => {}}>
    Disabled
</ActionButton>`,

            panel: `import { Panel, Pill } from "@/components/RpgUi";

<Panel
    title="Backlog de quêtes"
    emoji="📜"
    subtitle="Définis les missions avant de jouer."
    right={<Pill>7 quêtes</Pill>}
>
    <div>Contenu…</div>
</Panel>`,

            form: `const [roomCode, setRoomCode] = useState("");
const [title, setTitle] = useState("");
const [difficulty, setDifficulty] = useState<1|2|3>(2);

<select value={roomCode} onChange={(e)=>setRoomCode(e.target.value)} className="...">
    <option value="">🗺️ Tous les lieux</option>
    <option value="cuisine">🚪 Cuisine</option>
</select>

<textarea
    value={title}
    onChange={(e)=>setTitle(e.target.value)}
    placeholder="Ex: Vider le plan de travail…"
    className="..."
/>

<select value={difficulty} onChange={(e)=>setDifficulty(Number(e.target.value) as 1|2|3)} className="...">
    <option value={1}>🟢 Douce</option>
    <option value={2}>🟡 Équilibrée</option>
    <option value={3}>🔴 Corsée</option>
</select>

<ActionButton variant="solid" onClick={() => {}}>
    ➕ Ajouter au backlog
</ActionButton>`,

            cards: `function Card({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
            <div className="text-white/90 font-semibold">{title}</div>
            {subtitle ? <div className="mt-2 text-sm text-white/60">{subtitle}</div> : null}
        </div>
    );
}`,

            masterCard: `import MasterCard from "@/components/ui/MasterCard";

<MasterCard
    title="Ordre de mission"
    badgeText="Maître du jeu"
>
    <p>Julien, le foyer a besoin de clarté.</p>
    <p className="mt-3">
        Commence par une action simple et visible.
        Une tâche terminée ouvre toujours la suivante.
    </p>
</MasterCard>`,

            masterCardSuccess: `import MasterCard from "@/components/ui/MasterCard";

<MasterCard
    title="Mission accomplie"
    badgeText="Maître du jeu"
>
    <p>Bien joué.</p>
    <p className="mt-3">
        L’espace est plus calme.
        Prends un instant avant de repartir.
    </p>
</MasterCard>`,

            layout: `// Mise en page 2 colonnes responsive
<div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
    <div>Colonne gauche</div>
    <div>Colonne droite</div>
</div>`,

            // ✅ NEW: onboarding snippets
            stepper: `import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";

<OnboardingStepper
    activeKey="identity"
    steps={[
        { key: "adventure", label: "Aventure", emoji: "🧭" },
        { key: "identity", label: "Identité", emoji: "🪞" },
        { key: "quests", label: "Pièces & Quêtes", emoji: "📜" },
        { key: "finish", label: "Lancement", emoji: "🏁" },
    ]}
/>`,

            sticky: `import { StickyCtaBar } from "@/components/onboarding/StickyCtaBar";
import { ActionButton } from "@/components/RpgUi";

<StickyCtaBar>
    <ActionButton variant="master" className="w-full justify-center py-4 rounded-3xl text-base">
        ✨ Continuer
    </ActionButton>
</StickyCtaBar>`,

            choiceCard: `import { ChoiceCard } from "@/components/onboarding/ChoiceCard";
import { Pill } from "@/components/RpgUi";

<ChoiceCard
    title="🚪 Cuisine"
    subtitle="Zone à haute fréquence, impact immédiat."
    selected={true}
    metaRight={<Pill>🟡</Pill>}
    onClick={() => {}}
/>`,

            notice: `import { InlineNotice, EmptyState } from "@/components/onboarding/InlineNotice";

<InlineNotice tone="warning">⚠️ Ajoute au moins une pièce.</InlineNotice>

<EmptyState
    emoji="📭"
    title="Aucune quête"
    subtitle="Ajoute-en une ou laisse l’IA t’aider."
/>`,
        };
    }, []);

    return (
        <RpgShell
            title="UI Kit"
            subtitle="Vitrine interne: composants, styles, patterns, snippets copiables."
        >
            <div className="grid gap-4">
                <UIActionButtonPanel />
                <UiActionButtonGroupPanel />
                <UiPillPanel />
                <UiChipPanel />
                <UiCardPanel />
                <UiPanelPanel />
                <UiGradientPanelPanel />
                <UiFormTextPanelV2 />
                <UiFormSelectPanel />

                {/* ✅ NEW: Onboarding UI */}
                <Panel
                    title="Onboarding UI"
                    emoji="🧭"
                    subtitle="Composants dédiés à l’onboarding: progression, CTA sticky, cartes choix, états."
                    right={<Pill>4 composants</Pill>}
                >
                    <div className="grid gap-4">
                        {/* Stepper */}
                        <div>
                            <SectionTitle
                                title="OnboardingStepper"
                                subtitle="Progression + étapes. Clique pour changer l’étape active."
                            />

                            <div className="mt-3 flex flex-wrap gap-2">
                                <ActionButton
                                    variant={stepKey === "adventure" ? "solid" : "soft"}
                                    onClick={() => setStepKey("adventure")}
                                >
                                    🧭 Aventure
                                </ActionButton>
                                <ActionButton
                                    variant={stepKey === "identity" ? "solid" : "soft"}
                                    onClick={() => setStepKey("identity")}
                                >
                                    🪞 Identité
                                </ActionButton>
                                <ActionButton
                                    variant={stepKey === "quests" ? "solid" : "soft"}
                                    onClick={() => setStepKey("quests")}
                                >
                                    📜 Quêtes
                                </ActionButton>
                                <ActionButton
                                    variant={stepKey === "finish" ? "solid" : "soft"}
                                    onClick={() => setStepKey("finish")}
                                >
                                    🏁 Finish
                                </ActionButton>
                            </div>

                            <div className="mt-3">
                                <OnboardingStepper
                                    activeKey={stepKey}
                                    steps={[
                                        { key: "adventure", label: "Aventure", emoji: "🧭" },
                                        { key: "identity", label: "Identité", emoji: "🪞" },
                                        { key: "quests", label: "Pièces & Quêtes", emoji: "📜" },
                                        { key: "finish", label: "Lancement", emoji: "🏁" },
                                    ]}
                                />
                            </div>

                            <CodeBlock code={snippets.stepper} />
                        </div>

                        {/* ChoiceCard */}
                        <div>
                            <SectionTitle
                                title="ChoiceCard"
                                subtitle="Cartes sélectionnables (pièces, quêtes, options)."
                            />

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <ChoiceCard
                                    title="🚪 Cuisine"
                                    subtitle="Zone à haute fréquence. Effet immédiat."
                                    selected={!!cardSelected.kitchen}
                                    metaRight={<Pill>🟡 Diff 2</Pill>}
                                    onClick={() =>
                                        setCardSelected((s) => ({ ...s, kitchen: !s.kitchen }))
                                    }
                                />

                                <ChoiceCard
                                    title="🛏️ Chambre"
                                    subtitle="Calme, routine, petites victoires."
                                    selected={!!cardSelected.bedroom}
                                    metaRight={<Pill>🟢 Diff 1</Pill>}
                                    onClick={() =>
                                        setCardSelected((s) => ({ ...s, bedroom: !s.bedroom }))
                                    }
                                />
                            </div>

                            <CodeBlock code={snippets.choiceCard} />
                        </div>

                        {/* InlineNotice + EmptyState */}
                        <div>
                            <SectionTitle
                                title="InlineNotice & EmptyState"
                                subtitle="États de feedback cohérents (info/warning/error/success) + vide."
                            />

                            <div className="mt-3 flex flex-wrap gap-2">
                                <ActionButton
                                    variant={noticeTone === "info" ? "solid" : "soft"}
                                    onClick={() => setNoticeTone("info")}
                                >
                                    info
                                </ActionButton>
                                <ActionButton
                                    variant={noticeTone === "success" ? "solid" : "soft"}
                                    onClick={() => setNoticeTone("success")}
                                >
                                    success
                                </ActionButton>
                                <ActionButton
                                    variant={noticeTone === "warning" ? "solid" : "soft"}
                                    onClick={() => setNoticeTone("warning")}
                                >
                                    warning
                                </ActionButton>
                                <ActionButton
                                    variant={noticeTone === "error" ? "solid" : "soft"}
                                    onClick={() => setNoticeTone("error")}
                                >
                                    error
                                </ActionButton>
                            </div>

                            <div className="mt-3 space-y-3">
                                <InlineNotice tone={noticeTone}>
                                    {noticeTone === "info"
                                        ? "ℹ️ Tu peux compléter ça plus tard. Rien n’est gravé dans le marbre."
                                        : noticeTone === "success"
                                          ? "✅ Parfait. Le MJ a pris note."
                                          : noticeTone === "warning"
                                            ? "⚠️ Ajoute au moins une pièce pour continuer."
                                            : "🧨 Impossible de sauvegarder. Réessaie."}
                                </InlineNotice>

                                <EmptyState
                                    emoji="📭"
                                    title="Aucune quête"
                                    subtitle="Ajoute-en une ou laisse l’IA t’aider."
                                />
                            </div>

                            <CodeBlock code={snippets.notice} />
                        </div>

                        {/* Sticky CTA */}
                        <div>
                            <SectionTitle
                                title="StickyCtaBar"
                                subtitle="Barre sticky en bas, parfaite pour le bouton principal."
                            />

                            <div className="mt-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                <div className="text-sm text-white/70">
                                    Scrolle un peu: la barre reste en bas (si la page dépasse).
                                </div>

                                <div className="mt-4">
                                    <StickyCtaBar>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="text-xs text-white/60">
                                                Étape actuelle:{" "}
                                                <b className="text-white/80">{stepKey}</b>
                                            </div>

                                            <ActionButton
                                                variant="master"
                                                className="w-full sm:w-auto justify-center py-4 rounded-3xl text-base"
                                                onClick={() => setToggle((v) => !v)}
                                            >
                                                {toggle ? "✅ Validé" : "✨ Continuer"}
                                            </ActionButton>
                                        </div>
                                    </StickyCtaBar>
                                </div>
                            </div>

                            <CodeBlock code={snippets.sticky} />
                        </div>
                    </div>
                </Panel>

                {/* Cards / list items */}
                <Panel
                    title="Cartes"
                    emoji="🧩"
                    subtitle="Items de liste (quêtes, pièces, entrées)."
                    right={<Pill>Pattern</Pill>}
                >
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-white/90 font-semibold">
                                    📌 Ranger les placards
                                </div>
                                <div className="flex items-center gap-2">
                                    <Pill>🚪 Cuisine</Pill>
                                    <Pill>🟡 Équilibrée</Pill>
                                </div>
                            </div>
                            <div className="mt-2 text-sm text-white/60">
                                📝 Description optionnelle. (On peut jouer sans.)
                            </div>
                        </div>

                        <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-white/90 font-semibold">
                                    📌 Trier 20 objets
                                </div>
                                <div className="flex items-center gap-2">
                                    <Pill>🗺️ Global</Pill>
                                    <Pill>🟢 Douce</Pill>
                                </div>
                            </div>
                            <div className="mt-2 text-sm text-white/60">
                                Stop quand le minuteur sonne.
                            </div>
                        </div>
                    </div>

                    <CodeBlock code={snippets.cards} />
                </Panel>

                {/* MasterCard (IA / narration) */}
                <Panel
                    title="MasterCard"
                    emoji="🧙"
                    subtitle="Messages narratifs du Maître du Jeu (IA)."
                    right={<Pill>IA</Pill>}
                >
                    <div className="space-y-6">
                        <div>
                            <SectionTitle
                                title="Ordre de mission"
                                subtitle="Introduction narrative + consigne claire."
                            />

                            <div className="mt-3">
                                <MasterCard title="Ordre de mission" badgeText="Maître du jeu">
                                    <p className="text-white/85">
                                        Julien, le foyer a besoin de clarté.
                                    </p>
                                    <p className="mt-3 text-white/75">
                                        Commence par une action simple, visible et finissable
                                        rapidement. Une tâche accomplie prépare toujours la suite.
                                    </p>
                                </MasterCard>

                                <CodeBlock code={snippets.masterCard} />
                            </div>
                        </div>

                        <div>
                            <SectionTitle
                                title="Feedback de réussite"
                                subtitle="Court, gratifiant, tourné vers la suite."
                            />

                            <div className="mt-3">
                                <MasterCard title="Mission accomplie" badgeText="Maître du jeu">
                                    <p className="text-white/85">Bien joué.</p>
                                    <p className="mt-3 text-white/75">
                                        L’espace est plus calme. Prends un instant pour apprécier
                                        avant de repartir à l’aventure.
                                    </p>
                                </MasterCard>

                                <CodeBlock code={snippets.masterCardSuccess} />
                            </div>
                        </div>

                        <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                            <div className="text-xs tracking-[0.18em] text-white/55">
                                BONNES PRATIQUES
                            </div>
                            <ul className="mt-2 space-y-2 text-sm text-white/65">
                                <li>• Réserver MasterCard aux messages narratifs forts</li>
                                <li>• Une mission = une carte</li>
                                <li>• Paragraphes courts, respirants</li>
                                <li>• Pas de formulaires ni listes techniques dedans</li>
                            </ul>
                        </div>
                    </div>
                </Panel>

                {/* Form patterns */}
                <Panel
                    title="Formulaire (pattern backlog)"
                    emoji="📝"
                    subtitle="Select + champ grand + difficulté + CTA. (Stack vertical recommandé.)"
                    right={<Pill>Form</Pill>}
                >
                    <div className="grid gap-3">
                        <div>
                            <SectionTitle
                                title="Lieu"
                                subtitle="La pièce à laquelle la quête s’accroche."
                            />
                            <select
                                className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-white/80 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                                defaultValue=""
                            >
                                <option value="">🗺️ Tous les lieux</option>
                                <option value="cuisine">🚪 Cuisine</option>
                                <option value="chambre">🚪 Chambre</option>
                                <option value="cave">🚪 Cave</option>
                            </select>
                        </div>

                        <div>
                            <SectionTitle
                                title="Nom de la quête"
                                subtitle="Court, actionnable, sans blabla."
                            />
                            <textarea
                                rows={3}
                                placeholder="Ex: Vider le plan de travail (10 min)…"
                                className={cn(
                                    "mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-white/90",
                                    "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                    "focus:ring-2 focus:ring-white/25 resize-y"
                                )}
                            />
                            <div className="mt-2 text-xs text-white/50">
                                Astuce: “petit et fini” bat “grand et jamais”. ⏱️
                            </div>
                        </div>

                        <div>
                            <SectionTitle
                                title="Intensité"
                                subtitle="Choisis l’effort, le jeu adapte la narration."
                            />
                            <select
                                className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-white/80 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                                defaultValue="2"
                            >
                                <option value="1">🟢 Douce</option>
                                <option value="2">🟡 Équilibrée</option>
                                <option value="3">🔴 Corsée</option>
                            </select>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                            <ActionButton variant="soft" onClick={() => {}}>
                                ↩️ Annuler
                            </ActionButton>
                            <ActionButton variant="solid" onClick={() => {}}>
                                ➕ Ajouter au backlog
                            </ActionButton>
                        </div>
                    </div>

                    <CodeBlock code={snippets.form} />
                </Panel>

                {/* Layout */}
                <Panel
                    title="Layout"
                    emoji="🗺️"
                    subtitle="Grilles responsive (2 colonnes sur desktop)."
                    right={<Pill>Grid</Pill>}
                >
                    <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 text-white/70">
                        Utilise une grille simple: une colonne “contenu principal” et une colonne
                        “support” (IA, tips, actions secondaires).
                    </div>
                    <CodeBlock code={snippets.layout} />
                </Panel>

                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/65">
                    ✅ Cette page est volontairement “interne”. Ne la linke nulle part, mais
                    garde-la comme référence pour itérer vite sur le style.
                </div>
            </div>
        </RpgShell>
    );
}
