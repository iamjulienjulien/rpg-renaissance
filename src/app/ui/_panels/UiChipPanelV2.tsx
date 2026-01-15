"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import { UiChip, type UiChipProps, UiChipPropsTable } from "@/components/ui/UiChip";
import type { UiActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";
import { UiChip as UiChipBadge } from "@/components/ui/UiChip";

/* ============================================================================
🧠 PANEL
============================================================================ */

export default function UiChipPanelV2() {
    const [tone, setTone] = useState<NonNullable<UiChipProps["tone"]>>("neutral");
    const [size, setSize] = useState<NonNullable<UiChipProps["size"]>>("sm");
    const [iconOn, setIconOn] = useState(false);
    const [clickable, setClickable] = useState(false);
    const [disabled, setDisabled] = useState(false);

    /* ============================================================================
    🧮 CODE
    ============================================================================ */

    const importCode = `import { UiChip } from "@/components/ui";`;

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiChip");

        if (tone !== "neutral") lines.push(`    tone="${tone}"`);
        if (size !== "sm") lines.push(`    size="${size}"`);
        if (disabled) lines.push("    disabled");
        if (clickable) lines.push("    onClick={() => {}}");
        if (iconOn) lines.push(`    icon="✨"`);

        lines.push(">");
        lines.push("    Status");
        lines.push("</UiChip>");

        return lines.join("\n");
    }, [tone, size, iconOn, clickable, disabled]);

    /* ============================================================================
    🎛 CONTROLS
    ============================================================================ */

    const toneButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const tones: NonNullable<UiChipProps["tone"]>[] = [
            "theme",
            "neutral",
            "emerald",
            "violet",
            "amber",
            "rose",
            "sky",
            "slate",
        ];

        return tones.map((t) => ({
            key: t,
            children: t,
            active: tone === t,
            className: `text-${t}`,
            onClick: () => setTone(t),
        }));
    }, [tone]);

    const sizeButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const sizes: NonNullable<UiChipProps["size"]>[] = ["xs", "sm", "md"];

        return sizes.map((s) => ({
            key: s,
            children: s,
            active: size === s,
            onClick: () => setSize(s),
        }));
    }, [size]);

    const flagsButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        return [
            {
                key: "icon",
                children: "icon",
                // hint: iconOn ? "ON" : "OFF",
                active: iconOn,
                className: iconOn ? "text-success" : "text-error",
                onClick: () => setIconOn((v) => !v),
            },
            {
                key: "clickable",
                children: "clickable",
                // hint: clickable ? "ON" : "OFF",
                active: clickable,
                className: clickable ? "text-success" : "text-error",
                onClick: () => setClickable((v) => !v),
            },
            {
                key: "disabled",
                children: "disabled",
                // hint: disabled ? "ON" : "OFF",
                active: disabled,
                className: disabled ? "text-success" : "text-error",
                onClick: () => setDisabled((v) => !v),
            },
        ];
    }, [iconOn, clickable, disabled]);

    /* ============================================================================
    🧩 RENDER
    ============================================================================ */

    return (
        <UiComponentPanelV2
            title="UiChip"
            emoji="🏷️"
            // subtitle="Badge compact, informatif ou interactif."
            headerBadges={
                <div className="flex flex-wrap gap-2">
                    <UiChipBadge tone="slate" size="md">
                        {tone}
                    </UiChipBadge>
                    <UiChipBadge tone="slate" size="md">
                        {size}
                    </UiChipBadge>
                    {iconOn && (
                        <UiChipBadge tone="slate" size="md">
                            icon
                        </UiChipBadge>
                    )}
                    {clickable && (
                        <UiChipBadge tone="slate" size="md">
                            clickable
                        </UiChipBadge>
                    )}
                    {disabled && (
                        <UiChipBadge tone="slate" size="md">
                            disabled
                        </UiChipBadge>
                    )}
                </div>
            }
            controls={[
                {
                    key: "tone",
                    label: "TONE",
                    buttons: toneButtons,
                },
                {
                    key: "size",
                    label: "SIZE",
                    buttons: sizeButtons,
                },
                {
                    key: "flags",
                    label: "FLAGS",
                    buttons: flagsButtons,
                },
            ]}
            preview={
                <div className="flex flex-wrap gap-3">
                    <UiChip
                        tone={tone}
                        size={size}
                        icon={iconOn ? "✨" : undefined}
                        disabled={disabled}
                        onClick={clickable && !disabled ? () => {} : undefined}
                    >
                        Status
                    </UiChip>
                </div>
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            LABEL
                        </div>
                        <div className="flex flex-wrap gap-2 bg-black/40 p-4 rounded-b-2xl">
                            <UiChip tone="emerald" icon="✅">
                                Succès
                            </UiChip>
                            <UiChip tone="amber" icon="⚠️">
                                Attention
                            </UiChip>
                            <UiChip tone="rose" icon="🔥">
                                Urgent
                            </UiChip>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            METADATA
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <div className="flex flex-wrap gap-2">
                                <UiChip tone="slate" size="xs">
                                    Meta
                                </UiChip>
                            </div>
                        </div>
                    </div>
                </div>
            }
            codeBlocks={[
                {
                    key: "import",
                    title: "Import",
                    language: "ts",
                    code: importCode,
                },
                {
                    key: "usage",
                    title: "Usage",
                    language: "tsx",
                    code: previewCode,
                },
            ]}
            propsTable={UiChipPropsTable as any}
        />
    );
}
