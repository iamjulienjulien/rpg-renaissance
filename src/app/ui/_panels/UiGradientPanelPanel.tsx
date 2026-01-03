"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanel from "../UiComponentPanel";
import { Pill } from "@/components/RpgUi";
import { UiGradientPanel } from "@/components/ui/UiGradientPanel";
import UIActionButtonGroup from "@/components/ui/UiActionButtonGroup";
import type { UIActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";

type GlowPreset = "default" | "soft" | "strong" | "none";

export default function UiGradientPanelPanel() {
    const [glow, setGlow] = useState<GlowPreset>("default");
    const [padding, setPadding] = useState<"sm" | "md" | "lg">("md");

    const glowConfig = useMemo(() => {
        if (glow === "none") return { glow: false };
        if (glow === "soft")
            return {
                glow: true,
                glowOpacity: 0.35,
            };
        if (glow === "strong")
            return {
                glow: true,
                glowOpacity: 0.9,
            };
        return { glow: true };
    }, [glow]);

    const paddingClass = padding === "sm" ? "p-3" : padding === "lg" ? "p-6" : "p-4";

    const code = useMemo(() => {
        return `import UiGradientPanel from "@/components/ui/UiGradientPanel";

<UiGradientPanel
    ${glow === "none" ? "glow={false}" : ""}
    ${glow === "soft" ? "glowOpacity={0.35}" : ""}
    ${glow === "strong" ? "glowOpacity={0.9}" : ""}
    innerClassName="${paddingClass}"
>
    <div>Contenu du panel</div>
</UiGradientPanel>`;
    }, [glow, paddingClass]);

    const glowButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: GlowPreset[] = ["default", "soft", "strong", "none"];
        return items.map((g) => ({
            key: g,
            children: g,
            active: glow === g,
            onClick: () => setGlow(g),
        }));
    }, [glow]);

    const paddingButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];
        return items.map((p) => ({
            key: p,
            children: p,
            active: padding === p,
            onClick: () => setPadding(p),
        }));
    }, [padding]);

    return (
        <UiComponentPanel
            title="UiGradientPanel"
            emoji="🌌"
            subtitle="Panel immersif avec glow radial basé sur le thème. Idéal pour les hubs, sections clés et états narratifs."
            right={
                <div className="flex items-center gap-2">
                    <Pill>{glow}</Pill>
                    <Pill>{padding}</Pill>
                </div>
            }
            code={code}
        >
            <div className="space-y-4">
                {/* CONTROLS */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">GLOW</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            buttons={glowButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">PADDING</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            buttons={paddingButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>
                </div>

                {/* PREVIEW */}
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">PREVIEW</div>

                    <div className="mt-3">
                        <UiGradientPanel {...glowConfig} innerClassName={paddingClass}>
                            <div className="text-white/80">
                                ✨ Ceci est un UiGradientPanel
                                <div className="mt-1 text-xs text-white/50">
                                    Contrôlé uniquement par les options ci-dessus.
                                </div>
                            </div>
                        </UiGradientPanel>
                    </div>
                </div>

                {/* EXAMPLES */}
                <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">EXAMPLES</div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <UiGradientPanel innerClassName="p-4">
                            <div className="text-sm font-semibold text-white/85">
                                🧭 Hub d’aventure
                            </div>
                            <div className="mt-1 text-xs text-white/60">
                                Reprendre une quête, consulter l’état du monde.
                            </div>
                        </UiGradientPanel>

                        <UiGradientPanel glowOpacity={0.3} innerClassName="p-4">
                            <div className="text-sm font-semibold text-white/85">🏆 Récompense</div>
                            <div className="mt-1 text-xs text-white/60">
                                Panel narratif après un succès important.
                            </div>
                        </UiGradientPanel>

                        <UiGradientPanel
                            glow={false}
                            innerClassName="p-4"
                            className="sm:col-span-2"
                        >
                            <div className="text-sm font-semibold text-white/85">
                                📖 Lecture calme
                            </div>
                            <div className="mt-1 text-xs text-white/60">
                                Variante sans glow, plus neutre.
                            </div>
                        </UiGradientPanel>
                    </div>
                </div>
            </div>
        </UiComponentPanel>
    );
}
