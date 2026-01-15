// src/app/ui/_panels/UiGradientCardPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import {
    UiChip,
    UiGradientCard,
    UiGradientCardProps,
    type UiActionButtonGroupButton,
} from "@/components/ui";
import { UiGradientCardPropsTable } from "@/components/ui/UiGradientCard";

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

export default function UiGradientCardPanelV2() {
    const [variant, setVariant] = useState<NonNullable<UiGradientCardProps["variant"]>>("soft");
    const [tone, setTone] = useState<NonNullable<UiGradientCardProps["tone"]>>("theme");
    const [gradient, setGradient] =
        useState<NonNullable<UiGradientCardProps["gradient"]>>("aurora");

    const [glow, setGlow] = useState(true);
    const [glowOpacity, setGlowOpacity] =
        useState<NonNullable<UiGradientCardProps["glowOpacity"]>>(0.6);

    const [padded, setPadded] = useState(true);
    const [clickable, setClickable] = useState(false);
    const [blackBg, setBlackBg] = useState<NonNullable<UiGradientCardProps["blackBg"]>>(false);

    const importCode = `import { UiGradientCard } from "@/components/ui";`;

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiGradientCard");

        if (variant) lines.push(`    variant="${variant}"`);
        if (tone) lines.push(`    tone="${tone}"`);
        if (gradient) lines.push(`    gradient="${gradient}"`);

        if (glow) lines.push("    glow");
        if (typeof glowOpacity === "number" && glowOpacity !== 0.6)
            lines.push(`    glowOpacity={${glowOpacity}}`);

        if (padded) lines.push("    padded");
        if (blackBg) lines.push(`    blackBg="${escapeForAttr(String(blackBg))}"`);
        if (clickable) lines.push("    onClick={() => {}}");

        lines.push(">");
        lines.push('    <div className="space-y-1">');
        lines.push('        <div className="text-sm text-white/85">Titre interne</div>');
        lines.push('        <div className="text-xs text-white/55">Petit texte de support.</div>');
        lines.push("    </div>");
        lines.push("</UiGradientCard>");

        return lines.join("\n");
    }, [variant, tone, gradient, glow, glowOpacity, padded, blackBg, clickable]);

    const variantButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<NonNullable<UiGradientCardProps["variant"]>> = [
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
        const items: Array<NonNullable<UiGradientCardProps["tone"]>> = ["theme", "neutral"];
        return items.map((t) => ({
            key: t,
            children: t,
            active: tone === t,
            onClick: () => setTone(t),
        }));
    }, [tone]);

    const gradientButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<NonNullable<UiGradientCardProps["gradient"]>> = [
            "aurora",
            "ember",
            "cosmic",
            "mythic",
            "royal",
            "mono",
            "theme",
        ];

        return items.map((g) => ({
            key: g,
            children: g,
            active: gradient === g,
            onClick: () => setGradient(g),
        }));
    }, [gradient]);

    const blackBgButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<NonNullable<UiGradientCardProps["blackBg"]>> = [
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

    const glowOpacityButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items = [0.25, 0.4, 0.6, 0.8, 1] as const;

        return items.map((v) => ({
            key: String(v),
            children: String(v),
            active: glowOpacity === v,
            onClick: () => setGlowOpacity(v),
        }));
    }, [glowOpacity]);

    const flagsButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        return [
            {
                key: "padded",
                children: "padded",
                active: padded,
                className: padded ? "text-success" : "text-error",
                onClick: () => setPadded((v) => !v),
            },
            {
                key: "glow",
                children: "glow",
                active: glow,
                className: glow ? "text-success" : "text-error",
                onClick: () => setGlow((v) => !v),
            },
            {
                key: "onClick",
                children: "onClick",
                active: clickable,
                className: clickable ? "text-success" : "text-error",
                onClick: () => setClickable((v) => !v),
            },
        ];
    }, [padded, glow, clickable]);

    return (
        <UiComponentPanelV2
            title="UiGradientCard"
            emoji="🌈"
            headerBadges={
                <div className="flex items-center gap-2">
                    <UiChip tone="slate" size="md">
                        {variant}
                    </UiChip>
                    <UiChip tone="slate" size="md">
                        {tone}
                    </UiChip>
                    <UiChip tone="slate" size="md">
                        {gradient}
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
                    {glow ? (
                        <UiChip tone="slate" size="md">
                            glow {glowOpacity}
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
                        key: "gradient",
                        label: "GRADIENT",
                        buttons: gradientButtons,
                        groupVariant: "soft",
                        groupSize: "sm",
                    },
                ],
                [
                    {
                        key: "blackBg",
                        label: "BLACK BG",
                        buttons: blackBgButtons,
                        groupVariant: "soft",
                        groupSize: "sm",
                    },
                    {
                        key: "glowOpacity",
                        label: "GLOW OPACITY",
                        buttons: glowOpacityButtons,
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
                    <UiGradientCard
                        variant={variant}
                        tone={tone}
                        gradient={gradient}
                        glow={glow}
                        glowOpacity={glowOpacity}
                        padded={padded}
                        blackBg={blackBg}
                        onClick={clickable ? () => {} : undefined}
                    >
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-white/85">Gradient card</div>
                                <UiChip tone="neutral" size="xs">
                                    UI
                                </UiChip>
                            </div>

                            <div className="text-xs text-white/55">
                                Même ADN que UiCard, avec un glow harmonisé (centralisé via{" "}
                                <span className="font-mono text-white/70">gradients.ts</span>).
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                                <UiChip tone="theme" size="xs">
                                    {variant}
                                </UiChip>
                                <UiChip tone="slate" size="xs">
                                    {tone}
                                </UiChip>
                                <UiChip tone="slate" size="xs">
                                    {gradient}
                                </UiChip>
                                {blackBg ? (
                                    <UiChip tone="slate" size="xs">
                                        blackBg {blackBg}
                                    </UiChip>
                                ) : null}
                            </div>
                        </div>
                    </UiGradientCard>
                </div>
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <UiGradientCard gradient="aurora" variant="soft">
                        <div className="text-sm text-white/85">Aurora</div>
                        <div className="mt-1 text-xs text-white/55">
                            Frais et magique. Idéal pour “découverte”.
                        </div>
                    </UiGradientCard>

                    <UiGradientCard gradient="ember" variant="classic" blackBg="20">
                        <div className="text-sm text-white/85">Ember + classic</div>
                        <div className="mt-1 text-xs text-white/55">
                            Chaud, énergique. Un petit boost de contraste.
                        </div>
                    </UiGradientCard>

                    <UiGradientCard gradient="mono" variant="default" glowOpacity={0.4}>
                        <div className="text-sm text-white/85">Mono</div>
                        <div className="mt-1 text-xs text-white/55">
                            Discret, propre. Pour des surfaces utilitaires.
                        </div>
                    </UiGradientCard>

                    <UiGradientCard gradient="theme" variant="ghost" padded={false} className="p-4">
                        <div className="text-sm text-white/85">Theme + ghost</div>
                        <div className="mt-1 text-xs text-white/55">
                            Se cale sur ton accent system (var --accent).
                        </div>
                    </UiGradientCard>
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
            propsTable={UiGradientCardPropsTable as any}
        />
    );
}
