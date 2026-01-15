// src/app/ui/_panels/UiPillPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import { UiChip } from "@/components/ui/UiChip";
import { UiPill, type UiPillProps, type UiPillTone, type UiPillSize } from "@/components/ui/UiPill";
import type { UiActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

export default function UiPillPanelV2() {
    const [tone, setTone] = useState<UiPillTone>("neutral");
    const [size, setSize] = useState<UiPillSize>("sm");

    const [titleOn, setTitleOn] = useState(true);
    const [disabled, setDisabled] = useState(false);
    const [clickable, setClickable] = useState(false);

    // Note: on ne déclenche pas de vraie action ici (action store),
    // onClick suffit pour montrer l’état cliquable.
    const title = titleOn ? "Petit tooltip: une info contextuelle." : undefined;
    const onClick = () => {};

    const importCode = `import { UiPill } from "@/components/ui";`;

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiPill");

        if (tone) lines.push(`    tone="${tone}"`);
        if (size) lines.push(`    size="${size}"`);

        if (title) lines.push(`    title="${escapeForAttr(title)}"`);

        // disabled
        if (disabled) lines.push("    disabled");

        // clickable (force l’apparence cliquable)
        if (clickable) lines.push("    clickable");

        // onClick (juste démo)
        lines.push("    onClick={() => {}}");

        lines.push(">");
        lines.push("    ✨ UiPill");
        lines.push("</UiPill>");

        return lines.join("\n");
    }, [tone, size, title, disabled, clickable]);

    /* =========================
       Controls
    ========================= */

    const toneButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: UiPillTone[] = [
            "theme",
            "neutral",
            "emerald",
            "violet",
            "amber",
            "rose",
            "sky",
            "slate",
        ];

        return items.map((t) => ({
            key: t,
            children: t,
            active: tone === t,
            className: `text-${t}`,
            onClick: () => setTone(t),
        }));
    }, [tone]);

    const sizeButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: UiPillSize[] = ["xs", "sm", "md"];
        return items.map((s) => ({
            key: s,
            children: s,
            active: size === s,
            onClick: () => setSize(s),
        }));
    }, [size]);

    const flagsButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        return [
            {
                key: "title",
                children: "title",
                // hint: titleOn ? "ON" : "OFF",
                active: titleOn,
                className: titleOn ? "text-success" : "text-error",
                onClick: () => setTitleOn((v) => !v),
            },
            {
                key: "disabled",
                children: "disabled",
                // hint: disabled ? "ON" : "OFF",
                active: disabled,
                className: disabled ? "text-success" : "text-error",
                onClick: () => setDisabled((v) => !v),
            },
            {
                key: "clickable",
                children: "clickable",
                // hint: clickable ? "ON" : "OFF",
                active: clickable,
                className: clickable ? "text-success" : "text-error",
                onClick: () => setClickable((v) => !v),
            },
        ];
    }, [titleOn, disabled, clickable]);

    /* =========================
       Header badges (état courant)
    ========================= */

    const headerBadges = (
        <div className="flex flex-wrap items-center gap-2">
            <UiChip tone="slate" size="md">
                {tone}
            </UiChip>
            <UiChip tone="slate" size="md">
                {size}
            </UiChip>
            {titleOn ? (
                <UiChip tone="slate" size="md">
                    title
                </UiChip>
            ) : null}
            {disabled ? (
                <UiChip tone="slate" size="md">
                    disabled
                </UiChip>
            ) : null}
            {clickable ? (
                <UiChip tone="slate" size="md">
                    clickable
                </UiChip>
            ) : null}
        </div>
    );

    /* =========================
       Props table (local)
    ========================= */

    const UiPillPropsTable = [
        {
            name: "children",
            type: "React.ReactNode",
            description: "Contenu principal du pill (texte, icône, ou combinaison).",
            default: "—",
            required: true,
        },
        {
            name: "tone",
            type: '"theme" | "neutral" | "emerald" | "violet" | "amber" | "rose" | "sky" | "slate"',
            description: "Définit la couleur visuelle et l’ambiance du pill.",
            default: '"neutral"',
            required: false,
        },
        {
            name: "size",
            type: '"xs" | "sm" | "md"',
            description: "Contrôle la taille du pill (padding et taille du texte).",
            default: '"sm"',
            required: false,
        },
        {
            name: "title",
            type: "string",
            description: "Texte du tooltip affiché au survol (via UiTooltip).",
            default: "—",
            required: false,
        },
        {
            name: "onClick",
            type: "() => void",
            description: "Callback appelé lors du clic sur le pill.",
            default: "—",
            required: false,
        },
        {
            name: "action",
            type: "UiAction",
            description: "Action UI globale déclenchée via le uiStore.",
            default: "—",
            required: false,
        },
        {
            name: "disabled",
            type: "boolean",
            description: "Désactive le pill (non cliquable, opacité réduite).",
            default: "false",
            required: false,
        },
        {
            name: "clickable",
            type: "boolean",
            description: "Force l’apparence cliquable même sans action ou onClick.",
            default: "false",
            required: false,
        },
        {
            name: "className",
            type: "string",
            description: "Classes CSS supplémentaires pour personnalisation.",
            default: "—",
            required: false,
        },
    ] satisfies Array<{
        name: string;
        type: string;
        description: string;
        default?: string;
        required?: boolean;
    }>;

    return (
        <UiComponentPanelV2
            title="UiPill"
            emoji="💊"
            // subtitle="Petit badge/pill: tons, tailles, tooltip intégré, cliquable optionnel."
            headerBadges={headerBadges}
            controls={[
                {
                    key: "tone",
                    label: "TONE",
                    buttons: toneButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
                {
                    key: "size",
                    label: "SIZE",
                    buttons: sizeButtons,
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
            ]}
            preview={
                <div className="flex flex-wrap items-center gap-3">
                    <UiPill
                        tone={tone}
                        size={size}
                        title={title}
                        disabled={disabled}
                        clickable={clickable}
                        onClick={onClick}
                    >
                        ✨ UiPill
                    </UiPill>
                </div>
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            FILTERS
                        </div>
                        <div className="flex flex-wrap gap-2 bg-black/40 p-4 rounded-b-2xl">
                            <UiPill tone="slate" size="xs">
                                all
                            </UiPill>
                            <UiPill tone="sky" size="xs">
                                sessions
                            </UiPill>
                            <UiPill tone="emerald" size="xs">
                                done
                            </UiPill>
                            <UiPill tone="amber" size="xs" title="Attention: prioritaire">
                                urgent
                            </UiPill>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            METADATA
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <div className="flex flex-wrap gap-2">
                                <UiPill tone="neutral" size="sm">
                                    ⏱️ 12 min
                                </UiPill>
                                <UiPill tone="violet" size="sm">
                                    🧠 focus
                                </UiPill>
                                <UiPill tone="rose" size="sm">
                                    ❤️ mood
                                </UiPill>
                                <UiPill tone="theme" size="sm" title="Bonus">
                                    ✨ +5 renown
                                </UiPill>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            TOOLTIP
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <UiPill tone="theme" size="md" title="Le tooltip passe par UiTooltip.">
                                🖱️ Survole-moi
                            </UiPill>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            DISABLED / CLICKABLE
                        </div>
                        <div className="flex flex-wrap gap-3 bg-black/40 p-4 rounded-b-2xl">
                            <UiPill tone="slate" size="sm" disabled title="Désactivé">
                                💤 disabled
                            </UiPill>
                            <UiPill tone="sky" size="sm" clickable title="Click-like sans action">
                                👆 clickable
                            </UiPill>
                        </div>
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
                },
            ]}
            propsTable={UiPillPropsTable as any}
        />
    );
}
