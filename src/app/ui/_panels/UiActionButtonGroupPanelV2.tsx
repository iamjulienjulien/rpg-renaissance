// src/app/ui/_panels/UiActionButtonGroupPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import { UiChip } from "@/components/ui/UiChip";
import {
    UiActionButtonGroup,
    UiActionButtonGroupPropsTable,
    type UiActionButtonGroupProps,
    type UiActionButtonGroupButton,
} from "@/components/ui";
import type { UiActionButtonGroupButton as GroupBtn } from "@/components/ui/UiActionButtonGroup";

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

export default function UiActionButtonGroupPanelV2() {
    const [variant, setVariant] =
        useState<NonNullable<UiActionButtonGroupProps["variant"]>>("soft");
    const [size, setSize] = useState<NonNullable<UiActionButtonGroupProps["size"]>>("md");
    const [fullWidth, setFullWidth] = useState(false);

    // Démo états
    const [activeKey, setActiveKey] = useState<string>("alpha");
    const [disabledOn, setDisabledOn] = useState(false);
    const [hintOn, setHintOn] = useState(true);

    const importCode = `import { UiActionButtonGroup } from "@/components/ui";`;

    const demoButtons: UiActionButtonGroupButton[] = useMemo(() => {
        const mk = (key: string, label: string, hint?: string): UiActionButtonGroupButton => ({
            key,
            children: label,
            hint,
            active: activeKey === key,
            disabled: disabledOn && key === "gamma",
            onClick: () => setActiveKey(key),
        });

        return [
            mk("alpha", "Alpha", hintOn ? "1" : undefined),
            mk("beta", "Beta", hintOn ? "2" : undefined),
            mk("gamma", "Gamma", hintOn ? "3" : undefined),
        ];
    }, [activeKey, disabledOn, hintOn]);

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiActionButtonGroup");

        if (variant) lines.push(`    variant="${variant}"`);
        if (size) lines.push(`    size="${size}"`);
        if (fullWidth) lines.push("    fullWidth");

        lines.push("    buttons={[");
        lines.push(
            `        { key: "alpha", children: "Alpha"${
                hintOn ? `, hint: "${escapeForAttr("1")}"` : ""
            }, active: true, onClick: () => {} },`
        );
        lines.push(
            `        { key: "beta", children: "Beta"${
                hintOn ? `, hint: "${escapeForAttr("2")}"` : ""
            }, onClick: () => {} },`
        );
        lines.push(
            `        { key: "gamma", children: "Gamma"${
                hintOn ? `, hint: "${escapeForAttr("3")}"` : ""
            }${disabledOn ? ", disabled: true" : ""}, onClick: () => {} },`
        );
        lines.push("    ]}");
        lines.push("/>");

        return lines.join("\n");
    }, [variant, size, fullWidth, hintOn, disabledOn]);

    const variantButtons = useMemo<GroupBtn[]>(() => {
        const items: Array<NonNullable<UiActionButtonGroupProps["variant"]>> = [
            "soft",
            "solid",
            "danger",
        ];

        return items.map((v) => ({
            key: v,
            children: v,
            active: variant === v,
            className: `text-${v}`,
            onClick: () => setVariant(v),
        }));
    }, [variant]);

    const sizeButtons = useMemo<GroupBtn[]>(() => {
        const items: Array<NonNullable<UiActionButtonGroupProps["size"]>> = [
            "xs",
            "sm",
            "md",
            "lg",
            "xl",
        ];

        return items.map((s) => ({
            key: s,
            children: s,
            active: size === s,
            onClick: () => setSize(s),
        }));
    }, [size]);

    const flagsButtons = useMemo<GroupBtn[]>(() => {
        return [
            {
                key: "fullWidth",
                children: "fullWidth",
                // hint: fullWidth ? "ON" : "OFF",
                active: fullWidth,
                className: fullWidth ? "text-success" : "text-error",
                onClick: () => setFullWidth((v) => !v),
            },
            {
                key: "disabled",
                children: "disabled",
                // hint: disabledOn ? "ON" : "OFF",
                active: disabledOn,
                className: disabledOn ? "text-success" : "text-error",
                onClick: () => setDisabledOn((v) => !v),
            },
            {
                key: "hint",
                children: "hint",
                // hint: hintOn ? "ON" : "OFF",
                active: hintOn,
                className: hintOn ? "text-success" : "text-error",
                onClick: () => setHintOn((v) => !v),
            },
        ];
    }, [fullWidth, disabledOn, hintOn]);

    return (
        <UiComponentPanelV2
            title="UiActionButtonGroup"
            emoji="🧩"
            headerBadges={
                <div className="flex items-center gap-2">
                    <UiChip tone="slate" size="md">
                        {variant}
                    </UiChip>
                    <UiChip tone="slate" size="md">
                        {size}
                    </UiChip>
                    {fullWidth ? (
                        <UiChip tone="slate" size="md">
                            fullWidth
                        </UiChip>
                    ) : null}
                    {disabledOn ? (
                        <UiChip tone="slate" size="md">
                            disabled
                        </UiChip>
                    ) : null}
                    {hintOn ? (
                        <UiChip tone="slate" size="md">
                            hint
                        </UiChip>
                    ) : null}
                </div>
            }
            controls={[
                {
                    key: "variant",
                    label: "VARIANT",
                    buttons: variantButtons,
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
                <div className="space-y-3">
                    <UiActionButtonGroup
                        variant={variant}
                        size={size}
                        fullWidth={fullWidth}
                        buttons={demoButtons}
                    />

                    {/* <div className="text-xs text-white/45">
                        Astuce: clique un segment pour changer <b>active</b>. Le segment{" "}
                        <b>Gamma</b> devient disabled quand <b>disabled</b> est ON.
                    </div> */}
                </div>
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            FILTERS
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <UiActionButtonGroup
                                variant="soft"
                                size="sm"
                                buttons={[
                                    {
                                        key: "all",
                                        children: "Tout",
                                        active: true,
                                        onClick: () => {},
                                    },
                                    { key: "done", children: "Done", onClick: () => {} },
                                    { key: "todo", children: "Todo", onClick: () => {} },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            SOLID TOOLBAR
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <UiActionButtonGroup
                                variant="solid"
                                size="md"
                                buttons={[
                                    { key: "left", children: "◀", onClick: () => {} },
                                    { key: "play", children: "▶", active: true, onClick: () => {} },
                                    { key: "right", children: "▶", onClick: () => {} },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            FULL WIDTH
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <UiActionButtonGroup
                                fullWidth
                                variant="soft"
                                size="md"
                                buttons={[
                                    { key: "a", children: "A", active: true, onClick: () => {} },
                                    { key: "b", children: "B", onClick: () => {} },
                                    { key: "c", children: "C", onClick: () => {} },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            DANGER SEGMENTS
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl">
                            <UiActionButtonGroup
                                variant="danger"
                                size="sm"
                                buttons={[
                                    { key: "keep", children: "Garder", onClick: () => {} },
                                    {
                                        key: "del",
                                        children: "Supprimer",
                                        active: true,
                                        onClick: () => {},
                                    },
                                    {
                                        key: "ban",
                                        children: "Bannir",
                                        disabled: true,
                                        onClick: () => {},
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
            propsTable={UiActionButtonGroupPropsTable as any}
        />
    );
}
