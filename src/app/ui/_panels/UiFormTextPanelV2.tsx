// src/app/ui/panels/UiFormText.panel.tsx
"use client";

import React, { useMemo, useState } from "react";
import { UiFormText, UiFormTextPropsTable } from "@/components/ui";
import UiComponentPanelV2 from "@/app/ui/UiComponentPanelV2";
import { UiChip } from "@/components/ui/UiChip";
import { UiActionButtonGroup, type UiActionButtonGroupButton } from "@/components/ui";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function UiFormTextPanelV2() {
    const [size, setSize] = useState<"sm" | "md" | "lg">("md");
    const [tone, setTone] = useState<"theme" | "neutral" | "danger" | "success">("theme");
    const [multiline, setMultiline] = useState(false);
    const [autoResize, setAutoResize] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const [readOnly, setReadOnly] = useState(false);
    const [required, setRequired] = useState(false);
    const [clearable, setClearable] = useState(true);

    const [showError, setShowError] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [maxLengthOn, setMaxLengthOn] = useState(false);

    const [value, setValue] = useState("Hello world");

    const controls = useMemo(() => {
        const mk = (key: string, label: React.ReactNode, active: boolean, onClick: () => void) =>
            ({
                key,
                children: label,
                active,
                onClick,
            }) satisfies UiActionButtonGroupButton;

        return [
            // ligne 1
            [
                {
                    key: "mode",
                    label: "Mode",
                    buttons: [
                        mk("single", "single", !multiline, () => setMultiline(false)),
                        mk("multi", "multi", multiline, () => setMultiline(true)),
                    ],
                },
                {
                    key: "size",
                    label: "Size",
                    buttons: [
                        mk("sm", "sm", size === "sm", () => setSize("sm")),
                        mk("md", "md", size === "md", () => setSize("md")),
                        mk("lg", "lg", size === "lg", () => setSize("lg")),
                    ],
                },
                {
                    key: "tone",
                    label: "Tone",
                    buttons: [
                        mk("theme", "theme", tone === "theme", () => setTone("theme")),
                        mk("neutral", "neutral", tone === "neutral", () => setTone("neutral")),
                        mk("danger", "danger", tone === "danger", () => setTone("danger")),
                        mk("success", "success", tone === "success", () => setTone("success")),
                    ],
                },
            ],
            [
                {
                    key: "flags",
                    label: "Flags",
                    buttons: [
                        mk("required", "required", required, () => setRequired((v) => !v)),
                        mk("disabled", "disabled", disabled, () => setDisabled((v) => !v)),
                        mk("readonly", "readOnly", readOnly, () => setReadOnly((v) => !v)),
                    ],
                },
                {
                    key: "extras",
                    label: "Extras",
                    buttons: [
                        mk("clear", "clearable", clearable, () => setClearable((v) => !v)),
                        mk("auto", "autoResize", autoResize, () => setAutoResize((v) => !v)),
                    ],
                },
                {
                    key: "messages",
                    label: "Messages",
                    buttons: [
                        mk("err", "error", showError, () => {
                            setShowError((v) => !v);
                            setShowSuccess(false);
                        }),
                        mk("ok", "success", showSuccess, () => {
                            setShowSuccess((v) => !v);
                            setShowError(false);
                        }),
                        mk("len", "maxLength", maxLengthOn, () => setMaxLengthOn((v) => !v)),
                    ],
                },
            ],
        ];
    }, [
        size,
        tone,
        multiline,
        autoResize,
        disabled,
        readOnly,
        required,
        clearable,
        showError,
        showSuccess,
        maxLengthOn,
    ]);

    const headerBadges = (
        <>
            <UiChip tone="slate" size="xs">
                size: {size}
            </UiChip>
            <UiChip tone="slate" size="xs">
                tone: {tone}
            </UiChip>
            {multiline ? (
                <UiChip tone="slate" size="xs">
                    multiline
                </UiChip>
            ) : (
                <UiChip tone="slate" size="xs">
                    input
                </UiChip>
            )}
            {autoResize ? (
                <UiChip tone="slate" size="xs">
                    autoResize
                </UiChip>
            ) : null}
            {required ? (
                <UiChip tone="amber" size="xs">
                    required
                </UiChip>
            ) : null}
            {disabled ? (
                <UiChip tone="rose" size="xs">
                    disabled
                </UiChip>
            ) : null}
            {readOnly ? (
                <UiChip tone="violet" size="xs">
                    readOnly
                </UiChip>
            ) : null}
        </>
    );

    const code = `import UiFormText from "@/components/ui/UiFormText";

export default function Example() {
    const [value, setValue] = useState("");

    return (
        <UiFormText
            label="Username"
            placeholder="Type here…"
            value={value}
            onChange={setValue}
            size="${size}"
            tone="${tone}"
            multiline={${multiline}}
            autoResize={${autoResize}}
            required={${required}}
            disabled={${disabled}}
            readOnly={${readOnly}}
            clearable={${clearable}}
            maxLength={${maxLengthOn ? 40 : "undefined"}}
            error={${showError ? `"Champ invalide"` : "undefined"}}
            success={${showSuccess ? `"Ok 👌"` : "undefined"}}
        />
    );
}`;

    return (
        <UiComponentPanelV2
            title="UiFormText"
            emoji="✍️"
            // subtitle="Input / Textarea avec label, états (error/success), clear, compteur, auto-resize."
            controls={controls}
            headerBadges={headerBadges}
            propsTable={UiFormTextPropsTable}
            codeBlocks={[
                {
                    key: "usage",
                    title: "Usage",
                    language: "tsx",
                    code,
                },
            ]}
            preview={
                <div className="max-w-xl">
                    <UiFormText
                        label="Nom d’aventure"
                        labelTooltip="Un nom court, mémorable, et un peu épique."
                        placeholder={multiline ? "Raconte ton intention…" : "Ex: Renaissance"}
                        value={value}
                        onChange={setValue}
                        size={size}
                        tone={tone}
                        multiline={multiline}
                        rows={4}
                        autoResize={autoResize}
                        autoResizeMinRows={2}
                        autoResizeMaxRows={10}
                        required={required}
                        disabled={disabled}
                        readOnly={readOnly}
                        clearable={clearable}
                        onClear={() => setValue("")}
                        maxLength={maxLengthOn ? 40 : undefined}
                        showCounter
                        error={showError ? "Champ invalide (exemple)" : undefined}
                        success={showSuccess ? "Parfait 👌" : undefined}
                        right={
                            <UiChip tone="neutral" size="xs">
                                draft
                            </UiChip>
                        }
                        leftIcon={<span className="text-white/60">🧭</span>}
                        rightIcon={<span className="text-white/40">⌘K</span>}
                    />
                </div>
            }
            examples={
                <div className="grid gap-3">
                    <div className="max-w-xl">
                        <UiFormText
                            label="Email"
                            placeholder="you@domain.com"
                            tone="neutral"
                            size="sm"
                            value={value}
                            onChange={setValue}
                            hint="On ne spam pas, promis."
                            leftIcon={<span className="text-white/60">✉️</span>}
                        />
                    </div>

                    <div className="max-w-xl">
                        <UiFormText
                            label="Bio"
                            multiline
                            autoResize
                            tone="theme"
                            value={value}
                            onChange={setValue}
                            hint="Dis juste assez pour intriguer."
                            maxLength={120}
                            showCounter
                        />
                    </div>
                </div>
            }
        />
    );
}
