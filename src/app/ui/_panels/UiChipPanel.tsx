// src/app/ui/_panels/UiChipPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanel from "../UiComponentPanel";
import { Pill } from "@/components/RpgUi";
import UIActionButtonGroup from "@/components/ui/UiActionButtonGroup";
import type { UIActionButtonGroupButton } from "@/components/ui/UiActionButtonGroup";
import { UiChip, type UiChipTone, type UiChipSize } from "@/components/ui/UiChip";

type IconChoice = "none" | "sparkle" | "tag" | "crown" | "trophy";

function iconNode(choice: IconChoice) {
    if (choice === "sparkle") return "✨";
    if (choice === "tag") return "🏷️";
    if (choice === "crown") return "👑";
    if (choice === "trophy") return "🏆";
    return null;
}

export default function UiChipPanel() {
    const [tone, setTone] = useState<UiChipTone>("theme");
    const [size, setSize] = useState<UiChipSize>("sm");
    const [icon, setIcon] = useState<IconChoice>("sparkle");
    const [disabled, setDisabled] = useState(false);
    const [clickable, setClickable] = useState(false);

    const code = useMemo(() => {
        const iconProp =
            icon === "none" ? "" : `\n    icon="${String(iconNode(icon)).replaceAll('"', '\\"')}"`;

        return `import { UiChip } from "@/components/ui/UiChip";

<UiChip
    tone="${tone}"
    size="${size}"${iconProp}
    ${disabled ? "disabled" : ""}
    ${clickable ? "onClick={() => {}}" : ""}
>
    Premier pas
</UiChip>`;
    }, [tone, size, icon, disabled, clickable]);

    const toneButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: UiChipTone[] = [
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
        const items: UiChipSize[] = ["xs", "sm", "md"];
        return items.map((s) => ({
            key: s,
            children: s,
            active: size === s,
            onClick: () => setSize(s),
        }));
    }, [size]);

    const iconButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        const items: IconChoice[] = ["none", "sparkle", "tag", "crown", "trophy"];
        return items.map((k) => ({
            key: k,
            children: `icon: ${k}`,
            active: icon === k,
            onClick: () => setIcon(k),
        }));
    }, [icon]);

    const flagsButtons = useMemo<UIActionButtonGroupButton[]>(() => {
        return [
            {
                key: "clickable",
                children: "clickable",
                hint: clickable ? "ON" : "OFF",
                active: clickable,
                onClick: () => setClickable((v) => !v),
            },
            {
                key: "disabled",
                children: "disabled",
                hint: disabled ? "ON" : "OFF",
                active: disabled,
                onClick: () => setDisabled((v) => !v),
            },
        ];
    }, [clickable, disabled]);

    return (
        <UiComponentPanel
            title="UiChip"
            emoji="🏷️"
            subtitle="Chip / badge utilitaire : statuts, récompenses, tags, achievements. Léger mais expressif."
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
                        <div className="text-xs tracking-[0.18em] text-white/45">ICON</div>
                        <UIActionButtonGroup
                            variant="soft"
                            size="sm"
                            fullWidth
                            buttons={iconButtons}
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

                {/* PREVIEW */}
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">PREVIEW</div>

                    <div className="mt-3">
                        <UiChip
                            tone={tone}
                            size={size}
                            icon={iconNode(icon)}
                            disabled={disabled}
                            onClick={clickable ? () => {} : undefined}
                        >
                            Premier pas
                        </UiChip>
                    </div>

                    <div className="mt-3 text-xs text-white/50">
                        Preview = uniquement contrôlé par les groupes ci-dessus.
                    </div>
                </div>

                {/* EXAMPLES */}
                <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.18em] text-white/55">EXAMPLES</div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <UiChip tone="theme" icon="✨">
                            Premier pas
                        </UiChip>

                        <UiChip tone="emerald">🏅 +10 renown</UiChip>

                        <UiChip tone="violet" icon="🏷️">
                            badge: explorateur
                        </UiChip>

                        <UiChip tone="amber" icon="👑">
                            nouveau titre
                        </UiChip>

                        <UiChip tone="neutral">info</UiChip>

                        <UiChip tone="slate" size="xs">
                            tag discret
                        </UiChip>
                    </div>
                </div>
            </div>
        </UiComponentPanel>
    );
}
