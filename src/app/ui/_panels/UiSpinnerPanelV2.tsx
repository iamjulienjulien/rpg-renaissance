// src/app/ui/_panels/UiSpinnerPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import UiSpinner, { type UiSpinnerProps, UiSpinnerPropsTable } from "@/components/ui/UiSpinner";
import { UiChip } from "@/components/ui/UiChip";
import type { UiActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

/* ============================================================================
🧠 PANEL
============================================================================ */

export default function UiSpinnerPanelV2() {
    const [variant, setVariant] = useState<NonNullable<UiSpinnerProps["variant"]>>("hourglass");
    const [size, setSize] = useState<NonNullable<UiSpinnerProps["size"]>>("md");
    const [tone, setTone] = useState<NonNullable<UiSpinnerProps["tone"]>>("neutral");
    const [speed, setSpeed] = useState<NonNullable<UiSpinnerProps["speed"]>>("md");

    const [labelOn, setLabelOn] = useState(false);
    const [labelPosition, setLabelPosition] =
        useState<NonNullable<UiSpinnerProps["labelPosition"]>>("right");

    const [overlay, setOverlay] = useState(false);
    const [center, setCenter] = useState(false);

    /* ============================================================================
    🧮 CODE
    ============================================================================ */

    const importCode = `import UiSpinner from "@/components/ui/UiSpinner";`;

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiSpinner");

        if (variant !== "hourglass") lines.push(`    variant="${variant}"`);
        if (size !== "md") lines.push(`    size="${size}"`);
        if (tone !== "neutral") lines.push(`    tone="${tone}"`);
        if (speed !== "md") lines.push(`    speed="${speed}"`);
        if (labelOn) lines.push(`    label="Chargement…"`);
        if (labelOn && labelPosition !== "right")
            lines.push(`    labelPosition="${labelPosition}"`);
        if (overlay) lines.push("    overlay");
        if (center) lines.push("    center");

        lines.push("/>");

        return lines.join("\n");
    }, [variant, size, tone, speed, labelOn, labelPosition, overlay, center]);

    /* ============================================================================
    🎛 CONTROLS
    ============================================================================ */

    const variantButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: NonNullable<UiSpinnerProps["variant"]>[] = [
            "hourglass",
            "dots",
            "ring",
            "bars",
            "spark",
            "custom",
        ];

        return items.map((v) => ({
            key: v,
            children: v,
            active: variant === v,
            onClick: () => setVariant(v),
        }));
    }, [variant]);

    const sizeButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: NonNullable<UiSpinnerProps["size"]>[] = ["xs", "sm", "md", "lg", "xl"];

        return items.map((s) => ({
            key: s,
            children: s,
            active: size === s,
            onClick: () => setSize(s),
        }));
    }, [size]);

    const toneButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: NonNullable<UiSpinnerProps["tone"]>[] = [
            "inherit",
            "neutral",
            "theme",
            "white",
            "slate",
            "emerald",
            "violet",
            "amber",
            "rose",
            "sky",
        ];

        return items.map((t) => ({
            key: t,
            children: t,
            active: tone === t,
            className: t !== "inherit" ? `text-${t}` : undefined,
            onClick: () => setTone(t),
        }));
    }, [tone]);

    const speedButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: NonNullable<UiSpinnerProps["speed"]>[] = ["slow", "md", "fast"];

        return items.map((s) => ({
            key: s,
            children: s,
            active: speed === s,
            onClick: () => setSpeed(s),
        }));
    }, [speed]);

    const flagsButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        return [
            {
                key: "label",
                children: "label",
                active: labelOn,
                className: labelOn ? "text-success" : "text-error",
                onClick: () => setLabelOn((v) => !v),
            },
            {
                key: "overlay",
                children: "overlay",
                active: overlay,
                className: overlay ? "text-success" : "text-error",
                onClick: () => setOverlay((v) => !v),
            },
            {
                key: "center",
                children: "center",
                active: center,
                className: center ? "text-success" : "text-error",
                onClick: () => setCenter((v) => !v),
            },
        ];
    }, [labelOn, overlay, center]);

    const labelPosButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: NonNullable<UiSpinnerProps["labelPosition"]>[] = ["left", "right", "bottom"];

        return items.map((p) => ({
            key: p,
            children: p,
            active: labelPosition === p,
            onClick: () => setLabelPosition(p),
        }));
    }, [labelPosition]);

    /* ============================================================================
    🧩 RENDER
    ============================================================================ */

    return (
        <UiComponentPanelV2
            title="UiSpinner"
            emoji="⏳"
            headerBadges={
                <div className="flex flex-wrap gap-2">
                    <UiChip tone="slate" size="md">
                        {variant}
                    </UiChip>
                    <UiChip tone="slate" size="md">
                        {size}
                    </UiChip>
                    <UiChip tone="slate" size="md">
                        {tone}
                    </UiChip>
                    <UiChip tone="slate" size="md">
                        {speed}
                    </UiChip>
                    {labelOn && (
                        <UiChip tone="slate" size="md">
                            label
                        </UiChip>
                    )}
                    {overlay && (
                        <UiChip tone="slate" size="md">
                            overlay
                        </UiChip>
                    )}
                </div>
            }
            controls={[
                [
                    {
                        key: "size",
                        label: "SIZE",
                        buttons: sizeButtons,
                    },
                    {
                        key: "tone",
                        label: "TONE",
                        buttons: toneButtons,
                    },
                ],
                [
                    {
                        key: "variant",
                        label: "VARIANT",
                        buttons: variantButtons,
                    },
                    {
                        key: "speed",
                        label: "SPEED",
                        buttons: speedButtons,
                    },
                    {
                        key: "flags",
                        label: "FLAGS",
                        buttons: flagsButtons,
                    },
                    labelOn
                        ? {
                              key: "labelPosition",
                              label: "LABEL POSITION",
                              buttons: labelPosButtons,
                          }
                        : null,
                ].filter(Boolean) as any,
            ]}
            preview={
                <div className="flex flex-wrap items-center gap-4">
                    <UiSpinner
                        variant={variant}
                        size={size}
                        tone={tone}
                        speed={speed}
                        label={labelOn ? "Chargement…" : undefined}
                        labelPosition={labelPosition}
                        overlay={overlay}
                        center={center}
                    />
                </div>
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-4">
                        <UiSpinner variant="ring" tone="theme" label="Chargement…" />
                    </div>

                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-4">
                        <UiSpinner variant="dots" size="sm" tone="neutral" />
                    </div>

                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-4">
                        <UiSpinner variant="bars" tone="emerald" speed="fast" />
                    </div>

                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-4">
                        <UiSpinner variant="spark" tone="amber" />
                    </div>
                </div>
            }
            codeBlocks={[
                { key: "import", title: "Import", language: "ts", code: importCode },
                {
                    key: "usage",
                    title: "Usage",
                    language: "tsx",
                    code: previewCode,
                    description: "Reflète exactement l’état courant des contrôles.",
                },
            ]}
            propsTable={UiSpinnerPropsTable as any}
        />
    );
}
