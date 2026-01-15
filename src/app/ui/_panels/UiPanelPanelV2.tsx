"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import { UiPanelPropsTable } from "@/components/ui/UiPanel";
import { UiChip } from "@/components/ui/UiChip";
import type { UiComponentPanelControlRow } from "../UiComponentPanelV2";
import { UiPanel } from "@/components/ui";

/* ============================================================================
🧩 PANEL
============================================================================ */

export default function UiPanelPanelV2() {
    const [variant, setVariant] =
        useState<NonNullable<Parameters<typeof UiPanel>[0]["variant"]>>("default");

    const [collapsible, setCollapsible] = useState(false);
    const [defaultOpen, setDefaultOpen] = useState(true);
    const [padded, setPadded] = useState(true);

    /* ================= CONTROLS ================= */

    const controls = useMemo<UiComponentPanelControlRow[]>(
        () => [
            {
                key: "variant",
                label: "VARIANT",
                buttons: (["default", "soft", "ghost", "theme"] as const).map((v) => ({
                    key: v,
                    children: v,
                    active: variant === v,
                    onClick: () => setVariant(v),
                })),
            },
            {
                key: "behavior",
                label: "BEHAVIOR",
                buttons: [
                    {
                        key: "collapsible",
                        children: "collapsible",
                        active: collapsible,
                        className: collapsible ? "text-success" : "text-error",
                        onClick: () => setCollapsible((v) => !v),
                    },
                    // {
                    //     key: "defaultOpen",
                    //     children: "defaultOpen",
                    //     active: defaultOpen,
                    //     disabled: !collapsible,
                    //     onClick: () => setDefaultOpen((v) => !v),
                    // },
                    {
                        key: "padded",
                        children: "padded",
                        active: padded,
                        className: padded ? "text-success" : "text-error",
                        onClick: () => setPadded((v) => !v),
                    },
                ],
            },
        ],

        [variant, collapsible, defaultOpen, padded]
    );

    /* ================= CODE ================= */

    const importCode = `import { UiPanel } from "@/components/ui";`;

    const usageCode = useMemo(() => {
        const lines: string[] = [];

        lines.push("<UiPanel");

        if (variant !== "default") lines.push(`    variant="${variant}"`);
        if (collapsible) lines.push("    collapsible");
        if (!defaultOpen) lines.push("    defaultOpen={false}");
        if (!padded) lines.push("    padded={false}");

        lines.push('    title="Panel Title"');
        lines.push('    subtitle="Optional subtitle"');
        lines.push(">");
        lines.push("    <div>Contenu du panel</div>");
        lines.push("</UiPanel>");

        return lines.join("\n");
    }, [variant, collapsible, defaultOpen, padded]);

    /* ================= PREVIEW ================= */

    const preview = (
        <UiPanel
            title="Panel Title"
            subtitle="Optional subtitle"
            emoji="🧱"
            variant={variant}
            collapsible={collapsible}
            defaultOpen={defaultOpen}
            padded={padded}
            right={
                <UiChip tone="slate" size="xs">
                    slot:right
                </UiChip>
            }
            footer={
                <div className="text-xs text-white/45">
                    Footer slot (actions secondaires, infos, etc.)
                </div>
            }
        >
            <div className="space-y-2 text-sm text-white/80">
                <p>
                    UiPanel est un composant de surface structurant. Il sert de conteneur pour des
                    sections, formulaires, previews ou blocs interactifs.
                </p>
                <p>
                    Il supporte les variantes visuelles, le mode accordion, un header riche et un
                    footer optionnel.
                </p>
            </div>
        </UiPanel>
    );

    /* ================= HEADER BADGES ================= */

    const headerBadges = (
        <div className="flex flex-wrap gap-2">
            <UiChip tone="slate" size="md">
                {variant}
            </UiChip>
            {collapsible && (
                <UiChip tone="slate" size="md">
                    collapsible
                </UiChip>
            )}
            {!padded && (
                <UiChip tone="slate" size="md">
                    no-padding
                </UiChip>
            )}
        </div>
    );

    return (
        <UiComponentPanelV2
            title="UiPanel"
            emoji="🧱"
            // subtitle="Surface de layout, conteneur structurant, accordion optionnel."
            controls={controls}
            preview={preview}
            headerBadges={headerBadges}
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
                    code: usageCode,
                },
            ]}
            propsTable={UiPanelPropsTable as any}
        />
    );
}
