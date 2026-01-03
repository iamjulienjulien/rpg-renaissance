// src/app/ui/_panels/UiCardPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2, {
    type UiComponentPanelCodeBlock,
    type UiComponentPanelControlRow,
    type UiComponentPanelPropRow,
} from "../UiComponentPanelV2";

import { UiCard, type UiCardVariant, type UiCardTone } from "@/components/ui/UiCard";
import { UiChip } from "@/components/ui/UiChip";
import type { UIActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";

type BlackBgChoice = "off" | "10" | "15" | "20" | "25" | "30" | "40" | "50";
type PaddedChoice = "on" | "off";

export default function UiCardPanel() {
    const [variant, setVariant] = useState<UiCardVariant>("soft");
    const [tone, setTone] = useState<UiCardTone>("theme");
    const [blackBg, setBlackBg] = useState<BlackBgChoice>("off");
    const [padded, setPadded] = useState<PaddedChoice>("on");

    const preview = useMemo(() => {
        return (
            <UiCard
                variant={variant}
                tone={tone}
                padded={padded === "on"}
                blackBg={blackBg === "off" ? false : blackBg}
            >
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-white/90">🧱 UiCard</div>
                        <UiChip tone="slate" size="xs">
                            nested-friendly
                        </UiChip>
                    </div>

                    <div className="text-sm text-white/65">
                        Une card simple, parfaite pour regrouper un petit bloc de contenu dans un
                        panel.
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <UiChip tone="theme" size="xs">
                            tone: {tone}
                        </UiChip>
                        <UiChip tone="neutral" size="xs">
                            variant: {variant}
                        </UiChip>
                        <UiChip tone="slate" size="xs">
                            blackBg: {blackBg}
                        </UiChip>
                    </div>
                </div>
            </UiCard>
        );
    }, [variant, tone, blackBg, padded]);

    const examples = useMemo(() => {
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                <UiCard variant="default" tone="theme">
                    <div className="text-sm text-white/80">
                        <span className="font-semibold text-white/90">Default</span> pour les
                        sections importantes.
                    </div>
                </UiCard>

                <UiCard variant="soft" tone="neutral">
                    <div className="text-sm text-white/75">
                        <span className="font-semibold text-white/90">Soft</span> pour du contenu
                        secondaire.
                    </div>
                </UiCard>

                <UiCard variant="ghost" tone="theme" blackBg="20">
                    <div className="text-sm text-white/70">
                        <span className="font-semibold text-white/90">Ghost + blackBg</span> quand
                        tu veux juste une enveloppe légère.
                    </div>
                </UiCard>

                <UiCard variant="soft" tone="theme" padded={false} blackBg="30" className="p-0">
                    <div className="p-4">
                        <div className="font-semibold text-white/90">Sans padding</div>
                        <div className="mt-1 text-sm text-white/65">
                            Pratique quand le contenu gère déjà ses propres marges.
                        </div>
                    </div>
                </UiCard>
            </div>
        );
    }, []);

    const controls = useMemo<UiComponentPanelControlRow[]>(() => {
        const variantButtons: UIActionButtonGroupButton[] = (
            ["default", "soft", "ghost"] as UiCardVariant[]
        ).map((v) => ({
            key: v,
            children: v,
            active: variant === v,
            onClick: () => setVariant(v),
        }));

        const toneButtons: UIActionButtonGroupButton[] = (["theme", "neutral"] as UiCardTone[]).map(
            (t) => ({
                key: t,
                children: t,
                active: tone === t,
                onClick: () => setTone(t),
            })
        );

        const blackButtons: UIActionButtonGroupButton[] = (
            ["off", "10", "15", "20", "25", "30", "40", "50"] as BlackBgChoice[]
        ).map((b) => ({
            key: b,
            children: b === "off" ? "off" : `black/${b}`,
            active: blackBg === b,
            onClick: () => setBlackBg(b),
        }));

        const paddedButtons: UIActionButtonGroupButton[] = (["on", "off"] as PaddedChoice[]).map(
            (p) => ({
                key: p,
                children: p,
                active: padded === p,
                onClick: () => setPadded(p),
            })
        );

        return [
            {
                key: "variant",
                label: "VARIANT",
                hint: "default = plus présent, soft = discret, ghost = presque transparent.",
                buttons: variantButtons,
                groupSize: "sm",
                right: (
                    <UiChip tone="slate" size="xs">
                        {variant}
                    </UiChip>
                ),
            },
            {
                key: "tone",
                label: "TONE",
                hint: "theme suit les tokens du thème, neutral est plus passe-partout.",
                buttons: toneButtons,
                groupSize: "sm",
                right: (
                    <UiChip tone="slate" size="xs">
                        {tone}
                    </UiChip>
                ),
                fullWidth: false,
            },
            {
                key: "blackBg",
                label: "BLACK BG",
                hint: "Ajoute un fond noir optionnel (par dessus). Utile pour nested cards.",
                buttons: blackButtons,
                groupSize: "xs",
            },
            {
                key: "padded",
                label: "PADDED",
                hint: "Padding interne de la card.",
                buttons: paddedButtons,
                groupSize: "sm",
                fullWidth: false,
            },
        ];
    }, [variant, tone, blackBg, padded]);

    const codeBlocks = useMemo<UiComponentPanelCodeBlock[]>(() => {
        const blackProp = blackBg === "off" ? "" : `\n    blackBg="${blackBg}"`;

        const previewUsage = `import { UiCard } from "@/components/ui";

<UiCard
    variant="${variant}"
    tone="${tone}"
    padded={${padded === "on"} }${blackProp}
>
    <div>Contenu…</div>
</UiCard>`;

        return [
            {
                key: "import",
                title: "IMPORT",
                language: "ts",
                description: "Import via le barrel index (recommandé).",
                code: `import { UiCard } from "@/components/ui";`,
            },
            {
                key: "usage",
                title: "PREVIEW USAGE",
                language: "tsx",
                description: "Copie exacte de l’exemple prévisualisé ci-dessus.",
                code: previewUsage,
            },
        ];
    }, [variant, tone, blackBg, padded]);

    const propsTable = useMemo<UiComponentPanelPropRow[]>(() => {
        return [
            {
                name: "children",
                type: "React.ReactNode",
                description: "Contenu interne de la card.",
            },
            {
                name: "variant",
                type: '"default" | "soft" | "ghost"',
                description: "Style de surface (présence / transparence).",
                default: '"soft"',
            },
            {
                name: "tone",
                type: '"theme" | "neutral"',
                description: "Ton global (léger ajustement du rendu).",
                default: '"theme"',
            },
            {
                name: "padded",
                type: "boolean",
                description: "Ajoute un padding interne.",
                default: "true",
            },
            {
                name: "blackBg",
                type: 'false | "10" | "15" | "20" | "25" | "30" | "40" | "50"',
                description:
                    "Ajoute un fond noir optionnel avec opacité contrôlée (pratique en nesting).",
                default: "false",
            },
            {
                name: "className",
                type: "string",
                description: "Classes supplémentaires (wrapper).",
            },
            {
                name: '"data-testid"',
                type: "string",
                description: "Test id (QA).",
            },
        ];
    }, []);

    const headerBadges = useMemo(() => {
        return (
            <>
                <UiChip tone="slate" size="xs">
                    {variant}
                </UiChip>
                <UiChip tone="slate" size="xs">
                    {tone}
                </UiChip>
            </>
        );
    }, [variant, tone]);

    return (
        <UiComponentPanelV2
            title="UiCard"
            emoji="🃏"
            subtitle="Card simple, parfaite pour des blocs internes (dans un UiPanel ou une grille)."
            controls={controls}
            preview={preview}
            examples={examples}
            codeBlocks={codeBlocks}
            propsTable={propsTable}
            headerBadges={headerBadges}
        />
    );
}
