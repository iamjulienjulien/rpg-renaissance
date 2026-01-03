// src/app/ui/_panels/UiPillPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanel from "../UiComponentPanel";
import { Pill } from "@/components/RpgUi";
import UIActionButtonGroup from "@/components/ui/UiActionButtonGroup";
import type { UIActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";
import { UiPill, type UiPillTone, type UiPillSize } from "@/components/ui/UiPill";

type TitleChoice = "none" | "short" | "long";
type ClickChoice = "none" | "onClick" | "action";

export default function UiPillPanel() {
    const [tone, setTone] = useState<UiPillTone>("theme");
    const [size, setSize] = useState<UiPillSize>("sm");
    const [titleKind, setTitleKind] = useState<TitleChoice>("short");
    const [clickKind, setClickKind] = useState<ClickChoice>("none");
    const [disabled, setDisabled] = useState(false);
    const [forceClickable, setForceClickable] = useState(false);

    const title =
        titleKind === "none"
            ? undefined
            : titleKind === "short"
              ? "Tooltip via UiTooltip"
              : "Une info un peu plus longue, pour vérifier le wrapping, les bords, et le rendu global du tooltip.";

    const code = useMemo(() => {
        const titleProp =
            titleKind === "none"
                ? ""
                : `\n    title="${String(title ?? "").replaceAll('"', '\\"')}"`;

        const clickProp =
            clickKind === "onClick"
                ? "\n    onClick={() => {}}"
                : clickKind === "action"
                  ? `\n    action={{ type: "open_kbar" } as any}`
                  : "";

        return `import { UiPill } from "@/components/ui/UiPill";

<UiPill
    tone="${tone}"
    size="${size}"${titleProp}${clickProp}
    ${disabled ? "disabled" : ""}
    ${forceClickable ? "clickable" : ""}
>
    ✨ Niveau 3
</UiPill>`;
    }, [tone, size, titleKind, title, clickKind, disabled, forceClickable]);

    const toneButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: UiPillTone[] = [
            "theme",
            "neutral",
            "emerald",
            "violet",
            "amber",
            "rose",
            "sky",
            "slate",
        ];

        return items.map((t) => ({
            key: t,
            children: t,
            active: tone === t,
            onClick: () => setTone(t),
        }));
    }, [tone]);

    const sizeButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: UiPillSize[] = ["xs", "sm", "md"];
        return items.map((s) => ({
            key: s,
            children: s,
            active: size === s,
            onClick: () => setSize(s),
        }));
    }, [size]);

    const titleButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: TitleChoice[] = ["none", "short", "long"];
        return items.map((k) => ({
            key: k,
            children: `title: ${k}`,
            active: titleKind === k,
            onClick: () => setTitleKind(k),
        }));
    }, [titleKind]);

    const clickButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: ClickChoice[] = ["none", "onClick", "action"];
        return items.map((k) => ({
            key: k,
            children: `click: ${k}`,
            active: clickKind === k,
            onClick: () => setClickKind(k),
        }));
    }, [clickKind]);

    const flagsButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "force_clickable",
                children: "clickable",
                hint: forceClickable ? "ON" : "OFF",
                active: forceClickable,
                onClick: () => setForceClickable((v) => !v),
            },
            {
                key: "disabled",
                children: "disabled",
                hint: disabled ? "ON" : "OFF",
                active: disabled,
                onClick: () => setDisabled((v) => !v),
            },
        ];
    }, [forceClickable, disabled]);

    // Preview: uniquement ce qui est contrôlé par les groupes
    const previewOnClick = clickKind === "onClick" && !disabled ? () => {} : undefined;

    // action: comme on ne sait pas quels UiAction tu as exactement, on le cast en any ici
    const previewAction =
        clickKind === "action" && !disabled ? ({ type: "open_kbar" } as any) : undefined;

    return (
        <UiComponentPanel
            title="UiPill"
            emoji="🫧"
            subtitle="Pill utilitaire: meta-infos, filtres, badges cliquables. Tooltip intégré via UiTooltip."
            right={
                <div className="flex items-center gap-2">
                    <Pill>{tone}</Pill>
                    <Pill>{size}</Pill>
                </div>
            }
            code={code}
        >
            <div className="space-y-4">
                {/* CONTROLS (groupés) */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">TONE</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="xs"
                            fullWidth
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
                        <div className="text-xs tracking-[0.18em] text-white/45">TITLE</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            fullWidth
                            buttons={titleButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">CLICK</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            fullWidth
                            buttons={clickButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs tracking-[0.18em] text-white/45">FLAGS</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            buttons={flagsButtons}
                            className="w-full sm:w-auto"
                        />
                    </div>
                </div>

                {/* EXAMPLES */}
                <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">EXAMPLES</div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <UiPill tone="theme" title="Renommée actuelle (tooltip)">
                            ✨ Niveau 3
                        </UiPill>

                        <UiPill tone="emerald" onClick={() => {}} title="Clique-moi">
                            🏅 +10 renown
                        </UiPill>

                        <UiPill tone="violet" title="Badge obtenu via achievement">
                            🏷️ Explorateur
                        </UiPill>

                        <UiPill tone="amber" title="Titre honorifique">
                            👑 Artisan de Sagesse
                        </UiPill>

                        <UiPill tone="neutral">info</UiPill>

                        <UiPill tone="slate" size="xs" title="Petit tag discret">
                            tag
                        </UiPill>
                    </div>
                </div>

                {/* PREVIEW */}
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">PREVIEW</div>

                    <div className="mt-3">
                        <UiPill
                            tone={tone}
                            size={size}
                            title={title}
                            onClick={previewOnClick}
                            action={previewAction}
                            disabled={disabled}
                            clickable={forceClickable}
                        >
                            ✨ Niveau 3
                        </UiPill>
                    </div>

                    <div className="mt-3 text-xs text-white/50">
                        Preview = uniquement contrôlé par les groupes ci-dessus.
                    </div>
                </div>
            </div>
        </UiComponentPanel>
    );
}
