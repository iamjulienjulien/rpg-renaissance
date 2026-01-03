// src/app/ui/_panels/UiPanelPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanel from "../UiComponentPanel";
import { UiPill } from "@/components/ui/UiPill";
import UIActionButtonGroup from "@/components/ui/UiActionButtonGroup";
import type { UIActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";
import { UiPanel } from "@/components/ui/UiPanel";

type Variant = "default" | "soft" | "ghost";
type Tone = "theme" | "neutral";

export default function UiPanelPanel() {
    const [variant, setVariant] = useState<Variant>("default");
    const [tone, setTone] = useState<Tone>("theme");
    const [padded, setPadded] = useState(true);

    const [showHeader, setShowHeader] = useState(true);
    const [showSubtitle, setShowSubtitle] = useState(true);
    const [showRight, setShowRight] = useState(true);
    const [showFooter, setShowFooter] = useState(false);

    const [collapsible, setCollapsible] = useState(false);
    const [defaultOpen, setDefaultOpen] = useState(true);

    const code = useMemo(() => {
        const lines: string[] = [];
        lines.push(`import { UiPanel } from "@/components/ui/UiPanel";\n`);
        lines.push(`<UiPanel`);

        if (showHeader) {
            lines.push(`    title="UiPanel"`);
            lines.push(`    emoji="🧩"`);
            if (showSubtitle) lines.push(`    subtitle="Panel thème, option accordéon."`);
            if (showRight) lines.push(`    right={<UiPill tone="theme">Right</UiPill>}`);
        }

        lines.push(`    variant="${variant}"`);
        lines.push(`    tone="${tone}"`);
        if (!padded) lines.push(`    padded={false}`);

        if (collapsible) {
            lines.push(`    collapsible`);
            if (!defaultOpen) lines.push(`    defaultOpen={false}`);
        }

        if (showFooter) {
            lines.push(`    footer={<div className="text-xs text-white/60">Footer</div>}`);
        }

        lines.push(`>`);
        lines.push(`    <div className="text-sm text-white/80">Contenu du panel</div>`);
        lines.push(`</UiPanel>`);

        return lines.join("\n");
    }, [
        showHeader,
        showSubtitle,
        showRight,
        showFooter,
        variant,
        tone,
        padded,
        collapsible,
        defaultOpen,
    ]);

    const variantButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Variant[] = ["default", "soft", "ghost"];
        return items.map((v) => ({
            key: v,
            children: v,
            active: variant === v,
            onClick: () => setVariant(v),
        }));
    }, [variant]);

    const toneButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Tone[] = ["theme", "neutral"];
        return items.map((t) => ({
            key: t,
            children: t,
            active: tone === t,
            onClick: () => setTone(t),
        }));
    }, [tone]);

    const headerButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "header",
                children: "header",
                hint: showHeader ? "ON" : "OFF",
                active: showHeader,
                onClick: () => setShowHeader((v) => !v),
            },
            {
                key: "subtitle",
                children: "subtitle",
                hint: showSubtitle ? "ON" : "OFF",
                active: showSubtitle,
                onClick: () => setShowSubtitle((v) => !v),
                disabled: !showHeader,
            },
            {
                key: "right",
                children: "right",
                hint: showRight ? "ON" : "OFF",
                active: showRight,
                onClick: () => setShowRight((v) => !v),
                disabled: !showHeader,
            },
            {
                key: "footer",
                children: "footer",
                hint: showFooter ? "ON" : "OFF",
                active: showFooter,
                onClick: () => setShowFooter((v) => !v),
            },
        ];
    }, [showHeader, showSubtitle, showRight, showFooter]);

    const layoutButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "padded",
                children: "padded",
                hint: padded ? "ON" : "OFF",
                active: padded,
                onClick: () => setPadded((v) => !v),
            },
        ];
    }, [padded]);

    const accordionButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "collapsible",
                children: "collapsible",
                hint: collapsible ? "ON" : "OFF",
                active: collapsible,
                onClick: () => setCollapsible((v) => !v),
            },
            {
                key: "defaultOpen",
                children: "defaultOpen",
                hint: defaultOpen ? "ON" : "OFF",
                active: defaultOpen,
                onClick: () => setDefaultOpen((v) => !v),
                disabled: !collapsible,
            },
        ];
    }, [collapsible, defaultOpen]);

    return (
        <UiComponentPanel
            title="UiPanel"
            emoji="🧩"
            subtitle="Panel thème, avec variants et mode accordéon optionnel."
            right={
                <div className="flex items-center gap-2">
                    <UiPill tone="neutral">{variant}</UiPill>
                    <UiPill tone="theme">{tone}</UiPill>
                </div>
            }
            code={code}
        >
            <div className="space-y-4">
                {/* CONTROLS */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">VARIANT</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            buttons={variantButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">TONE</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            buttons={toneButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">HEADER</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            fullWidth
                            buttons={headerButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">LAYOUT</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            buttons={layoutButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">ACCORDION</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            fullWidth
                            buttons={accordionButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>
                </div>

                {/* PREVIEW */}
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">PREVIEW</div>

                    <div className="mt-3">
                        <UiPanel
                            title={showHeader ? "UiPanel" : undefined}
                            subtitle={
                                showHeader && showSubtitle
                                    ? "Panel thème, option accordéon."
                                    : undefined
                            }
                            emoji={showHeader ? "🧩" : undefined}
                            right={
                                showHeader && showRight ? (
                                    <UiPill tone="theme" title="Exemple de slot right">
                                        Right
                                    </UiPill>
                                ) : undefined
                            }
                            variant={variant}
                            tone={tone}
                            padded={padded}
                            collapsible={collapsible}
                            defaultOpen={defaultOpen}
                            footer={
                                showFooter ? (
                                    <div className="text-xs text-white/60">
                                        Footer (actions, hints, meta…)
                                    </div>
                                ) : undefined
                            }
                        >
                            <div className="space-y-2">
                                <div className="text-sm text-white/85">
                                    Contenu du panel (preview).
                                </div>
                                <div className="text-xs text-white/55">
                                    Astuce: active <b>collapsible</b> pour tester le mode accordéon.
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <UiPill tone="neutral">tag</UiPill>
                                    <UiPill tone="theme">theme</UiPill>
                                </div>
                            </div>
                        </UiPanel>
                    </div>

                    <div className="mt-3 text-xs text-white/50">
                        Preview = uniquement contrôlé par les groupes ci-dessus.
                    </div>
                </div>

                {/* EXAMPLES */}
                <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">EXAMPLES</div>

                    <div className="mt-3 grid gap-3">
                        <UiPanel
                            title="Titre + Right"
                            subtitle="Exemple standard"
                            emoji="📦"
                            right={<UiPill tone="neutral">v1</UiPill>}
                        >
                            <div className="text-sm text-white/80">
                                Panel standard pour sections de page.
                            </div>
                        </UiPanel>

                        <UiPanel variant="soft" title="Soft" emoji="🌫️">
                            <div className="text-sm text-white/80">
                                Variante douce (moins de contraste).
                            </div>
                        </UiPanel>

                        <UiPanel
                            variant="ghost"
                            title="Ghost"
                            subtitle="Sans background (utile dans des cards déjà denses)"
                            emoji="🫥"
                        >
                            <div className="text-sm text-white/75">
                                Contenu minimal, ring léger.
                            </div>
                        </UiPanel>

                        <UiPanel
                            title="Accordéon"
                            subtitle="Cliquer sur le header"
                            emoji="▾"
                            collapsible
                            defaultOpen={false}
                        >
                            <div className="text-sm text-white/80">
                                Parfait pour les sections “avancées”.
                            </div>
                        </UiPanel>
                    </div>
                </div>
            </div>
        </UiComponentPanel>
    );
}
