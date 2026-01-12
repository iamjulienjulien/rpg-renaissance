// src/app/ui/_panels/UiFormSelectPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanel from "../UiComponentPanel";
import UIActionButtonGroup from "@/components/ui/UiActionButtonGroup";
import type { UIActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";
import { UiPill } from "@/components/ui/UiPill";
import {
    UiFormSelect,
    type UiFormSelectTone,
    type UiFormSelectSize,
} from "@/components/ui/UiFormSelect";

type Mode = "single" | "multi";
type PlaceholderMode = "default" | "custom";

const OPTIONS = [
    {
        value: "first_step",
        label: "Premier pas",
        emoji: "✨",
        description: "Débloqué après la toute première quête.",
    },
    {
        value: "explorer",
        label: "Explorateur",
        emoji: "🧭",
        description: "Tu prends la route et tu regardes vraiment.",
    },
    {
        value: "scribe",
        label: "Scribe",
        emoji: "📜",
        description: "Tu captures l’instant et tu le rends durable.",
    },
    {
        value: "artisan",
        label: "Artisan",
        emoji: "🛠️",
        description: "Tu construis, tu ajustes, tu affines.",
    },
    {
        value: "shadow",
        label: "Ombre",
        emoji: "🫥",
        description: "Discret, mais efficace.",
        disabled: true,
    },
];

const GROUPS = [
    {
        label: "Badges",
        options: [
            {
                value: "first_step",
                label: "Premier pas",
                emoji: "✨",
                description: "Première quête achevée.",
            },
            {
                value: "explorer",
                label: "Explorateur",
                emoji: "🧭",
                description: "Marcheur de chemins.",
            },
        ],
    },
    {
        label: "Titres",
        options: [
            { value: "artisan", label: "Artisan", emoji: "🛠️", description: "Façonne le réel." },
            { value: "scribe", label: "Scribe", emoji: "📜", description: "Garde mémoire." },
        ],
    },
];

export default function UiFormSelectPanel() {
    const [tone, setTone] = useState<UiFormSelectTone>("theme");
    const [size, setSize] = useState<UiFormSelectSize>("md");

    const [mode, setMode] = useState<Mode>("single");
    const [clearable, setClearable] = useState(true);
    const [searchable, setSearchable] = useState(true);
    const [disabled, setDisabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [useGroups, setUseGroups] = useState(false);

    const [placeholderMode, setPlaceholderMode] = useState<PlaceholderMode>("default");
    const [showHint, setShowHint] = useState(true);
    const [showError, setShowError] = useState(false);

    const multiple = mode === "multi";

    const [valSingle, setValSingle] = useState<any>(null);
    const [valMulti, setValMulti] = useState<any[]>([]);

    const value = multiple ? valMulti : valSingle;

    const code = useMemo(() => {
        const p = placeholderMode === "custom" ? `placeholder="Choisis un destin…"\n    ` : "";
        const hintProp =
            showHint && !showError
                ? `\n    hint="Hint: Esc pour fermer, Backspace pour clear."`
                : "";
        const errProp = showError ? `\n    error="Erreur: sélection invalide."` : "";

        return `import { UiFormSelect } from "@/components/ui/UiFormSelect";

<UiFormSelect
    label="UiFormSelect"
    ${p}tone="${tone}"
    size="${size}"
    ${multiple ? "multiple" : ""}
    ${clearable ? "clearable" : ""}
    ${searchable ? "searchable" : ""}
    ${disabled ? "disabled" : ""}
    ${loading ? "loading" : ""}${hintProp}${errProp}
    ${useGroups ? "groups={...}" : "options={...}"}
    value={...}
    onChange={(v) => ...}
/>`;
    }, [
        tone,
        size,
        multiple,
        clearable,
        searchable,
        disabled,
        loading,
        useGroups,
        placeholderMode,
        showHint,
        showError,
    ]);

    const toneButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: UiFormSelectTone[] = ["theme", "neutral", "danger"];
        return items.map((t) => ({
            key: t,
            children: t,
            active: tone === t,
            onClick: () => setTone(t),
        }));
    }, [tone]);

    const sizeButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: UiFormSelectSize[] = ["sm", "md", "lg"];
        return items.map((s) => ({
            key: s,
            children: s,
            active: size === s,
            onClick: () => setSize(s),
        }));
    }, [size]);

    const modeButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: Mode[] = ["single", "multi"];
        return items.map((m) => ({
            key: m,
            children: m,
            active: mode === m,
            onClick: () => {
                setMode(m);
                // reset valeurs pour éviter les bizarreries
                setValSingle(null);
                setValMulti([]);
            },
        }));
    }, [mode]);

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
                key: "searchable",
                children: "searchable",
                hint: searchable ? "ON" : "OFF",
                active: searchable,
                onClick: () => setSearchable((v) => !v),
            },
            {
                key: "groups",
                children: "groups",
                hint: useGroups ? "ON" : "OFF",
                active: useGroups,
                onClick: () => setUseGroups((v) => !v),
            },
            {
                key: "loading",
                children: "loading",
                hint: loading ? "ON" : "OFF",
                active: loading,
                onClick: () => setLoading((v) => !v),
            },
            {
                key: "disabled",
                children: "disabled",
                hint: disabled ? "ON" : "OFF",
                active: disabled,
                onClick: () => setDisabled((v) => !v),
            },
        ];
    }, [clearable, searchable, useGroups, loading, disabled]);

    const textButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "placeholder",
                children: "placeholder",
                hint: placeholderMode === "custom" ? "custom" : "default",
                active: placeholderMode === "custom",
                onClick: () => setPlaceholderMode((v) => (v === "custom" ? "default" : "custom")),
            },
            {
                key: "hint",
                children: "hint",
                hint: showHint ? "ON" : "OFF",
                active: showHint,
                onClick: () => setShowHint((v) => !v),
            },
            {
                key: "error",
                children: "error",
                hint: showError ? "ON" : "OFF",
                active: showError,
                onClick: () => setShowError((v) => !v),
            },
        ];
    }, [placeholderMode, showHint, showError]);

    return (
        <UiComponentPanel
            title="UiFormSelect"
            emoji="🧾"
            subtitle="Select moderne (single/multi), clearable, searchable, options groupées, clavier, états."
            right={
                <div className="flex items-center gap-2">
                    <UiPill tone="neutral">{mode}</UiPill>
                    <UiPill tone="theme">{tone}</UiPill>
                </div>
            }
            code={code}
        >
            <div className="space-y-4">
                {/* CONTROLS */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">MODE</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            buttons={modeButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">TONE</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            buttons={toneButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">SIZE</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            buttons={sizeButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">FLAGS</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="xs"
                            fullWidth
                            buttons={flagsButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">TEXT</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="xs"
                            fullWidth
                            buttons={textButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>
                </div>

                {/* PREVIEW */}
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">PREVIEW</div>

                    <div className="mt-3 max-w-130">
                        <UiFormSelect
                            label="Récompense"
                            placeholder={
                                placeholderMode === "custom" ? "Choisis un destin…" : undefined
                            }
                            hint={
                                showHint && !showError
                                    ? "Hint: Esc pour fermer, Backspace pour clear (si vide)."
                                    : undefined
                            }
                            error={showError ? "Erreur: sélection invalide." : undefined}
                            tone={tone}
                            size={size}
                            multiple={multiple}
                            clearable={clearable}
                            searchable={searchable}
                            disabled={disabled}
                            loading={loading}
                            groups={useGroups ? (GROUPS as any) : undefined}
                            options={!useGroups ? (OPTIONS as any) : undefined}
                            value={value as any}
                            onChange={(v) => {
                                if (multiple) setValMulti((v as any[]) ?? []);
                                else setValSingle(v as any);
                            }}
                        />
                    </div>

                    <div className="mt-3 text-xs text-white/50">
                        Preview = uniquement contrôlé par les groupes ci-dessus.
                    </div>
                </div>

                {/* EXAMPLES */}
                <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">EXAMPLES</div>

                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <UiFormSelect
                            label="Single (theme)"
                            tone="theme"
                            clearable
                            options={OPTIONS as any}
                            value={"first_step"}
                            onChange={() => {}}
                            hint="Exemple contrôlé."
                        />

                        <UiFormSelect
                            label="Multi (groups)"
                            tone="neutral"
                            multiple
                            clearable
                            groups={GROUPS as any}
                            defaultValue={["explorer", "artisan"]}
                            hint="Multi: chips + +N."
                        />

                        <UiFormSelect
                            label="Danger + error"
                            tone="danger"
                            options={OPTIONS as any}
                            error="Tu ne peux pas choisir cette option."
                            value={null}
                            onChange={() => {}}
                        />

                        <UiFormSelect
                            label="Loading"
                            tone="neutral"
                            loading
                            options={OPTIONS as any}
                            value={null}
                            onChange={() => {}}
                        />
                    </div>
                </div>
            </div>
        </UiComponentPanel>
    );
}
