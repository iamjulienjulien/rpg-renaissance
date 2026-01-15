// src/app/ui/UiComponentPanelV2.tsx
"use client";

import React, { useMemo, useState } from "react";
import { UiPanel } from "@/components/ui/UiPanel";
import { UiChip } from "@/components/ui/UiChip";
import UiActionButton from "@/components/ui/UiActionButton";
import { UiActionButtonGroup, type UiActionButtonGroupButton } from "@/components/ui";
// import type {  } from "@/components/ui/UiActionButtonGroup";
import UiTooltip from "@/components/ui/UiTooltip";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UiComponentPanelCodeBlock = {
    key: string;
    title: string;
    code: string;
    language?: string;
    description?: string;
};

export type UiComponentPanelPropRow = {
    name: string;
    type: string;
    description: string;
    default?: string;
    required?: boolean;
};

export type UiComponentPanelControlRow = {
    key: string;
    label: string;
    hint?: string;
    buttons: UiActionButtonGroupButton[];
    groupVariant?: "soft" | "solid";
    groupSize?: "xs" | "sm" | "md" | "lg" | "xl";
    fullWidth?: boolean;
    right?: React.ReactNode;
};

export type UiComponentPanelV2Props = {
    title: string;
    emoji?: string;
    subtitle?: string;

    collapsible?: boolean;
    defaultCollapsed?: boolean;

    controls?: UiComponentPanelControlRow[] | UiComponentPanelControlRow[][];
    preview: React.ReactNode;
    examples?: React.ReactNode;
    codeBlocks?: UiComponentPanelCodeBlock[];
    propsTable?: UiComponentPanelPropRow[];

    /** badges représentant l’état courant (variant, size, etc.) */
    headerBadges?: React.ReactNode;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function TableCell({ children }: { children: React.ReactNode }) {
    return <td className="px-3 py-2 align-top text-xs text-white/70">{children}</td>;
}

function TableHead({ children }: { children: React.ReactNode }) {
    return <th className="px-3 py-2 text-left text-sm font-normal text-white/55">{children}</th>;
}

function CodeBlock({ block }: { block: UiComponentPanelCodeBlock }) {
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        await navigator.clipboard.writeText(block.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 900);
    };

    return (
        <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/55">
                            {block.title.toUpperCase()}
                        </div>
                        {block.language && (
                            <UiChip tone="slate" size="xs">
                                {block.language}
                            </UiChip>
                        )}
                    </div>
                    {/* {block.description && (
                        <div className="mt-1 text-xs text-white/45">{block.description}</div>
                    )} */}
                </div>

                <UiActionButton variant="soft" size="xs" onClick={onCopy} active={copied}>
                    {copied ? "✅ Copié" : "📋 Copier"}
                </UiActionButton>
            </div>

            <pre className="p-4 overflow-auto font-mono text-xs text-white/70 bg-black/40">
                <code className="font-mono">{block.code}</code>
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
    const hasCode = Boolean(codeBlocks?.length);

    const controlRows = useMemo<UiComponentPanelControlRow[][]>(() => {
        if (!controls) return [];

        // Si c’est déjà un tableau de tableaux → OK
        if (Array.isArray(controls[0])) {
            return controls as UiComponentPanelControlRow[][];
        }

        // Sinon on wrap dans une seule ligne
        return [controls as UiComponentPanelControlRow[]];
    }, [controls]);

    const controlsSection = useMemo(() => {
        if (!controlRows.length) return null;

        return (
            <div className="space-y-4">
                {controlRows.map((line, lineIndex) => (
                    <div key={lineIndex} className="flex justify-between gap-6">
                        {line.map((row) => (
                            <div key={row.key} className="space-y-2">
                                <div>
                                    <div className="text-xs tracking-[0.18em] text-white/45">
                                        {row.label}
                                    </div>
                                </div>

                                <UiActionButtonGroup
                                    variant={row.groupVariant ?? "soft"}
                                    size="xs"
                                    buttons={row.buttons}
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }, [controlRows]);

    /* ================= PREVIEW ================= */

    const previewCard = (
        <div>
            <div className="mt-4 text-xs tracking-[0.18em] text-white/55">PREVIEW</div>
            <div className="mt-2 rounded-2xl bg-black/25  ring-1 ring-white/10">
                <div className="border-b border-white/10 p-4 pt-4">{controlsSection}</div>
                <div className="flex items-center justify-between p-4 bg-black/20 border-b border-white/10">
                    {headerBadges && <div className="flex flex-wrap gap-2">{headerBadges}</div>}
                    {hasCode && (
                        <UiTooltip content={codeOpen ? "Masquer le code" : "Afficher le code"}>
                            <UiActionButton
                                variant="soft"
                                active={codeOpen}
                                size="xs"
                                onClick={() => setCodeOpen((v) => !v)}
                            >
                                ⌨️ Code
                            </UiActionButton>
                        </UiTooltip>
                    )}
                </div>

                <div className="p-4 bg-black/45 rounded-b-2xl">{preview}</div>
            </div>
        </div>
    );

    /* ================= CODE ================= */

    const codeSection =
        hasCode && codeOpen ? (
            <div className="mt-4 space-y-3">
                <div className="text-xs tracking-[0.18em] text-white/55">CODE</div>
                <div className="grid gap-3">
                    {codeBlocks!.map((b) => (
                        <CodeBlock key={b.key} block={b} />
                    ))}
                </div>
            </div>
        ) : null;

    /* ================= EXAMPLES ================= */

    const examplesSection = examples ? (
        <div>
            <div className="text-xs tracking-[0.18em] text-white/55 mt-6">EXAMPLES</div>
            <div className="">
                <div className="mt-3">{examples}</div>
            </div>
        </div>
    ) : null;

    /* ================= PROPS ================= */

    const propsSection = propsTable?.length ? (
        <div className="mt-5 pb-1">
            <div className="text-xs tracking-[0.18em] text-white/55">PROPS</div>

            <div className="mt-3 overflow-auto rounded-2xl ring-1 ring-white/10">
                <table className="min-w-245 w-full border-collapse bg-black/25">
                    <thead className="">
                        <tr>
                            <TableHead>name</TableHead>
                            <TableHead>description</TableHead>
                            <TableHead>type</TableHead>
                            <TableHead>default</TableHead>
                            <TableHead>required</TableHead>
                        </tr>
                    </thead>
                    <tbody className="bg-black/45">
                        {propsTable.map((p) => (
                            <tr key={p.name} className="border-t border-white/10 hover:bg-white/3">
                                <TableCell>
                                    <span className="font-mono text-white/85">{p.name}</span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-white/45">{p.description}</span>
                                </TableCell>
                                <TableCell>
                                    <span className="font-mono text-white/70">{p.type}</span>
                                </TableCell>
                                <TableCell>
                                    {p.default ?? <span className="text-white/30">—</span>}
                                </TableCell>
                                <TableCell>
                                    {p.required ? (
                                        <UiChip tone="amber" size="xs">
                                            required
                                        </UiChip>
                                    ) : (
                                        <span className="text-white/30">false</span>
                                    )}
                                </TableCell>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    ) : null;

    return (
        <UiPanel
            title={title}
            emoji={emoji}
            subtitle={subtitle ?? undefined}
            collapsible={collapsible}
            defaultOpen={defaultCollapsed}
        >
            {previewCard}
            {codeSection}
            {examplesSection}
            {propsSection}
        </UiPanel>
    );
}
