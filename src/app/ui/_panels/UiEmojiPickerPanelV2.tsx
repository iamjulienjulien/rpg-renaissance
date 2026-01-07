// src/app/ui/_panels/UiEmojiPickerPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import type { UIActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";
import { UiChip } from "@/components/ui/UiChip";

// ✅ Ton composant renommé
import UiEmojiPicker from "@/components/ui/UiEmojiPicker";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

/* ============================================================================
✅ MAIN
============================================================================ */

type Size = "sm" | "md" | "lg";
type Variant = "soft" | "solid";
type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export default function UiEmojiPickerPanelV2() {
    const [size, setSize] = useState<Size>("md");
    const [variant, setVariant] = useState<Variant>("soft");
    const [placement, setPlacement] = useState<Placement>("bottom-start");

    const [disabled, setDisabled] = useState(false);
    const [search, setSearch] = useState(true);
    const [recent, setRecent] = useState(true);
    const [categories, setCategories] = useState(true);

    const [value, setValue] = useState<string>("🧭");

    const importCode = `import UiEmojiPicker from "@/components/ui/UiEmojiPicker";`;

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiEmojiPicker");

        lines.push(`    value="${escapeForAttr(value)}"`);
        lines.push("    onChange={setValue}");

        lines.push(`    size="${size}"`);
        lines.push(`    variant="${variant}"`);
        lines.push(`    placement="${placement}"`);

        if (disabled) lines.push("    disabled");
        if (!search) lines.push("    search={false}");
        if (!recent) lines.push("    recent={false}");
        if (!categories) lines.push("    categories={false}");

        lines.push("/>");

        const stateBlock = `const [value, setValue] = useState(${JSON.stringify(value)});`;

        return `${lines.join("\n")}\n\n${stateBlock}`;
    }, [value, size, variant, placement, disabled, search, recent, categories]);

    const sizeButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Size[] = ["sm", "md", "lg"];
        return items.map((s) => ({
            key: s,
            children: s,
            active: size === s,
            onClick: () => setSize(s),
        }));
    }, [size]);

    const variantButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Variant[] = ["soft", "solid"];
        return items.map((v) => ({
            key: v,
            children: v,
            active: variant === v,
            onClick: () => setVariant(v),
        }));
    }, [variant]);

    const placementButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Placement[] = ["bottom-start", "bottom-end", "top-start", "top-end"];
        return items.map((p) => ({
            key: p,
            children: p,
            active: placement === p,
            onClick: () => setPlacement(p),
        }));
    }, [placement]);

    const flagsButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "disabled",
                children: "disabled",
                hint: disabled ? "ON" : "OFF",
                active: disabled,
                onClick: () => setDisabled((v) => !v),
            },
            {
                key: "search",
                children: "search",
                hint: search ? "ON" : "OFF",
                active: search,
                onClick: () => setSearch((v) => !v),
            },
            {
                key: "recent",
                children: "recent",
                hint: recent ? "ON" : "OFF",
                active: recent,
                onClick: () => setRecent((v) => !v),
            },
            {
                key: "categories",
                children: "categories",
                hint: categories ? "ON" : "OFF",
                active: categories,
                onClick: () => setCategories((v) => !v),
            },
        ];
    }, [disabled, search, recent, categories]);

    return (
        <UiComponentPanelV2
            title="UiEmojiPicker"
            emoji="😀"
            subtitle="Sélecteur d’emoji natif (rendu OS). Recherche, récents, catégories, et sélection contrôlée."
            headerBadges={
                <div className="flex items-center gap-2">
                    <UiChip tone="slate" size="xs">
                        {size}
                    </UiChip>
                    <UiChip tone="slate" size="xs">
                        {variant}
                    </UiChip>
                    <UiChip tone="slate" size="xs">
                        {placement}
                    </UiChip>
                    <UiChip tone="slate" size="xs">
                        {value}
                    </UiChip>
                </div>
            }
            controls={[
                {
                    key: "size",
                    label: "SIZE",
                    hint: "Taille du bouton / trigger.",
                    buttons: sizeButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
                {
                    key: "variant",
                    label: "VARIANT",
                    hint: "Rendu visuel du trigger (selon ton composant).",
                    buttons: variantButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
                {
                    key: "placement",
                    label: "PLACEMENT",
                    hint: "Position du popover.",
                    buttons: placementButtons,
                    groupVariant: "soft",
                    groupSize: "xs",
                    fullWidth: true,
                },
                {
                    key: "flags",
                    label: "FLAGS",
                    hint: "Activer/désactiver les fonctionnalités.",
                    buttons: flagsButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
            ]}
            preview={
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <UiEmojiPicker
                            value={value}
                            onChange={setValue}
                            // size={size as any}
                            // variant={variant as any}
                            // placement={placement as any}
                            disabled={disabled}
                            // search={search}
                            // recent={recent}
                            // categories={categories}
                        />

                        <div className="text-sm text-white/70">
                            Emoji sélectionné: <span className="text-white/90">{value}</span>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">TIP</div>
                        <div className="mt-2 text-xs text-white/55">
                            Le rendu est natif: l’emoji affiché dépend de l’OS (Apple/Google/etc).
                        </div>
                    </div>
                </div>
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">PROFILE</div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="text-sm text-white/70">Avatar emoji</div>
                            <UiEmojiPicker value={value} onChange={setValue} />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">QUEST TAG</div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="text-sm text-white/70">Icône de quête</div>
                            <UiEmojiPicker value={"🏷️"} onChange={() => {}} disabled />
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
                    description: "Reprend l’état actuel des contrôles (comme PREVIEW).",
                },
            ]}
            propsTable={[
                {
                    name: "value",
                    type: "string",
                    description: "Emoji sélectionné (contrôlé).",
                },
                {
                    name: "onChange",
                    type: "(emoji: string) => void",
                    description: "Callback sélection emoji.",
                },
                {
                    name: "size",
                    type: `"sm" | "md" | "lg"`,
                    description: "Taille du trigger.",
                    default: `"md"`,
                },
                {
                    name: "variant",
                    type: `"soft" | "solid"`,
                    description: "Variant visuel du trigger.",
                    default: `"soft"`,
                },
                {
                    name: "placement",
                    type: `"bottom-start" | "bottom-end" | "top-start" | "top-end"`,
                    description: "Placement du popover.",
                    default: `"bottom-start"`,
                },
                {
                    name: "disabled",
                    type: "boolean",
                    description: "Désactive l’ouverture/la sélection.",
                    default: "false",
                },
                {
                    name: "search",
                    type: "boolean",
                    description: "Affiche une recherche.",
                    default: "true",
                },
                {
                    name: "recent",
                    type: "boolean",
                    description: "Affiche les emojis récents.",
                    default: "true",
                },
                {
                    name: "categories",
                    type: "boolean",
                    description: "Affiche les catégories.",
                    default: "true",
                },
                {
                    name: "className",
                    type: "string",
                    description: "Classe wrapper.",
                },
            ]}
        />
    );
}
