// src/app/ui/_panels/UiGradientPanelPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import { UiChip } from "@/components/ui/UiChip";
import { UiGradientPanel, UiGradientPanelPropsTable } from "@/components/ui/UiGradientPanel";
import type { UiActionButtonGroupButton } from "@/components/ui";

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

export default function UiGradientPanelPanelV2() {
    const [gradient, setGradient] = useState<
        "aurora" | "ember" | "cosmic" | "mythic" | "royal" | "mono" | "theme" | "custom"
    >("aurora");

    const [glow, setGlow] = useState(true);
    const [eyebrowOn, setEyebrowOn] = useState(true);

    const [opacityMode, setOpacityMode] = useState<"low" | "medium" | "high">("medium");
    const glowOpacity = opacityMode === "low" ? 0.35 : opacityMode === "high" ? 0.9 : 0.6;

    const [bgMode, setBgMode] = useState<"default" | "darker" | "glass">("default");
    const backgroundClassName =
        bgMode === "darker" ? "bg-black/35" : bgMode === "glass" ? "bg-white/[0.03]" : undefined;

    const [ringMode, setRingMode] = useState<"default" | "accent" | "none">("default");
    const ringClassName =
        ringMode === "accent"
            ? "ring-[hsl(var(--accent)/0.28)]"
            : ringMode === "none"
              ? "ring-transparent"
              : undefined;

    const eyebrow = eyebrowOn ? "Gradient Panel" : undefined;

    const glowStyle =
        gradient === "custom"
            ? "radial-gradient(900px 380px at 20% 20%, rgba(34,211,238,0.20), transparent 60%)," +
              "radial-gradient(700px 360px at 80% 30%, rgba(236,72,153,0.18), transparent 55%)"
            : undefined;

    const importCode = `import { UiGradientPanel } from "@/components/ui";`;

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiGradientPanel");

        if (eyebrow) lines.push(`    eyebrow="${escapeForAttr(eyebrow)}"`);
        if (gradient) lines.push(`    gradient="${gradient}"`);

        if (!glow) lines.push("    glow={false}");
        else if (glowOpacity !== 0.6) lines.push(`    glowOpacity={${glowOpacity}}`);

        if (gradient === "custom" && glowStyle) {
            lines.push(`    glowStyle="${escapeForAttr(glowStyle)}"`);
        }

        if (backgroundClassName) {
            lines.push(`    backgroundClassName="${escapeForAttr(backgroundClassName)}"`);
        }

        if (ringClassName) {
            lines.push(`    ringClassName="${escapeForAttr(ringClassName)}"`);
        }

        lines.push(">");
        lines.push('    <div className="space-y-2">');
        lines.push('        <div className="text-white/90 font-medium">👑 Zone de focus</div>');
        lines.push(
            '        <div className="text-sm text-white/60">Un conteneur “prestige” pour mettre en avant une info, une quête, ou une métrique.</div>'
        );
        lines.push("    </div>");
        lines.push("</UiGradientPanel>");

        return lines.join("\n");
    }, [eyebrow, gradient, glow, glowOpacity, glowStyle, backgroundClassName, ringClassName]);

    const gradientButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<
            "aurora" | "ember" | "cosmic" | "mythic" | "royal" | "mono" | "theme" | "custom"
        > = ["aurora", "ember", "cosmic", "mythic", "royal", "mono", "theme", "custom"];

        return items.map((g) => ({
            key: g,
            children: g,
            active: gradient === g,
            className: `text-gradient-${g}`,
            onClick: () => setGradient(g),
        }));
    }, [gradient]);

    const opacityButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<"low" | "medium" | "high"> = ["low", "medium", "high"];
        return items.map((m) => ({
            key: m,
            children: m,
            hint: m === "low" ? "0.35" : m === "high" ? "0.9" : "0.6",
            active: opacityMode === m,
            onClick: () => setOpacityMode(m),
            disabled: !glow,
        }));
    }, [opacityMode, glow]);

    const flagsButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        return [
            {
                key: "glow",
                children: "glow",
                // hint: glow ? "ON" : "OFF",
                active: glow,
                className: glow ? "text-success" : "text-error",
                onClick: () => setGlow((v) => !v),
            },
            {
                key: "eyebrow",
                children: "eyebrow",
                // hint: eyebrowOn ? "ON" : "OFF",
                active: eyebrowOn,
                className: eyebrowOn ? "text-success" : "text-error",
                onClick: () => setEyebrowOn((v) => !v),
            },
        ];
    }, [glow, eyebrowOn]);

    const backgroundButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<"default" | "darker" | "glass"> = ["default", "darker", "glass"];
        return items.map((m) => ({
            key: m,
            children: m,
            active: bgMode === m,
            onClick: () => setBgMode(m),
        }));
    }, [bgMode]);

    const ringButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<"default" | "accent" | "none"> = ["default", "accent", "none"];
        return items.map((m) => ({
            key: m,
            children: m,
            active: ringMode === m,
            onClick: () => setRingMode(m),
        }));
    }, [ringMode]);

    return (
        <UiComponentPanelV2
            title="UiGradientPanel"
            emoji="🌈"
            headerBadges={
                <div className="flex items-center gap-2">
                    <UiChip tone="slate" size="md">
                        {gradient}
                    </UiChip>
                    {glow ? (
                        <UiChip tone="slate" size="md">
                            glow
                        </UiChip>
                    ) : null}
                    {glow ? (
                        <UiChip tone="slate" size="md">
                            opacity {glowOpacity}
                        </UiChip>
                    ) : null}
                    {eyebrowOn ? (
                        <UiChip tone="slate" size="md">
                            eyebrow
                        </UiChip>
                    ) : null}
                    {bgMode !== "default" ? (
                        <UiChip tone="slate" size="md">
                            bg {bgMode}
                        </UiChip>
                    ) : null}
                    {ringMode !== "default" ? (
                        <UiChip tone="slate" size="md">
                            ring {ringMode}
                        </UiChip>
                    ) : null}
                </div>
            }
            controls={[
                [
                    {
                        key: "gradient",
                        label: "GRADIENT",
                        buttons: gradientButtons,
                        groupVariant: "soft",
                        groupSize: "sm",
                    },
                    {
                        key: "glowOpacity",
                        label: "GLOW OPACITY",
                        buttons: opacityButtons,
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
                [
                    {
                        key: "background",
                        label: "BACKGROUND",
                        buttons: backgroundButtons,
                        groupVariant: "soft",
                        groupSize: "sm",
                    },
                    {
                        key: "ring",
                        label: "RING",
                        buttons: ringButtons,
                        groupVariant: "soft",
                        groupSize: "sm",
                    },
                ],
            ]}
            preview={
                <div className="space-y-3">
                    <UiGradientPanel
                        eyebrow={eyebrow}
                        gradient={gradient}
                        glow={glow}
                        glowOpacity={glowOpacity}
                        glowStyle={glowStyle}
                        backgroundClassName={backgroundClassName}
                        ringClassName={ringClassName}
                    >
                        <div className="space-y-2">
                            <div className="text-white/90 font-medium">👑 Zone de focus</div>
                            <div className="text-sm text-white/60">
                                Un conteneur “prestige” pour mettre en avant une info, une quête, ou
                                une métrique.
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <UiChip tone="theme" size="sm">
                                    accent
                                </UiChip>
                                <UiChip tone="slate" size="sm">
                                    panel
                                </UiChip>
                                <UiChip tone="amber" size="sm">
                                    highlight
                                </UiChip>
                            </div>
                        </div>
                    </UiGradientPanel>
                </div>
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <UiGradientPanel eyebrow="AURORA" gradient="aurora">
                        <div className="space-y-1">
                            <div className="text-white/90 font-medium">🌊 Aurora</div>
                            <div className="text-sm text-white/60">
                                Pour les écrans “calmes”, exploration, onboarding.
                            </div>
                        </div>
                    </UiGradientPanel>

                    <UiGradientPanel eyebrow="EMBER" gradient="ember">
                        <div className="space-y-1">
                            <div className="text-white/90 font-medium">🔥 Ember</div>
                            <div className="text-sm text-white/60">
                                Pour CTA chaleureux, “progress”, récompenses.
                            </div>
                        </div>
                    </UiGradientPanel>

                    <UiGradientPanel eyebrow="THEME" gradient="theme">
                        <div className="space-y-1">
                            <div className="text-white/90 font-medium">🎯 Theme</div>
                            <div className="text-sm text-white/60">
                                S’aligne sur la couleur accent du thème.
                            </div>
                        </div>
                    </UiGradientPanel>

                    <UiGradientPanel eyebrow="CUSTOM" gradient="custom" glowStyle={glowStyle}>
                        <div className="space-y-1">
                            <div className="text-white/90 font-medium">🧪 Custom</div>
                            <div className="text-sm text-white/60">
                                Glow injecté via <span className="font-mono">glowStyle</span>.
                            </div>
                        </div>
                    </UiGradientPanel>
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
            propsTable={UiGradientPanelPropsTable as any}
        />
    );
}
