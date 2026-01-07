// src/app/ui/_panels/UiToolbarPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import { UiChip } from "@/components/ui/UiChip";
import UiActionButtonGroup from "@/components/ui/UiActionButtonGroup";
import type { UIActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";

import UIToolbar, { type UIToolbarItem } from "@/components/ui/UiToolbar";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

type Align = "left" | "right" | "between";
type Variant = "soft" | "solid" | "danger" | "ghost" | "master" | "magic";

export default function UiToolbarPanelV2() {
    const [align, setAlign] = useState<Align>("between");
    const [variant, setVariant] = useState<Variant>("soft");
    const [withGroup, setWithGroup] = useState(true);
    const [withDropdown, setWithDropdown] = useState(true);
    const [withSecondaryButton, setWithSecondaryButton] = useState(false);

    const [activeTab, setActiveTab] = useState<"journal" | "quests" | "photos">("quests");
    const [counter, setCounter] = useState(0);

    const headerBadges = (
        <div className="flex items-center gap-2">
            <UiChip tone="slate" size="xs">
                align: {align}
            </UiChip>
            <UiChip tone="slate" size="xs">
                variant: {variant}
            </UiChip>
            <UiChip tone="slate" size="xs">
                tab: {activeTab}
            </UiChip>
        </div>
    );

    /* ------------------------------------------------------------
     Controls
    ------------------------------------------------------------ */

    const alignButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Align[] = ["left", "between", "right"];
        return items.map((a) => ({
            key: a,
            children: a,
            active: align === a,
            onClick: () => setAlign(a),
        }));
    }, [align]);

    const variantButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Variant[] = ["soft", "solid", "ghost", "master", "magic", "danger"];
        return items.map((v) => ({
            key: v,
            children: v,
            active: variant === v,
            onClick: () => setVariant(v),
        }));
    }, [variant]);

    const blocksButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "group",
                children: "group",
                hint: withGroup ? "ON" : "OFF",
                active: withGroup,
                onClick: () => setWithGroup((v) => !v),
            },
            {
                key: "dropdown",
                children: "dropdown",
                hint: withDropdown ? "ON" : "OFF",
                active: withDropdown,
                onClick: () => setWithDropdown((v) => !v),
            },
            {
                key: "button2",
                children: "2nd button",
                hint: withSecondaryButton ? "ON" : "OFF",
                active: withSecondaryButton,
                onClick: () => setWithSecondaryButton((v) => !v),
            },
        ];
    }, [withGroup, withDropdown, withSecondaryButton]);

    /* ------------------------------------------------------------
     Preview items (JSON)
    ------------------------------------------------------------ */

    const items = useMemo<UIToolbarItem[]>(() => {
        const list: UIToolbarItem[] = [];

        list.push({
            type: "button",
            key: "primary",
            label: `⚡ Action (${counter})`,
            variant,
            hint: "RUN",
            onClick: () => setCounter((c) => c + 1),
        });

        if (withSecondaryButton) {
            list.push({
                type: "button",
                key: "secondary",
                label: "🧪 Test",
                variant: variant === "danger" ? "soft" : "ghost",
                hint: "DEV",
                onClick: () => setCounter((c) => Math.max(0, c - 1)),
            });
        }

        if (withGroup) {
            list.push({
                type: "group",
                key: "tabs",
                variant: "soft",
                size: "sm",
                buttons: [
                    {
                        key: "journal",
                        children: "📜 Journal",
                        active: activeTab === "journal",
                        onClick: () => setActiveTab("journal"),
                    },
                    {
                        key: "quests",
                        children: "🗺️ Quêtes",
                        active: activeTab === "quests",
                        onClick: () => setActiveTab("quests"),
                    },
                    {
                        key: "photos",
                        children: "📷 Photos",
                        active: activeTab === "photos",
                        onClick: () => setActiveTab("photos"),
                    },
                ],
            });
        }

        if (withDropdown) {
            list.push({
                type: "dropdown",
                key: "menu",
                label: "⚙️ Menu",
                variant: variant === "danger" ? "soft" : "soft",
                items: [
                    {
                        key: "rename",
                        label: "✏️ Renommer",
                        hint: "R",
                        onClick: () => console.log("rename"),
                    },
                    {
                        key: "duplicate",
                        label: "🧬 Dupliquer",
                        hint: "D",
                        onClick: () => console.log("duplicate"),
                    },
                    {
                        key: "danger",
                        label: "🗑️ Supprimer",
                        hint: "!",
                        onClick: () => console.log("delete"),
                    },
                ],
            });
        }

        return list;
    }, [activeTab, counter, variant, withDropdown, withGroup, withSecondaryButton]);

    /* ------------------------------------------------------------
     Code blocks
    ------------------------------------------------------------ */

    const importCode = `import UIToolbar from "@/components/ui/UIToolbar";`;

    const previewCode = useMemo(() => {
        const jsonLike = `const items = [
    {
        type: "button",
        label: "⚡ Action",
        variant: "${escapeForAttr(String(variant))}",
        hint: "RUN",
        onClick: () => {},
    },
    ${
        withGroup
            ? `{
        type: "group",
        variant: "soft",
        size: "sm",
        buttons: [
            { children: "📜 Journal", active: true, onClick: () => {} },
            { children: "🗺️ Quêtes", onClick: () => {} },
            { children: "📷 Photos", onClick: () => {} },
        ],
    },`
            : ""
    }
    ${
        withDropdown
            ? `{
        type: "dropdown",
        label: "⚙️ Menu",
        items: [
            { label: "✏️ Renommer", onClick: () => {} },
            { label: "🧬 Dupliquer", onClick: () => {} },
            { label: "🗑️ Supprimer", onClick: () => {} },
        ],
    },`
            : ""
    }
] as const;`;

        return `${jsonLike}

<UIToolbar
    align="${align}"
    items={items as any}
/>`;
    }, [align, variant, withGroup, withDropdown]);

    return (
        <UiComponentPanelV2
            title="UIToolbar"
            emoji="🧰"
            subtitle="Toolbar déclarative (JSON): boutons, groupes segmentés, dropdown menus. Parfaite pour déplacer les actions au-dessus des Panels/Cards."
            headerBadges={headerBadges}
            controls={[
                {
                    key: "align",
                    label: "ALIGN",
                    hint: "Alignement horizontal de la toolbar.",
                    buttons: alignButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
                {
                    key: "variant",
                    label: "VARIANT",
                    hint: "Variant du bouton principal (ex: soft/master/magic).",
                    buttons: variantButtons,
                    groupVariant: "soft",
                    groupSize: "xs",
                },
                {
                    key: "blocks",
                    label: "BLOCKS",
                    hint: "Activer/désactiver group, dropdown, 2nd button.",
                    buttons: blocksButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
            ]}
            preview={<UIToolbar align={align} items={items} />}
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">QUEST PAGE</div>
                        <div className="mt-3">
                            <UIToolbar
                                align="between"
                                items={[
                                    {
                                        type: "group",
                                        variant: "soft",
                                        size: "sm",
                                        buttons: [
                                            {
                                                children: "📜 Journal",
                                                active: true,
                                                onClick: () => {},
                                            },
                                            { children: "🗺️ Quêtes", onClick: () => {} },
                                        ],
                                    },
                                    {
                                        type: "dropdown",
                                        label: "⚙️ Actions",
                                        items: [
                                            { label: "✨ Générer mission", onClick: () => {} },
                                            { label: "📖 Sceller chapitre", onClick: () => {} },
                                            { label: "🗑️ Supprimer", onClick: () => {} },
                                        ],
                                    },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">MINIMAL</div>
                        <div className="mt-3">
                            <UIToolbar
                                align="left"
                                items={[
                                    {
                                        type: "button",
                                        label: "➕ Ajouter",
                                        variant: "master",
                                        hint: "A",
                                        onClick: () => {},
                                    },
                                    {
                                        type: "button",
                                        label: "🧼 Reset",
                                        variant: "ghost",
                                        onClick: () => {},
                                    },
                                ]}
                            />
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
                    title: "Usage (preview)",
                    language: "tsx",
                    code: previewCode,
                    description: "Exemple déclaratif: items JSON (button/group/dropdown).",
                },
            ]}
            propsTable={[
                {
                    name: "items",
                    type: "UIToolbarItem[]",
                    description: "Contenu déclaratif de la toolbar (button | group | dropdown).",
                },
                {
                    name: "align",
                    type: `"left" | "right" | "between"`,
                    description: "Alignement horizontal.",
                    default: `"left"`,
                },
                {
                    name: "className",
                    type: "string",
                    description: "Classes additionnelles sur le wrapper.",
                },
            ]}
        />
    );
}
