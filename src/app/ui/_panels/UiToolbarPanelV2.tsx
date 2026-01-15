// src/app/ui/_panels/UiToolbarPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import { UiChip } from "@/components/ui/UiChip";
import UiToolbar, { UiToolbarPropsTable, type UiToolbarProps } from "@/components/ui/UiToolbar";
import { type UiActionButtonGroupButton } from "@/components/ui";
import type { UiToolbarItem } from "@/components/ui/UiToolbar";

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

export default function UiToolbarPanelV2() {
    const [align, setAlign] = useState<NonNullable<UiToolbarProps["align"]>>("left");
    const [fullWidth, setFullWidth] = useState(false);

    // Un petit état interne pour illustrer active/disabled
    const [view, setView] = useState<"map" | "list" | "grid">("map");
    const [filtersOn, setFiltersOn] = useState(false);
    const [lock, setLock] = useState(false);

    const importCode = `import { UiToolbar } from "@/components/ui";`;

    const items = useMemo<UiToolbarItem[]>(() => {
        const viewButtons: UiActionButtonGroupButton[] = [
            { key: "map", children: "Map", active: view === "map", onClick: () => setView("map") },
            {
                key: "list",
                children: "List",
                active: view === "list",
                onClick: () => setView("list"),
            },
            {
                key: "grid",
                children: "Grid",
                active: view === "grid",
                onClick: () => setView("grid"),
            },
        ];

        return [
            {
                type: "button",
                key: "new",
                label: "✨ New",
                variant: "magic",
                size: "sm",
                onClick: () => {},
            },
            {
                type: "group",
                key: "view",
                variant: "soft",
                size: "sm",
                buttons: viewButtons,
            },
            {
                type: "button",
                key: "filters",
                label: filtersOn ? "🧪 Filters" : "🧊 Filters",
                variant: "soft",
                size: "sm",
                active: filtersOn,
                onClick: () => setFiltersOn((v) => !v),
                hint: "F",
            },
            {
                type: "dropdown",
                key: "more",
                label: "⋯ More",
                variant: "ghost",
                size: "sm",
                items: [
                    {
                        key: "pin",
                        label: lock ? "🔒 Pin toolbar" : "🔓 Pin toolbar",
                        onClick: () => setLock((v) => !v),
                        hint: "P",
                    },
                    {
                        key: "sep",
                        label: "—",
                        disabled: true,
                    },
                    {
                        key: "danger",
                        label: "🗑️ Reset",
                        onClick: () => {
                            setView("map");
                            setFiltersOn(false);
                            setLock(false);
                        },
                        hint: "R",
                    },
                ],
            },
        ];
    }, [view, filtersOn, lock]);

    const previewCode = useMemo(() => {
        const lines: string[] = [];

        lines.push("<UiToolbar");
        if (align) lines.push(`    align="${align}"`);
        if (fullWidth) lines.push("    fullWidth");
        lines.push("    items={[");
        lines.push(
            '        { type: "button", label: "✨ New", variant: "magic", size: "sm", onClick: () => {} },'
        );
        lines.push("        {");
        lines.push('            type: "group",');
        lines.push('            variant: "soft",');
        lines.push('            size: "sm",');
        lines.push("            buttons: [");
        lines.push('                { children: "Map", active: true, onClick: () => {} },');
        lines.push('                { children: "List", onClick: () => {} },');
        lines.push('                { children: "Grid", onClick: () => {} },');
        lines.push("            ],");
        lines.push("        },");
        lines.push(
            '        { type: "button", label: "🧊 Filters", hint: "F", onClick: () => {} },'
        );
        lines.push("        {");
        lines.push('            type: "dropdown",');
        lines.push('            label: "⋯ More",');
        lines.push('            variant: "ghost",');
        lines.push('            size: "sm",');
        lines.push("            items: [");
        lines.push('                { label: "🔓 Pin toolbar", hint: "P", onClick: () => {} },');
        lines.push('                { label: "🗑️ Reset", hint: "R", onClick: () => {} },');
        lines.push("            ],");
        lines.push("        },");
        lines.push("    ]}");
        lines.push("/>");

        return lines.join("\n").replaceAll("\t", "    ");
    }, [align, fullWidth]);

    const alignButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<NonNullable<UiToolbarProps["align"]>> = ["left", "between", "right"];
        return items.map((a) => ({
            key: a,
            children: a,
            active: align === a,
            onClick: () => setAlign(a),
        }));
    }, [align]);

    const flagsButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        return [
            {
                key: "fullWidth",
                children: "fullWidth",
                // hint: fullWidth ? "ON" : "OFF",
                active: fullWidth,
                className: fullWidth ? "text-success" : "text-error",
                onClick: () => setFullWidth((v) => !v),
            },
        ];
    }, [fullWidth]);

    return (
        <UiComponentPanelV2
            title="UiToolbar"
            emoji="🧰"
            headerBadges={
                <div className="flex items-center gap-2">
                    <UiChip tone="slate" size="md">
                        {align}
                    </UiChip>
                    {fullWidth ? (
                        <UiChip tone="slate" size="md">
                            fullWidth
                        </UiChip>
                    ) : null}
                    {filtersOn ? (
                        <UiChip tone="slate" size="md">
                            filters
                        </UiChip>
                    ) : null}
                    {lock ? (
                        <UiChip tone="slate" size="md">
                            pinned
                        </UiChip>
                    ) : null}
                </div>
            }
            controls={[
                {
                    key: "align",
                    label: "ALIGN",
                    buttons: alignButtons,
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
                <div className="space-y-3">
                    <UiToolbar items={items} align={align} fullWidth={fullWidth} />
                </div>
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            LEFT (compact)
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <UiToolbar
                                align="left"
                                items={[
                                    {
                                        type: "button",
                                        label: "✨ New",
                                        variant: "magic",
                                        size: "sm",
                                        onClick: () => {},
                                    },
                                    {
                                        type: "group",
                                        variant: "soft",
                                        size: "sm",
                                        buttons: [
                                            { children: "A", active: true, onClick: () => {} },
                                            { children: "B", onClick: () => {} },
                                            { children: "C", onClick: () => {} },
                                        ],
                                    },
                                    {
                                        type: "dropdown",
                                        label: "⋯",
                                        variant: "ghost",
                                        size: "sm",
                                        items: [{ label: "Option", onClick: () => {} }],
                                    },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            BETWEEN (full width)
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <UiToolbar
                                align="between"
                                fullWidth
                                items={[
                                    {
                                        type: "button",
                                        label: "⬅︎ Back",
                                        variant: "ghost",
                                        size: "sm",
                                        onClick: () => {},
                                    },
                                    {
                                        type: "group",
                                        variant: "soft",
                                        size: "sm",
                                        buttons: [
                                            { children: "Map", active: true, onClick: () => {} },
                                            { children: "List", onClick: () => {} },
                                        ],
                                    },
                                    {
                                        type: "dropdown",
                                        label: "⚙️",
                                        variant: "soft",
                                        size: "sm",
                                        items: [
                                            { label: "Profile", onClick: () => {} },
                                            { label: "Logout", onClick: () => {} },
                                        ],
                                    },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            RIGHT (actions)
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <UiToolbar
                                align="right"
                                items={[
                                    {
                                        type: "button",
                                        label: "👀 Preview",
                                        variant: "ghost",
                                        size: "sm",
                                        onClick: () => {},
                                    },
                                    {
                                        type: "button",
                                        label: "✅ Save",
                                        variant: "solid",
                                        size: "sm",
                                        onClick: () => {},
                                    },
                                    {
                                        type: "button",
                                        label: "🗑️ Delete",
                                        variant: "danger",
                                        size: "sm",
                                        onClick: () => {},
                                    },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            STRETCH PER ITEM
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <UiToolbar
                                fullWidth
                                align="left"
                                items={[
                                    {
                                        type: "button",
                                        label: "🔍 Search",
                                        variant: "soft",
                                        size: "sm",
                                        fullWidth: true,
                                        onClick: () => {},
                                    },
                                    {
                                        type: "button",
                                        label: "⚙️",
                                        variant: "ghost",
                                        size: "sm",
                                        fullWidth: false,
                                        onClick: () => {},
                                    },
                                    {
                                        type: "dropdown",
                                        label: "More",
                                        variant: "soft",
                                        size: "sm",
                                        fullWidth: false,
                                        items: [{ label: "Option", onClick: () => {} }],
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </div>
            }
            codeBlocks={[
                { key: "import", title: "Import", language: "ts", code: importCode },
                { key: "usage", title: "Usage", language: "tsx", code: previewCode },
            ]}
            propsTable={UiToolbarPropsTable as any}
        />
    );
}
