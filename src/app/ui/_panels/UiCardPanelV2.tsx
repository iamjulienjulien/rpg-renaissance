// src/app/ui/_panels/UiCardPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import { UiChip } from "@/components/ui/UiChip";
import { UiCard, UiCardPropsTable, type UiCardProps } from "@/components/ui";
import type { UiActionButtonGroupButton } from "@/components/ui";
import { TONES_KEYS } from "@/components/ui/tones";

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

export default function UiCardPanelV2() {
    const [variant, setVariant] = useState<NonNullable<UiCardProps["variant"]>>("soft");
    const [tone, setTone] = useState<NonNullable<UiCardProps["tone"]>>(false);
    const [padded, setPadded] = useState(true);
    const [clickable, setClickable] = useState(false);
    const [blackBg, setBlackBg] = useState<NonNullable<UiCardProps["blackBg"]>>(false);

    const importCode = `import { UiCard } from "@/components/ui";`;

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiCard");

        if (variant) lines.push(`    variant="${variant}"`);
        if (tone) lines.push(`    tone="${tone}"`);
        if (padded) lines.push("    padded");
        if (blackBg) lines.push(`    blackBg="${escapeForAttr(String(blackBg))}"`);
        if (clickable) lines.push("    onClick={() => {}}");

        lines.push(">");
        lines.push('    <div className="space-y-1">');
        lines.push('        <div className="text-sm text-white/85">Titre interne</div>');
        lines.push('        <div className="text-xs text-white/55">Petit texte de support.</div>');
        lines.push("    </div>");
        lines.push("</UiCard>");

        return lines.join("\n");
    }, [variant, tone, padded, blackBg, clickable]);

    const variantButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<NonNullable<UiCardProps["variant"]>> = [
            "default",
            "classic",
            "soft",
            "ghost",
        ];
        return items.map((v) => ({
            key: v,
            children: v,
            active: variant === v,
            onClick: () => setVariant(v),
        }));
    }, [variant]);

    const toneButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<NonNullable<UiCardProps["tone"]>> = [false, ...TONES_KEYS];
        return items.map((t) => ({
            key: String(t),
            children: t === false ? "false" : t,
            active: tone === t,
            onClick: () => setTone(t),
        }));
    }, [tone]);

    const blackBgButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<NonNullable<UiCardProps["blackBg"]>> = [
            false,
            "10",
            "15",
            "20",
            "25",
            "30",
            "40",
            "50",
        ];

        return items.map((v) => ({
            key: String(v),
            children: v === false ? "false" : v,
            active: blackBg === v,
            onClick: () => setBlackBg(v),
        }));
    }, [blackBg]);

    const flagsButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        return [
            {
                key: "padded",
                children: "padded",
                // hint: padded ? "ON" : "OFF",
                active: padded,
                className: padded ? "text-success" : "text-error",
                onClick: () => setPadded((v) => !v),
            },
            {
                key: "clickable",
                children: "onClick",
                // hint: clickable ? "ON" : "OFF",
                active: clickable,
                className: clickable ? "text-success" : "text-error",
                onClick: () => setClickable((v) => !v),
            },
        ];
    }, [padded, clickable]);

    console.log("tone2", tone);

    return (
        <UiComponentPanelV2
            title="UiCard"
            emoji="🃏"
            headerBadges={
                <div className="flex items-center gap-2">
                    <UiChip tone="slate" size="md">
                        {variant}
                    </UiChip>
                    <UiChip tone="slate" size="md">
                        {tone}
                    </UiChip>
                    {blackBg ? (
                        <UiChip tone="slate" size="md">
                            blackBg {blackBg}
                        </UiChip>
                    ) : null}
                    {padded ? (
                        <UiChip tone="slate" size="md">
                            padded
                        </UiChip>
                    ) : null}
                    {clickable ? (
                        <UiChip tone="slate" size="md">
                            onClick
                        </UiChip>
                    ) : null}
                </div>
            }
            controls={[
                [
                    {
                        key: "variant",
                        label: "VARIANT",
                        buttons: variantButtons,
                        groupVariant: "soft",
                        groupSize: "sm",
                    },
                    {
                        key: "tone",
                        label: "TONE",
                        buttons: toneButtons,
                        groupVariant: "soft",
                        groupSize: "sm",
                    },
                    {
                        key: "blackBg",
                        label: "BLACK BG",
                        buttons: blackBgButtons,
                        groupVariant: "soft",
                        groupSize: "sm",
                    },
                    {
                        key: "flags",
                        label: "FLAGS",
                        buttons: flagsButtons,
                        groupVariant: "soft",
                        groupSize: "sm",
                    },
                ],
            ]}
            preview={
                <div className="space-y-3">
                    <UiCard
                        variant={variant}
                        tone={tone}
                        padded={padded}
                        blackBg={blackBg}
                        onClick={clickable ? () => {} : undefined}
                    >
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-white/85">Carte interne</div>
                                <UiChip tone="neutral" size="xs">
                                    UI
                                </UiChip>
                            </div>

                            <div className="text-xs text-white/55">
                                Surface simple, parfaite pour le nesting, les listes, ou les blocs
                                de contenu dans un panel.
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                                <UiChip tone="theme" size="xs">
                                    {variant}
                                </UiChip>
                                <UiChip tone="slate" size="xs">
                                    {tone}
                                </UiChip>
                                {blackBg ? (
                                    <UiChip tone="slate" size="xs">
                                        blackBg {blackBg}
                                    </UiChip>
                                ) : null}
                            </div>
                        </div>
                    </UiCard>
                </div>
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <UiCard variant="soft">
                        <div className="text-sm text-white/85">Soft card</div>
                        <div className="mt-1 text-xs text-white/55">
                            Parfait dans un panel (niveaux de profondeur).
                        </div>
                    </UiCard>

                    <UiCard variant="classic" blackBg="20">
                        <div className="text-sm text-white/85">Classic + blackBg</div>
                        <div className="mt-1 text-xs text-white/55">
                            Fond noir additionnel pour renforcer la lisibilité.
                        </div>
                    </UiCard>

                    <UiCard variant="default" onClick={() => {}}>
                        <div className="text-sm text-white/85">Clickable</div>
                        <div className="mt-1 text-xs text-white/55">
                            Utile pour des items de liste, cartes de quête, etc.
                        </div>
                    </UiCard>

                    <UiCard variant="ghost" padded={false} className="p-4">
                        <div className="text-sm text-white/85">Ghost</div>
                        <div className="mt-1 text-xs text-white/55">
                            Très discret, presque “layout-only”.
                        </div>
                    </UiCard>
                </div>
            }
            codeBlocks={[
                { key: "import", title: "Import", language: "ts", code: importCode },
                {
                    key: "usage",
                    title: "Usage",
                    language: "tsx",
                    code: previewCode,
                    description: "Reprend l’état actuel des contrôles (comme PREVIEW).",
                },
            ]}
            propsTable={UiCardPropsTable as any}
        />
    );
}
