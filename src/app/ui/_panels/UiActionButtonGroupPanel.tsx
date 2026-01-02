// src/app/ui/_panels/UiActionButtonGroupPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanel from "../UiComponentPanel";
import UIActionButton from "@/components/ui/UiActionButton";
import UIActionButtonGroup from "@/components/ui/UiActionButtonGroup";
import { Pill } from "@/components/RpgUi";

export default function UiActionButtonGroupPanel() {
    const [variant, setVariant] = useState<"soft" | "solid" | "danger">("soft");
    const [size, setSize] = useState<"xs" | "sm" | "md" | "lg" | "xl">("md");
    const [fullWidth, setFullWidth] = useState(false);
    const [disabled, setDisabled] = useState(false);

    const [value, setValue] = useState<"years" | "months" | "days">("months");

    const buttons = useMemo(
        () => [
            {
                key: "years",
                children: "Years",
                active: value === "years",
                disabled,
                onClick: () => setValue("years"),
            },
            {
                key: "months",
                children: "Months",
                active: value === "months",
                disabled,
                onClick: () => setValue("months"),
            },
            {
                key: "days",
                children: "Days",
                active: value === "days",
                disabled,
                onClick: () => setValue("days"),
            },
        ],
        [value, disabled]
    );

    const code = useMemo(() => {
        return `import UIActionButtonGroup from "@/components/ui/UIActionButtonGroup";

const [value, setValue] = useState<"years" | "months" | "days">("${value}");

<UIActionButtonGroup
    variant="${variant}"
    size="${size}"
    ${fullWidth ? "fullWidth" : ""}
    buttons={[
        {
            children: "Years",
            active: value === "years",
            ${disabled ? "disabled: true," : ""}
            onClick: () => setValue("years"),
        },
        {
            children: "Months",
            active: value === "months",
            ${disabled ? "disabled: true," : ""}
            onClick: () => setValue("months"),
        },
        {
            children: "Days",
            active: value === "days",
            ${disabled ? "disabled: true," : ""}
            onClick: () => setValue("days"),
        },
    ]}
/>`;
    }, [variant, size, fullWidth, disabled, value]);

    return (
        <UiComponentPanel
            title="UIActionButtonGroup"
            emoji="🧰"
            subtitle='Segmented control: le groupe force "variant" et "size" sur les boutons.'
            right={
                <div className="flex items-center gap-2">
                    <Pill>{variant}</Pill>
                    <Pill>{size}</Pill>
                </div>
            }
            code={code}
        >
            <div className="space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Variant (group) */}
                    <UIActionButton
                        variant="solid"
                        active={variant === "soft"}
                        size="sm"
                        onClick={() => setVariant("soft")}
                    >
                        variant: soft
                    </UIActionButton>
                    <UIActionButton
                        variant="solid"
                        active={variant === "solid"}
                        size="sm"
                        onClick={() => setVariant("solid")}
                    >
                        variant: solid
                    </UIActionButton>
                    <UIActionButton
                        variant="solid"
                        active={variant === "danger"}
                        size="sm"
                        onClick={() => setVariant("danger")}
                    >
                        variant: danger
                    </UIActionButton>

                    <span className="mx-1 opacity-30">|</span>

                    {/* Size (group) */}
                    <UIActionButton
                        variant="soft"
                        size="sm"
                        onClick={() => setSize("xs")}
                        hint={size === "xs" ? "✓" : undefined}
                    >
                        xs
                    </UIActionButton>
                    <UIActionButton
                        variant="soft"
                        size="sm"
                        onClick={() => setSize("sm")}
                        hint={size === "sm" ? "✓" : undefined}
                    >
                        sm
                    </UIActionButton>
                    <UIActionButton
                        variant="soft"
                        size="sm"
                        onClick={() => setSize("md")}
                        hint={size === "md" ? "✓" : undefined}
                    >
                        md
                    </UIActionButton>
                    <UIActionButton
                        variant="soft"
                        size="sm"
                        onClick={() => setSize("lg")}
                        hint={size === "lg" ? "✓" : undefined}
                    >
                        lg
                    </UIActionButton>
                    <UIActionButton
                        variant="soft"
                        size="sm"
                        onClick={() => setSize("xl")}
                        hint={size === "xl" ? "✓" : undefined}
                    >
                        xl
                    </UIActionButton>

                    <span className="mx-1 opacity-30">|</span>

                    {/* Toggles */}
                    <UIActionButton
                        variant="soft"
                        size="sm"
                        onClick={() => setFullWidth((v) => !v)}
                        hint={fullWidth ? "ON" : "OFF"}
                    >
                        fullWidth
                    </UIActionButton>

                    <UIActionButton
                        variant="soft"
                        size="sm"
                        onClick={() => setDisabled((v) => !v)}
                        hint={disabled ? "ON" : "OFF"}
                    >
                        disabled
                    </UIActionButton>
                </div>

                {/* Preview */}
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">PREVIEW</div>

                    <div className="mt-3">
                        <UIActionButtonGroup
                            variant={variant}
                            size={size}
                            fullWidth={fullWidth}
                            buttons={buttons}
                        />

                        <div className="mt-3 text-xs text-white/50">
                            Astuce: <b>soft</b> rend le group “toolbar”, <b>solid</b> plus présent,
                            <b>danger</b> pour des choix destructifs (reset, delete…).
                        </div>
                    </div>
                </div>
            </div>
        </UiComponentPanel>
    );
}
