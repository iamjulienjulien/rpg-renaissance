// src/app/ui/_panels/UiFormSelectPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import { UiChip } from "@/components/ui/UiChip";
import {
    UiFormSelect,
    UiFormSelectPropsTable,
    type UiFormSelectProps,
    type UiFormSelectOption,
} from "@/components/ui";

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

/* ============================================================================
🧪 DATA
============================================================================ */

const OPTIONS: UiFormSelectOption[] = [
    { value: "warrior", label: "Guerrier", emoji: "⚔️", description: "Combat rapproché" },
    { value: "mage", label: "Mage", emoji: "🪄", description: "Magie et arcanes" },
    { value: "rogue", label: "Voleur", emoji: "🗡️", description: "Discrétion et agilité" },
    { value: "healer", label: "Soigneur", emoji: "✨", description: "Soutien et soins" },
];

export default function UiFormSelectPanelV2() {
    const [size, setSize] = useState<NonNullable<UiFormSelectProps["size"]>>("md");
    const [tone, setTone] = useState<NonNullable<UiFormSelectProps["tone"]>>("neutral");
    const [multiple, setMultiple] = useState(false);
    const [clearable, setClearable] = useState(true);
    const [searchable, setSearchable] = useState(true);

    const [value, setValue] = useState<any>(null);

    /* ============================================================================
    🧠 CODE
    ============================================================================ */

    const importCode = `import { UiFormSelect } from "@/components/ui";`;

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiFormSelect");
        lines.push(`    label="Classe"`);
        lines.push(`    placeholder="Choisir une classe"`);

        if (size) lines.push(`    size="${size}"`);
        if (tone) lines.push(`    tone="${tone}"`);
        if (multiple) lines.push("    multiple");
        if (clearable) lines.push("    clearable");
        if (searchable) lines.push("    searchable");

        lines.push("    options={OPTIONS}");
        lines.push("    value={value}");
        lines.push("    onChange={setValue}");
        lines.push("/>");

        return lines.join("\n");
    }, [size, tone, multiple, clearable, searchable]);

    /* ============================================================================
    🎛️ CONTROLS
    ============================================================================ */

    const sizeButtons = useMemo(() => {
        return ["sm", "md", "lg"].map((s) => ({
            key: s,
            children: s,
            active: size === s,
            onClick: () => setSize(s as any),
        }));
    }, [size]);

    const toneButtons = useMemo(() => {
        return ["neutral", "theme", "danger"].map((t) => ({
            key: t,
            children: t,
            active: tone === t,
            onClick: () => setTone(t as any),
        }));
    }, [tone]);

    const flagsButtons = useMemo(() => {
        return [
            {
                key: "multiple",
                children: "multiple",
                active: multiple,
                className: multiple ? "text-success" : "text-error",
                onClick: () => {
                    setMultiple((v) => !v);
                    setValue(null);
                },
            },
            {
                key: "clearable",
                children: "clearable",
                active: clearable,
                className: clearable ? "text-success" : "text-error",
                onClick: () => setClearable((v) => !v),
            },
            {
                key: "searchable",
                children: "search",
                active: searchable,
                className: searchable ? "text-success" : "text-error",
                onClick: () => setSearchable((v) => !v),
            },
        ];
    }, [multiple, clearable, searchable]);

    /* ============================================================================
    🧩 RENDER
    ============================================================================ */

    return (
        <UiComponentPanelV2
            title="UiFormSelect"
            emoji="🧭"
            // subtitle="Select riche, searchable et multi-values"
            headerBadges={
                <div className="flex items-center gap-2">
                    <UiChip tone="slate" size="md">
                        {size}
                    </UiChip>
                    <UiChip tone="slate" size="md">
                        {tone}
                    </UiChip>
                    {multiple && (
                        <UiChip tone="slate" size="md">
                            multi
                        </UiChip>
                    )}
                    {clearable && (
                        <UiChip tone="slate" size="md">
                            clearable
                        </UiChip>
                    )}
                    {searchable && (
                        <UiChip tone="slate" size="md">
                            search
                        </UiChip>
                    )}
                </div>
            }
            controls={[
                {
                    key: "size",
                    label: "SIZE",
                    buttons: sizeButtons,
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
                    key: "flags",
                    label: "FLAGS",
                    buttons: flagsButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
            ]}
            preview={
                <div className="max-w-sm">
                    <UiFormSelect
                        label="Classe"
                        placeholder="Choisir une classe"
                        options={OPTIONS}
                        size={size}
                        tone={tone}
                        multiple={multiple}
                        clearable={clearable}
                        searchable={searchable}
                        value={value}
                        onChange={setValue}
                        // hint="Sélectionne ton archétype"
                    />
                </div>
            }
            codeBlocks={[
                { key: "import", title: "Import", language: "ts", code: importCode },
                { key: "usage", title: "Usage", language: "tsx", code: previewCode },
            ]}
            propsTable={UiFormSelectPropsTable as any}
        />
    );
}
