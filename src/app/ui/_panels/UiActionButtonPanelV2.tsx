// src/app/ui/_panels/UiActionButtonPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanelV2 from "../UiComponentPanelV2";
import { UiChip } from "@/components/ui/UiChip";
import UiActionButton, {
    UiActionButtonPropsTable,
    type UiActionButtonProps,
} from "@/components/ui/UiActionButton";
import type { UiActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";

function escapeForAttr(x: string) {
    return x.replaceAll('"', '\\"');
}

export default function UiActionButtonPanelV2() {
    const [variant, setVariant] = useState<NonNullable<UiActionButtonProps["variant"]>>("magic");
    const [size, setSize] = useState<NonNullable<UiActionButtonProps["size"]>>("md");
    const [fullWidth, setFullWidth] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const [active, setActive] = useState(false);
    const [hintOn, setHintOn] = useState(true);

    const hint = hintOn ? "⌘K" : undefined;

    const importCode = `import { UiActionButton } from "@/components/ui";`;

    const previewCode = useMemo(() => {
        const lines: string[] = [];
        lines.push("<UiActionButton");

        if (variant) lines.push(`    variant="${variant}"`);
        if (size) lines.push(`    size="${size}"`);
        if (fullWidth) lines.push("    fullWidth");
        if (disabled) lines.push("    disabled");
        if (active) lines.push("    active");
        if (hint) lines.push(`    hint="${escapeForAttr(hint)}"`);

        lines.push("    onClick={() => {}}");
        lines.push(">");
        lines.push("    ✨ Continuer");
        lines.push("</UiActionButton>");

        return lines.join("\n");
    }, [variant, size, fullWidth, disabled, active, hint]);

    const variantButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<NonNullable<UiActionButtonProps["variant"]>> = [
            "soft",
            "solid",
            "master",
            "magic",
            "danger",
            "ghost",
        ];
        return items.map((v) => ({
            key: v,
            children: v,
            active: variant === v,
            onClick: () => setVariant(v),
        }));
    }, [variant]);

    const sizeButtons = useMemo<UiActionButtonGroupButton[]>(() => {
        const items: Array<NonNullable<UiActionButtonProps["size"]>> = [
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
            {
                key: "disabled",
                children: "disabled",
                // hint: disabled ? "ON" : "OFF",
                active: disabled,
                className: disabled ? "text-success" : "text-error",
                onClick: () => setDisabled((v) => !v),
            },
            {
                key: "active",
                children: "active",
                // hint: active ? "ON" : "OFF",
                active: active,
                className: active ? "text-success" : "text-error",
                onClick: () => setActive((v) => !v),
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
    }, [fullWidth, disabled, active, hintOn]);

    return (
        <UiComponentPanelV2
            title="UiActionButton"
            emoji="🧿"
            // subtitle="Bouton d’action."
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
                    {disabled ? (
                        <UiChip tone="slate" size="md">
                            disabled
                        </UiChip>
                    ) : null}
                    {active ? (
                        <UiChip tone="slate" size="md">
                            active
                        </UiChip>
                    ) : null}
                    {hint ? (
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
                    hint: "Choisis le style principal (magic pour IA, danger pour actions destructives, ghost pour discret).",
                    buttons: variantButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                    fullWidth: true,
                },
                {
                    key: "size",
                    label: "SIZE",
                    hint: "Affecte padding, radius, taille texte.",
                    buttons: sizeButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
                {
                    key: "flags",
                    label: "FLAGS",
                    hint: "Comportements: largeur, disabled, active, hint.",
                    buttons: flagsButtons,
                    groupVariant: "soft",
                    groupSize: "sm",
                },
            ]}
            preview={
                <div className="space-y-3">
                    <UiActionButton
                        variant={variant}
                        size={size}
                        fullWidth={fullWidth}
                        disabled={disabled}
                        active={active}
                        hint={hint}
                        onClick={() => {}}
                        className={fullWidth ? "justify-center" : undefined}
                    >
                        ✨ Continuer
                    </UiActionButton>

                    {/* <div className="text-xs text-white/50">
                        Astuce: <b>master</b> pour CTA “principal”, <b>magic</b> pour IA,{" "}
                        <b>danger</b> pour suppression, <b>ghost</b> pour actions secondaires.
                    </div> */}
                </div>
            }
            examples={
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            CTA
                        </div>
                        <div className="flex flex-col bg-black/40 p-4 rounded-b-2xl gap-4">
                            <UiActionButton variant="master" size="lg" hint="↵" onClick={() => {}}>
                                👑 Continuer l’aventure
                            </UiActionButton>
                            <UiActionButton variant="solid" size="md" onClick={() => {}}>
                                ✅ Valider
                            </UiActionButton>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            ACTIONS
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl h-full">
                            <div className="flex flex-wrap gap-4">
                                <UiActionButton
                                    variant="magic"
                                    size="sm"
                                    hint="AI"
                                    onClick={() => {}}
                                >
                                    🧙 Générer
                                </UiActionButton>
                                <UiActionButton variant="ghost" size="sm" onClick={() => {}}>
                                    👀 Aperçu
                                </UiActionButton>
                                <UiActionButton
                                    variant="danger"
                                    size="sm"
                                    hint="⌫"
                                    onClick={() => {}}
                                >
                                    🗑️ Supprimer
                                </UiActionButton>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            FULL WIDTH
                        </div>
                        <div className="bg-black/40 p-4 rounded-b-2xl h-full">
                            <UiActionButton variant="magic" fullWidth onClick={() => {}}>
                                🌌 Lancer le prologue
                            </UiActionButton>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 overflow-hidden">
                        <div className="text-xs tracking-[0.18em] border-b border-white/10 text-white/55 p-3">
                            STATE
                        </div>
                        <div className="flex flex-col bg-black/40 p-4 rounded-b-2xl h-full gap-4">
                            <UiActionButton variant="soft" active onClick={() => {}}>
                                🔥 Actif
                            </UiActionButton>
                            <UiActionButton variant="soft" disabled onClick={() => {}}>
                                💤 Désactivé
                            </UiActionButton>
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
                    description: "Reprend l’état actuel des contrôles (comme PREVIEW).",
                },
            ]}
            propsTable={UiActionButtonPropsTable as any}
        />
    );
}
