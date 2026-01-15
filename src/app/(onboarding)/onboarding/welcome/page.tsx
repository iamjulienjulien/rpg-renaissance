// src/app/onboarding/welcome/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import UiActionButton from "@/components/ui/UiActionButton";

import { useGameStore } from "@/stores/gameStore";
import type { Adventure } from "@/types/game";
import UiMagicCard from "@/components/ui/UiMagicCard";
import Helpers from "@/helpers";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧠 HELPERS
============================================================================ */

function safeText(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

/**
 * Render minimal markdown-ish:
 * - paragraphs
 * - **bold**
 * - list lines starting with "- "
 *
 * (On reste light pour ne pas ajouter de deps, et garder le style Onboarding.)
 */
function MdLite({ text }: { text: string }) {
    const blocks = useMemo(() => {
        const raw = safeText(text);
        if (!raw) return [];

        return raw
            .split("\n")
            .map((l) => l.replace(/\r/g, ""))
            .join("\n")
            .split("\n\n")
            .map((b) => b.trim())
            .filter(Boolean);
    }, [text]);

    if (!blocks.length) return null;

    const renderInline = (s: string) => {
        // very small bold support: **text**
        const parts = s.split("**");
        if (parts.length === 1) return s;

        return parts.map((p, i) =>
            i % 2 === 1 ? (
                <strong key={i} className="text-white/90 font-semibold">
                    {p}
                </strong>
            ) : (
                <React.Fragment key={i}>{p}</React.Fragment>
            )
        );
    };

    return (
        <div className="space-y-3">
            {blocks.map((b, idx) => {
                const lines = b.split("\n").filter(Boolean);

                const isList = lines.length > 1 && lines.every((l) => l.trim().startsWith("- "));
                if (isList) {
                    return (
                        <ul
                            key={idx}
                            className="list-disc pl-5 space-y-1 text-white/70 rpg-text-sm"
                        >
                            {lines.map((l, i) => (
                                <li key={i}>{renderInline(l.trim().replace(/^- /, ""))}</li>
                            ))}
                        </ul>
                    );
                }

                return (
                    <p key={idx} className="text-white/70 rpg-text-sm">
                        {renderInline(b)}
                    </p>
                );
            })}
        </div>
    );
}

/* ============================================================================
✅ PAGE
============================================================================ */

export default function OnboardingWelcomePage() {
    const router = useRouter();

    const reload = useGameStore((s) => s.reload);
    const adventure = useGameStore((s) => s.currentAdventure as Adventure | null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                // On charge juste l’aventure (qui contient welcome_text)
                await reload(["adventure", "characters", "profile"]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const welcomeText = safeText((adventure as any)?.welcome_text);

    const advTitle = adventure?.title ?? adventure?.type_title ?? "Aventure";
    const advDesc = safeText((adventure as any)?.description);

    return (
        <RpgShell
            title="Bienvenue"
            subtitle="Le Maître du Jeu te remet les clés. Ensuite, on part à l’aventure. 🗝️"
            noRightSlot
            returnButton={false}
            largeLogo
        >
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement du message du MJ…
                </div>
            ) : (
                <div className="grid gap-4">
                    {/* HERO */}
                    <div
                        className={cn(
                            "relative overflow-hidden rounded-[28px] ring-1",
                            "bg-black/30 ring-white/10"
                        )}
                    >
                        {/* Background image */}
                        <div
                            className="absolute inset-0 bg-no-repeat bg-position-[right_bottom_-4rem] bg-size-[auto_250px]"
                            style={{
                                backgroundImage: "url('/assets/images/onboarding/welcome.png')",
                            }}
                        />

                        {/* Gradient overlay */}
                        <div
                            className={cn(
                                "absolute inset-0",
                                "bg-gradient-to-r",
                                "from-black via-black/85 to-transparent"
                            )}
                        />

                        <div className="relative p-6 sm:p-8">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    Renaissance
                                </div>
                                {/* <Pill>🌍 {advTitle}</Pill> */}
                            </div>

                            <h1 className="mt-4 font-main-title text-3xl sm:text-4xl text-white/95">
                                Le seuil est franchi.
                            </h1>

                            {advDesc ? (
                                <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                                    {advDesc}
                                </p>
                            ) : (
                                <p className="mt-4 max-w-2xl text-white/70 rpg-text-sm">
                                    Ton aventure prend forme. Le Maître du Jeu ouvre la scène.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* MJ Welcome Message */}
                    <Panel
                        title="Message du Maître du Jeu"
                        emoji="🎭"
                        subtitle="Un accueil et une direction. Garde-le en tête."
                        right={<Helpers.Adventure.Character.Chip />}
                    >
                        {!welcomeText ? (
                            <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                                Aucun message de bienvenue n’a été trouvé pour cette aventure.
                                <div className="mt-3 text-xs text-white/45">
                                    (Vérifie que{" "}
                                    <span className="font-mono">adventures.welcome_text</span> est
                                    bien rempli.)
                                </div>
                            </div>
                        ) : (
                            <UiMagicCard showHeader={false} gradient="aurora">
                                {/* // <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"> */}
                                {/* <MdLite text={welcomeText} /> */}
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => (
                                            <p className="[&:not(:last-child)]:my-4">{children}</p>
                                        ),
                                        ul: ({ children }) => (
                                            <ul className="my-4 list-disc pl-6">{children}</ul>
                                        ),
                                        li: ({ children }) => <li className="my-1">{children}</li>,
                                        strong: ({ children }) => (
                                            <strong className="text-white">{children}</strong>
                                        ),
                                    }}
                                >
                                    {welcomeText}
                                </ReactMarkdown>
                                {/* </div> */}
                            </UiMagicCard>
                        )}
                    </Panel>

                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Rules */}
                        <Panel
                            title="Règles de l’aventure"
                            emoji="📜"
                            subtitle="Simple, jouable, et fait pour durer."
                        >
                            <div className="space-y-3">
                                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                    <div className="text-xs tracking-[0.18em] text-white/55">
                                        PRINCIPES
                                    </div>
                                    <div className="mt-3 space-y-2 rpg-text-sm text-white/70">
                                        <p>
                                            <strong className="text-white/90">
                                                1) Une quête = une action réelle.
                                            </strong>{" "}
                                            Chaque quête doit être faisable, concrète, et liée à ton
                                            quotidien.
                                        </p>
                                        <p>
                                            <strong className="text-white/90">
                                                2) Le rythme prime.
                                            </strong>{" "}
                                            Mieux vaut peu mais souvent que beaucoup puis plus rien.
                                        </p>
                                        <p>
                                            <strong className="text-white/90">
                                                3) Le monde s’adapte.
                                            </strong>{" "}
                                            Les chapitres, les quêtes et le ton du MJ évoluent selon
                                            toi.
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                                    <div className="text-xs tracking-[0.18em] text-white/55">
                                        CONSEIL DU MJ
                                    </div>
                                    <div className="mt-3 rpg-text-sm text-white/70">
                                        Commence petit, gagne du terrain, puis élargis. Ton aventure
                                        est un sentier, pas un sprint.
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        {/* Renown */}
                        <Panel
                            title="Gagner de la renommée"
                            emoji="⭐"
                            subtitle="La renommée mesure ta progression. Pas ton perfectionnisme."
                        >
                            <div className="space-y-3">
                                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                    <div className="text-xs tracking-[0.18em] text-white/55">
                                        COMMENT ÇA MONTE
                                    </div>

                                    <ul className="mt-3 list-disc pl-5 space-y-2 rpg-text-sm text-white/70">
                                        <li>
                                            Finir des quêtes, surtout celles qui font avancer ton
                                            foyer, ton énergie ou tes objectifs.
                                        </li>
                                        <li>
                                            Tenir un rythme (régularité). Les petites victoires
                                            s’additionnent.
                                        </li>
                                        <li>
                                            Débloquer des badges (moments clés, premières fois,
                                            paliers).
                                        </li>
                                        <li>
                                            Progresser dans les chapitres: tu clarifies ton
                                            histoire, tu avances.
                                        </li>
                                    </ul>
                                </div>

                                <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                                    <div className="text-xs tracking-[0.18em] text-white/55">
                                        IMPORTANT
                                    </div>
                                    <div className="mt-3 rpg-text-sm text-white/70">
                                        La renommée ne récompense pas l’intensité ponctuelle. Elle
                                        récompense la constance et la justesse.
                                    </div>
                                </div>
                            </div>
                        </Panel>
                    </div>

                    {/* Dev note */}
                    <Panel
                        title="Un mot du développeur"
                        emoji="🛠️"
                        subtitle="Pourquoi ce jeu existe."
                        // right={<Pill>by Julien</Pill>}
                    >
                        <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                            <div className="space-y-3 rpg-text-sm text-white/70">
                                <p>
                                    Renaissance n’est pas né d’une idée de produit.
                                    <br />
                                    Il est né d’un besoin personnel.
                                </p>

                                <p>
                                    À un moment où tout devenait flou, où les journées
                                    s’enchaînaient sans laisser de traces claires, j’ai ressenti le
                                    manque d’un cadre.
                                </p>

                                <p>
                                    Pas un cadre rigide.
                                    <br />
                                    Un cadre qui donne du sens, qui transforme l’effort en
                                    progression visible, qui raconte une histoire au lieu d’aligner
                                    des tâches.
                                </p>

                                <p>
                                    Je ne voulais pas d’une énième to-do list déguisée.
                                    <br />
                                    Je voulais quelque chose qui parle, qui accompagne, qui respecte
                                    les hauts et les bas.
                                </p>

                                <p>
                                    C’est comme ça qu’est née{" "}
                                    <strong className="text-white/90">Renaissance</strong>.
                                </p>

                                <hr className="my-4 border-white/10" />

                                <p>
                                    Renaissance part d’une idée simple:
                                    <br />
                                    👉 ta vie est déjà une aventure, mais personne ne t’a jamais
                                    donné la carte, ni la voix pour la raconter.
                                </p>

                                <p>
                                    Alors j’ai imaginé un{" "}
                                    <strong className="text-white/90">Maître du Jeu</strong>.
                                </p>

                                <p>
                                    Pas pour te juger.
                                    <br />
                                    Pas pour te pousser à la performance.
                                </p>

                                <p>
                                    Mais pour mettre des mots sur ton chemin, te rappeler où tu en
                                    es, et te donner envie d’avancer, un pas après l’autre.
                                </p>

                                <p>
                                    Ici, tu ne coches pas des cases.
                                    <br />
                                    Tu complètes des quêtes.
                                </p>

                                <p>
                                    Tu ne poursuis pas des objectifs abstraits.
                                    <br />
                                    Tu gagnes de la renommée, parce que chaque effort compte, même
                                    les plus discrets.
                                </p>

                                <hr className="my-4 border-white/10" />

                                <p>Renaissance n’est pas là pour te dire comment vivre.</p>

                                <p>
                                    Il est là pour t’aider à te remettre en mouvement, à ton rythme,
                                    dans le réel.
                                </p>

                                <p>
                                    Certaines journées seront héroïques.
                                    <br />
                                    D’autres seront simplement honnêtes.
                                    <br />
                                    Les deux ont de la valeur.
                                </p>

                                <hr className="my-4 border-white/10" />

                                <p className="text-white/70">Ce projet est vivant.</p>

                                <p className="text-white/70">
                                    Il évolue avec celles et ceux qui y jouent, qui l’utilisent, qui
                                    le questionnent.
                                </p>

                                <p className="text-white/70">
                                    Si quelque chose te frustre, te manque, ou te donne une idée…
                                    note-le.
                                    <br />
                                    Renaissance s’améliore par les retours, les détours, et parfois
                                    même les échecs.
                                </p>

                                <p>
                                    Merci d’être là.
                                    <br />
                                    Merci de tenter l’aventure.
                                </p>

                                <p>Le reste commence maintenant. ✨</p>

                                <p className="mt-6 text-right text-white/50 italic">
                                    — Julien, créateur de Renaissance
                                </p>
                            </div>
                        </div>
                    </Panel>

                    {/* CTA */}
                    <div className="grid gap-3">
                        <UiActionButton
                            variant="master"
                            size="xl"
                            onClick={() => router.push("/adventure")}
                        >
                            🚀 Lancer l'aventure
                        </UiActionButton>

                        {/* <div className="text-xs text-white/50 text-center">
                            Prochaine étape: choisir tes premières quêtes. 🗡️
                        </div>

                        <div className="flex justify-center">
                            <ActionButton
                                variant="soft"
                                onClick={() => router.push("/onboarding/quests")}
                            >
                                ↩️ Revenir aux quêtes
                            </ActionButton>
                        </div> */}
                    </div>
                </div>
            )}
        </RpgShell>
    );
}
