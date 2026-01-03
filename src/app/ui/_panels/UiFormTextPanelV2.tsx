// src/app/ui/_panels/UiFormTextPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import UiActionButtonGroup from "@/components/ui/UiActionButtonGroup";
import type { UIActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";
import { UiChip } from "@/components/ui/UiChip";
import { UiFormText, type UiFormTextSize, type UiFormTextTone } from "@/components/ui/UiFormText";

type Kind = "input" | "textarea";
type IconChoice = "none" | "sparkle" | "tag" | "crown" | "search";

function iconNode(choice: IconChoice) {
    if (choice === "sparkle") return "✨";
    if (choice === "tag") return "🏷️";
    if (choice === "crown") return "👑";
    if (choice === "search") return "🔎";
    return null;
}

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

export default function UiFormTextPanelV2() {
    const [kind, setKind] = useState<Kind>("input");
    const [tone, setTone] = useState<UiFormTextTone>("theme");
    const [size, setSize] = useState<UiFormTextSize>("md");

    const [labelOn, setLabelOn] = useState(true);
    const [labelTooltipOn, setLabelTooltipOn] = useState(false);
    const [placeholderOn, setPlaceholderOn] = useState(true);
    const [hintOn, setHintOn] = useState(true);
    const [rightOn, setRightOn] = useState(false);

    const [leftIcon, setLeftIcon] = useState<IconChoice>("search");
    const [rightIcon, setRightIcon] = useState<IconChoice>("none");

    const [required, setRequired] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const [readOnly, setReadOnly] = useState(false);
    const [clearable, setClearable] = useState(true);

    const [state, setState] = useState<"default" | "error" | "success">("default");

    const [autoResize, setAutoResize] = useState(true);
    const [rows, setRows] = useState(4);
    const [minRows, setMinRows] = useState(2);
    const [maxRows, setMaxRows] = useState(10);

    const [maxLengthEnabled, setMaxLengthEnabled] = useState(false);
    const [maxLength, setMaxLength] = useState(60);
    const [showCounter, setShowCounter] = useState(true);

    const [value, setValue] = useState("Premier pas…");

    const multiline = kind === "textarea";

    const label = labelOn ? "Nom de la quête" : undefined;
    const labelTooltip = labelTooltipOn
        ? "Conseil: un verbe d’action + un résultat concret."
        : undefined;

    const placeholder = placeholderOn
        ? multiline
            ? "Décris l’objectif en 2-3 phrases…"
            : "Ex: Ranger le salon"
        : undefined;

    const hint =
        hintOn && state === "default" ? "Astuce: court, actionnable, sans blabla." : undefined;

    const error = state === "error" ? "Ce champ est requis." : undefined;
    const success = state === "success" ? "Parfait, c’est clair." : undefined;

    const right = rightOn ? (
        <UiChip tone="slate" size="xs">
            live
        </UiChip>
    ) : undefined;

    const importCode = `import UiFormText from "@/components/ui/UiFormText";`;

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiFormText");

        // base
        if (label) lines.push(`    label="${escapeForAttr(String(label))}"`);
        if (labelTooltip) lines.push(`    labelTooltip="${escapeForAttr(String(labelTooltip))}"`);
        if (placeholder) lines.push(`    placeholder="${escapeForAttr(String(placeholder))}"`);
        if (hint) lines.push(`    hint="${escapeForAttr(String(hint))}"`);
        if (rightOn) lines.push(`    right={<UiChip tone="slate" size="xs">live</UiChip>}`);

        lines.push(`    tone="${tone}"`);
        lines.push(`    size="${size}"`);

        if (multiline) lines.push("    multiline");
        if (multiline) {
            if (autoResize) {
                lines.push("    autoResize");
                lines.push(`    autoResizeMinRows={${minRows}}`);
                lines.push(`    autoResizeMaxRows={${maxRows}}`);
            } else {
                lines.push(`    rows={${rows}}`);
            }
        }

        if (required) lines.push("    required");
        if (disabled) lines.push("    disabled");
        if (readOnly) lines.push("    readOnly");
        if (clearable) lines.push("    clearable");

        if (leftIcon !== "none")
            lines.push(`    leftIcon="${escapeForAttr(String(iconNode(leftIcon)))}"`);
        if (rightIcon !== "none")
            lines.push(`    rightIcon="${escapeForAttr(String(iconNode(rightIcon)))}"`);

        if (state === "error") lines.push(`    error="Requis"`);
        if (state === "success") lines.push(`    success="OK"`);

        if (maxLengthEnabled) {
            lines.push(`    maxLength={${maxLength}}`);
            lines.push(`    showCounter={${showCounter}}`);
        }

        lines.push("    value={value}");
        lines.push("    onChange={setValue}");
        lines.push("/>");

        const stateBlock = `const [value, setValue] = useState(${JSON.stringify(value)});`;

        return `${lines.join("\n")}\n\n${stateBlock}`;
    }, [
        label,
        labelTooltip,
        placeholder,
        hint,
        rightOn,
        tone,
        size,
        multiline,
        autoResize,
        minRows,
        maxRows,
        rows,
        required,
        disabled,
        readOnly,
        clearable,
        leftIcon,
        rightIcon,
        state,
        maxLengthEnabled,
        maxLength,
        showCounter,
        value,
    ]);

    const kindButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Kind[] = ["input", "textarea"];
        return items.map((k) => ({
            key: k,
            children: k,
            active: kind === k,
            onClick: () => setKind(k),
        }));
    }, [kind]);

    const toneButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: UiFormTextTone[] = ["theme", "neutral", "danger", "success"];
        return items.map((t) => ({
            key: t,
            children: t,
            active: tone === t,
            onClick: () => setTone(t),
        }));
    }, [tone]);

    const sizeButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: UiFormTextSize[] = ["sm", "md", "lg"];
        return items.map((s) => ({
            key: s,
            children: s,
            active: size === s,
            onClick: () => setSize(s),
        }));
    }, [size]);

    const stateButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Array<typeof state> = ["default", "error", "success"];
        return items.map((s) => ({
            key: s,
            children: s,
            active: state === s,
            onClick: () => setState(s),
        }));
    }, [state]);

    const textBitsButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "label",
                children: "label",
                hint: labelOn ? "ON" : "OFF",
                active: labelOn,
                onClick: () => setLabelOn((v) => !v),
            },
            {
                key: "labelTooltip",
                children: "labelTooltip",
                hint: labelTooltipOn ? "ON" : "OFF",
                active: labelTooltipOn,
                onClick: () => setLabelTooltipOn((v) => !v),
            },
            {
                key: "placeholder",
                children: "placeholder",
                hint: placeholderOn ? "ON" : "OFF",
                active: placeholderOn,
                onClick: () => setPlaceholderOn((v) => !v),
            },
            {
                key: "hint",
                children: "hint",
                hint: hintOn ? "ON" : "OFF",
                active: hintOn,
                onClick: () => setHintOn((v) => !v),
            },
            {
                key: "right",
                children: "right",
                hint: rightOn ? "ON" : "OFF",
                active: rightOn,
                onClick: () => setRightOn((v) => !v),
            },
        ];
    }, [labelOn, labelTooltipOn, placeholderOn, hintOn, rightOn]);

    const flagsButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "clearable",
                children: "clearable",
                hint: clearable ? "ON" : "OFF",
                active: clearable,
                onClick: () => setClearable((v) => !v),
            },
            {
                key: "required",
                children: "required",
                hint: required ? "ON" : "OFF",
                active: required,
                onClick: () => setRequired((v) => !v),
            },
            {
                key: "readOnly",
                children: "readOnly",
                hint: readOnly ? "ON" : "OFF",
                active: readOnly,
                onClick: () => setReadOnly((v) => !v),
            },
            {
                key: "disabled",
                children: "disabled",
                hint: disabled ? "ON" : "OFF",
                active: disabled,
                onClick: () => setDisabled((v) => !v),
            },
        ];
    }, [clearable, required, readOnly, disabled]);

    const leftIconButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: IconChoice[] = ["none", "search", "sparkle", "tag", "crown"];
        return items.map((k) => ({
            key: k,
            children: `left: ${k}`,
            active: leftIcon === k,
            onClick: () => setLeftIcon(k),
        }));
    }, [leftIcon]);

    const rightIconButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: IconChoice[] = ["none", "search", "sparkle", "tag", "crown"];
        return items.map((k) => ({
            key: k,
            children: `right: ${k}`,
            active: rightIcon === k,
            onClick: () => setRightIcon(k),
        }));
    }, [rightIcon]);

    const textareaModeButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "autoResize",
                children: "autoResize",
                hint: autoResize ? "ON" : "OFF",
                active: autoResize,
                onClick: () => setAutoResize((v) => !v),
            },
            {
                key: "rows4",
                children: "rows=4",
                active: !autoResize && rows === 4,
                onClick: () => {
                    setAutoResize(false);
                    setRows(4);
                },
            },
            {
                key: "rows6",
                children: "rows=6",
                active: !autoResize && rows === 6,
                onClick: () => {
                    setAutoResize(false);
                    setRows(6);
                },
            },
        ];
    }, [autoResize, rows]);

    const maxLengthButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "maxLength",
                children: "maxLength",
                hint: maxLengthEnabled ? "ON" : "OFF",
                active: maxLengthEnabled,
                onClick: () => setMaxLengthEnabled((v) => !v),
            },
            {
                key: "counter",
                children: "showCounter",
                hint: showCounter ? "ON" : "OFF",
                active: showCounter,
                onClick: () => setShowCounter((v) => !v),
            },
            {
                key: "len60",
                children: "len=60",
                active: maxLength === 60,
                onClick: () => setMaxLength(60),
            },
            {
                key: "len140",
                children: "len=140",
                active: maxLength === 140,
                onClick: () => setMaxLength(140),
            },
        ];
    }, [maxLengthEnabled, showCounter, maxLength]);

    return (
        <UiComponentPanelV2
            title="UiFormText"
            emoji="✍️"
            subtitle="Input & textarea unifiés: label (+tooltip), hint/error/success, icons, clear button, compteur, autosize textarea."
            headerBadges={
                <div className="flex items-center gap-2">
                    <UiChip tone="slate" size="xs">
                        {kind}
                    </UiChip>
                    <UiChip tone="slate" size="xs">
                        {tone}
                    </UiChip>
                    <UiChip tone="slate" size="xs">
                        {size}
                    </UiChip>
                </div>
            }
            controls={[
                {
                    key: "kind",
                    label: "KIND",
                    hint: "input (single-line) ou textarea (multiline).",
                    buttons: kindButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
                {
                    key: "tone",
                    label: "TONE",
                    hint: "Ton visuel (attention: error/success props ont la priorité visuelle).",
                    buttons: toneButtons,
                    groupVariant: "soft",
                    groupSize: "xs",
                },
                {
                    key: "size",
                    label: "SIZE",
                    hint: "Padding + taille texte.",
                    buttons: sizeButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
                {
                    key: "state",
                    label: "STATE",
                    hint: "Simule error/success (priorité: error > success > tone).",
                    buttons: stateButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
                {
                    key: "textbits",
                    label: "TEXT",
                    hint: "Afficher/masquer label, tooltip, placeholder, hint, right.",
                    buttons: textBitsButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
                {
                    key: "icons",
                    label: "ICONS",
                    hint: "Icônes dans le champ (leftIcon/rightIcon).",
                    buttons: leftIconButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                    fullWidth: true,
                },
                {
                    key: "icons2",
                    label: " ",
                    hint: " ",
                    buttons: rightIconButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                    fullWidth: true,
                },
                {
                    key: "flags",
                    label: "FLAGS",
                    hint: "Comportements: clearable, required, readOnly, disabled.",
                    buttons: flagsButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
                {
                    key: "counter",
                    label: "COUNTER",
                    hint: "maxLength + compteur (showCounter).",
                    buttons: maxLengthButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
            ]}
            preview={
                <UiFormText
                    label={label}
                    labelTooltip={labelTooltip}
                    placeholder={placeholder}
                    hint={hint}
                    right={right}
                    required={required}
                    disabled={disabled}
                    readOnly={readOnly}
                    size={size}
                    tone={tone}
                    multiline={multiline}
                    rows={rows}
                    autoResize={multiline ? autoResize : undefined}
                    autoResizeMinRows={minRows}
                    autoResizeMaxRows={maxRows}
                    leftIcon={iconNode(leftIcon)}
                    rightIcon={iconNode(rightIcon)}
                    clearable={clearable}
                    maxLength={maxLengthEnabled ? maxLength : undefined}
                    showCounter={showCounter}
                    value={value}
                    onChange={setValue}
                    onClear={() => setValue("")}
                    error={state === "error" ? "Requis" : undefined}
                    success={state === "success" ? "OK" : undefined}
                />
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">LOGIN</div>
                        <div className="mt-3 space-y-3">
                            <UiFormText
                                label="Email"
                                placeholder="julien@exemple.fr"
                                tone="neutral"
                                value=""
                                onChange={() => {}}
                                leftIcon="📮"
                                hint="On ne le partage pas."
                                maxLength={120}
                            />
                            <UiFormText
                                label="Mot de passe"
                                placeholder="••••••••"
                                tone="neutral"
                                type="password"
                                value=""
                                onChange={() => {}}
                                leftIcon="🔒"
                                hint="Au moins 8 caractères."
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">QUEST NOTE</div>
                        <div className="mt-3">
                            <UiFormText
                                multiline
                                autoResize
                                autoResizeMinRows={3}
                                autoResizeMaxRows={10}
                                label="Note de quête"
                                placeholder="Décris l’objectif, le plan, puis la récompense…"
                                tone="theme"
                                value="Aujourd’hui: une action courte, un résultat clair."
                                onChange={() => {}}
                                clearable
                                leftIcon="🧭"
                                right={
                                    <UiChip tone="slate" size="xs">
                                        journal
                                    </UiChip>
                                }
                                hint="Tu pourras relire ça dans le journal."
                                maxLength={240}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">ERROR</div>
                        <div className="mt-3">
                            <UiFormText
                                label="Titre"
                                placeholder="Ex: Premier pas"
                                tone="theme"
                                value=""
                                onChange={() => {}}
                                error="Requis"
                                hint="Le titre doit être renseigné."
                                leftIcon="🏷️"
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/55">READONLY</div>
                        <div className="mt-3">
                            <UiFormText
                                label="Code"
                                labelTooltip="Slug stable côté BDD."
                                tone="neutral"
                                value="first_step"
                                onChange={() => {}}
                                readOnly
                                rightIcon="📌"
                                hint="Identifiant stable."
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
                    description: "Reprend l’état actuel des contrôles (comme PREVIEW).",
                },
            ]}
            propsTable={[
                { name: "id", type: "string", description: "Identifiant HTML (sinon auto)." },
                { name: "label", type: "React.ReactNode", description: "Label au-dessus." },
                {
                    name: "labelTooltip",
                    type: "React.ReactNode",
                    description: "Tooltip sur le label (UiTooltip).",
                },
                { name: "placeholder", type: "string", description: "Placeholder." },
                { name: "hint", type: "React.ReactNode", description: "Hint sous le champ." },
                {
                    name: "error",
                    type: "React.ReactNode",
                    description: "Message erreur (prioritaire visuellement).",
                },
                {
                    name: "success",
                    type: "React.ReactNode",
                    description: "Message succès (si pas d’erreur).",
                },
                {
                    name: "right",
                    type: "React.ReactNode",
                    description: "Contenu à droite du label (chip/bouton/etc).",
                },
                {
                    name: "required",
                    type: "boolean",
                    description: "Affiche * requis sur le label.",
                    default: "false",
                },
                { name: "disabled", type: "boolean", description: "Désactive le champ." },
                { name: "readOnly", type: "boolean", description: "Lecture seule." },
                {
                    name: "size",
                    type: `"sm" | "md" | "lg"`,
                    description: "Taille visuelle.",
                    default: `"md"`,
                },
                {
                    name: "tone",
                    type: `"theme" | "neutral" | "danger" | "success"`,
                    description: "Ton visuel (si pas d’erreur/succès).",
                    default: `"theme"`,
                },
                { name: "multiline", type: "boolean", description: "Textarea si true." },
                {
                    name: "rows",
                    type: "number",
                    description: "Rows textarea si !autoResize.",
                    default: "4",
                },
                { name: "autoResize", type: "boolean", description: "Autosize textarea." },
                {
                    name: "autoResizeMinRows",
                    type: "number",
                    description: "Min rows autosize.",
                    default: "2",
                },
                {
                    name: "autoResizeMaxRows",
                    type: "number",
                    description: "Max rows autosize.",
                    default: "10",
                },
                { name: "value", type: "string", description: "Valeur contrôlée." },
                { name: "defaultValue", type: "string", description: "Valeur non contrôlée." },
                {
                    name: "onChange",
                    type: "(value: string) => void",
                    description: "Callback changement.",
                },
                {
                    name: "onBlur",
                    type: "React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>",
                    description: "Blur handler.",
                },
                {
                    name: "onFocus",
                    type: "React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>",
                    description: "Focus handler.",
                },
                {
                    name: "onKeyDown",
                    type: "React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>",
                    description: "Keydown handler.",
                },
                { name: "name", type: "string", description: "Attribut name HTML." },
                { name: "autoComplete", type: "string", description: "Autocomplete." },
                {
                    name: "type",
                    type: "React.HTMLInputTypeAttribute",
                    description: "Type input (si !multiline).",
                    default: `"text"`,
                },
                {
                    name: "leftIcon",
                    type: "React.ReactNode",
                    description: "Icône/prefixe à gauche.",
                },
                {
                    name: "rightIcon",
                    type: "React.ReactNode",
                    description: "Icône/suffixe à droite.",
                },
                {
                    name: "clearable",
                    type: "boolean",
                    description: "Affiche bouton clear (si contrôlé).",
                },
                { name: "onClear", type: "() => void", description: "Callback clear." },
                {
                    name: "maxLength",
                    type: "number",
                    description: "Limite caractères (compteur si showCounter).",
                },
                {
                    name: "showCounter",
                    type: "boolean",
                    description: "Affiche compteur (si maxLength).",
                    default: "true",
                },
                { name: "className", type: "string", description: "Classe wrapper." },
                { name: "inputClassName", type: "string", description: "Classe input/textarea." },
                {
                    name: "data-testid",
                    type: "string",
                    description: "Test id.",
                },
            ]}
        />
    );
}
