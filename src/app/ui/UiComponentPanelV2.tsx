// src/app/ui/UiComponentPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import { UiPanel } from "@/components/ui/UiPanel";
import { UiChip } from "@/components/ui/UiChip";
import UiActionButton from "@/components/ui/UiActionButton";
import UiActionButtonGroup from "@/components/ui/UiActionButtonGroup";
import type { UIActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";
import UiTooltip from "@/components/ui/UiTooltip";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UiComponentPanelCodeBlock = {
    key: string;
    title: string; // ex: "IMPORT"
    code: string;
    language?: string; // display only
    description?: string;
};

export type UiComponentPanelPropRow = {
    name: string;
    type: string;
    description: string;
    default?: string;
};

export type UiComponentPanelControlRow = {
    key: string;
    label: string;
    hint?: string;

    /** Boutons groupés */
    buttons: UIActionButtonGroupButton[];

    /** optionnel: taille/variant */
    groupVariant?: "soft" | "solid";
    groupSize?: "xs" | "sm" | "md" | "lg" | "xl";
    fullWidth?: boolean;

    /** optionnel: contenu à droite (ex: chip valeur actuelle) */
    right?: React.ReactNode;
};

export type UiComponentPanelV2Props = {
    title: string;
    emoji?: string;
    subtitle?: string;

    /** Le panel lui-même (accordéon) */
    collapsible?: boolean;
    defaultCollapsed?: boolean;

    /** Controls (rows) */
    controls?: UiComponentPanelControlRow[];

    /** Preview card content */
    preview: React.ReactNode;

    /** Examples card content */
    examples?: React.ReactNode;

    /** Code blocks (import + preview usage, etc.) */
    codeBlocks?: UiComponentPanelCodeBlock[];

    /** Props table */
    propsTable?: UiComponentPanelPropRow[];

    /** Optionnel: tags/chips en header (ex: tone/size) */
    headerBadges?: React.ReactNode;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeCopyLabel(ok: boolean) {
    return ok ? "✅ Copié" : "📋 Copier";
}

async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
}

function TableCell({ children }: { children: React.ReactNode }) {
    return <td className="px-3 py-2 align-top text-xs text-white/70">{children}</td>;
}

function TableHead({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-3 py-2 text-left text-[11px] tracking-[0.18em] text-white/55">
            {children}
        </th>
    );
}

function CodeBlock({ block }: { block: UiComponentPanelCodeBlock }) {
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        try {
            await copyToClipboard(block.code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 900);
        } catch {
            // noop
        }
    };

    return (
        <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/55">
                            {block.title.toUpperCase()}
                        </div>
                        {block.language ? (
                            <UiChip tone="slate" size="xs">
                                {block.language}
                            </UiChip>
                        ) : null}
                    </div>

                    {block.description ? (
                        <div className="mt-1 text-xs text-white/45 line-clamp-2">
                            {block.description}
                        </div>
                    ) : null}
                </div>

                <UiActionButton variant="soft" size="sm" onClick={onCopy}>
                    {safeCopyLabel(copied)}
                </UiActionButton>
            </div>

            <pre className="p-4 overflow-auto text-xs leading-relaxed text-white/70">
                <code>{block.code}</code>
            </pre>
        </div>
    );
}

/* ============================================================================
✅ MAIN
============================================================================ */

export default function UiComponentPanelV2({
    title,
    emoji,
    subtitle,

    collapsible = true,
    defaultCollapsed = false,

    controls,
    preview,
    examples,
    codeBlocks,
    propsTable,
    headerBadges,
}: UiComponentPanelV2Props) {
    const [codeOpen, setCodeOpen] = useState(false);

    const hasCode = Array.isArray(codeBlocks) && codeBlocks.length > 0;

    const headerRight = (
        <div className="flex items-center gap-2">
            {headerBadges ? (
                <div className="hidden sm:flex items-center gap-2">{headerBadges}</div>
            ) : null}

            {hasCode ? (
                <UiTooltip content={codeOpen ? "Masquer le code" : "Afficher le code"}>
                    <span>
                        <UiActionButton
                            variant={codeOpen ? "solid" : "soft"}
                            size="sm"
                            onClick={() => setCodeOpen((v) => !v)}
                        >
                            {"</>"} Code
                        </UiActionButton>
                    </span>
                </UiTooltip>
            ) : null}
        </div>
    );

    const controlsSection = useMemo(() => {
        if (!controls || controls.length === 0) return null;

        return (
            <div className="mt-4 space-y-3">
                {controls.map((row) => (
                    <div key={row.key} className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                                <div className="text-xs tracking-[0.18em] text-white/45">
                                    {row.label}
                                </div>
                                {row.hint ? (
                                    <div className="mt-1 text-xs text-white/40">{row.hint}</div>
                                ) : null}
                            </div>

                            {row.right ? <div className="shrink-0">{row.right}</div> : null}
                        </div>

                        <UiActionButtonGroup
                            variant={row.groupVariant ?? "soft"}
                            size={row.groupSize ?? "sm"}
                            fullWidth={row.fullWidth ?? true}
                            buttons={row.buttons}
                            className="w-full"
                        />
                    </div>
                ))}
            </div>
        );
    }, [controls]);

    const previewCard = (
        <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
            <div className="text-xs tracking-[0.18em] text-white/55">PREVIEW</div>
            <div className="mt-3">{preview}</div>
        </div>
    );

    const examplesCard = examples ? (
        <div className="mt-4 rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
            <div className="text-xs tracking-[0.18em] text-white/55">EXAMPLES</div>
            <div className="mt-3">{examples}</div>
        </div>
    ) : null;

    const codeSection =
        hasCode && codeOpen ? (
            <div className="mt-4 space-y-3">
                <div className="text-xs tracking-[0.18em] text-white/55">CODE</div>
                <div className="grid gap-3">
                    {(codeBlocks ?? []).map((b) => (
                        <CodeBlock key={b.key} block={b} />
                    ))}
                </div>
            </div>
        ) : null;

    const propsSection =
        propsTable && propsTable.length ? (
            <div className="mt-5">
                <div className="text-xs tracking-[0.18em] text-white/55">PROPS</div>

                <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-white/10">
                    <div className="overflow-auto">
                        <table className="min-w-[860px] w-full border-collapse">
                            <thead className="bg-black/20">
                                <tr>
                                    <TableHead>name</TableHead>
                                    <TableHead>type</TableHead>
                                    <TableHead>description</TableHead>
                                    <TableHead>default</TableHead>
                                </tr>
                            </thead>
                            <tbody>
                                {propsTable.map((p) => (
                                    <tr
                                        key={p.name}
                                        className="border-t border-white/10 hover:bg-white/[0.03]"
                                    >
                                        <TableCell>
                                            <span className="font-mono text-white/85">
                                                {p.name}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-white/70">
                                                {p.type}
                                            </span>
                                        </TableCell>
                                        <TableCell>{p.description}</TableCell>
                                        <TableCell>
                                            {p.default ? (
                                                <span className="font-mono text-white/55">
                                                    {p.default}
                                                </span>
                                            ) : (
                                                <span className="text-white/30">—</span>
                                            )}
                                        </TableCell>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        ) : null;

    return (
        <UiPanel
            title={title}
            emoji={emoji}
            subtitle={subtitle}
            right={headerRight}
            collapsible={collapsible}
            defaultOpen={defaultCollapsed}
        >
            {controlsSection}
            {previewCard}
            {examplesCard}
            {codeSection}
            {propsSection}
        </UiPanel>
    );
}
