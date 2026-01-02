// src/app/ui/_panels/UIActionButtonPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import UiComponentPanel from "../UiComponentPanel";
import UIActionButton from "@/components/ui/UiActionButton";
import { Pill } from "@/components/RpgUi";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function UIActionButtonPanel() {
    const [variant, setVariant] = useState<
        "soft" | "solid" | "master" | "magic" | "danger" | "ghost"
    >("solid");

    const [size, setSize] = useState<"xs" | "sm" | "md" | "lg" | "xl">("md");
    const [fullWidth, setFullWidth] = useState(false);
    const [disabled, setDisabled] = useState(false);

    const code = useMemo(() => {
        return `import UIActionButton from "@/components/ui/UIActionButton";

<UIActionButton variant="${variant}" size="${size}" ${fullWidth ? "fullWidth" : ""} ${
            disabled ? "disabled" : ""
        }>
    ✨ Continuer
</UIActionButton>`;
    }, [variant, size, fullWidth, disabled]);

    return (
        <UiComponentPanel
            title="UIActionButton"
            emoji="🧿"
            subtitle="Bouton amélioré: tailles, pleine largeur, nouveaux variants (magic/danger/ghost)."
            right={<Pill>{variant}</Pill>}
            code={code}
        >
            <div className="space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    <UIActionButton
                        variant="solid"
                        active={variant === "soft"}
                        size="sm"
                        onClick={() => setVariant("soft")}
                    >
                        soft
                    </UIActionButton>
                    <UIActionButton
                        variant="solid"
                        active={variant === "solid"}
                        size="sm"
                        onClick={() => setVariant("solid")}
                    >
                        solid
                    </UIActionButton>
                    <UIActionButton
                        variant="solid"
                        active={variant === "master"}
                        size="sm"
                        onClick={() => setVariant("master")}
                    >
                        master
                    </UIActionButton>
                    <UIActionButton
                        variant="solid"
                        active={variant === "magic"}
                        size="sm"
                        onClick={() => setVariant("magic")}
                    >
                        magic
                    </UIActionButton>
                    <UIActionButton
                        variant="solid"
                        active={variant === "danger"}
                        size="sm"
                        onClick={() => setVariant("danger")}
                    >
                        danger
                    </UIActionButton>
                    <UIActionButton
                        variant="solid"
                        active={variant === "ghost"}
                        size="sm"
                        onClick={() => setVariant("ghost")}
                    >
                        ghost
                    </UIActionButton>

                    <span className="mx-1 opacity-30">|</span>

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
                        <UIActionButton
                            variant={variant}
                            size={size}
                            fullWidth={fullWidth}
                            disabled={disabled}
                            hint="⌘K"
                            onClick={() => {}}
                            className={cn(fullWidth ? "justify-center" : undefined)}
                        >
                            ✨ Continuer
                        </UIActionButton>

                        <div className="text-xs text-white/50 mt-3">
                            Astuce: essaye <b>magic</b> pour les actions IA, <b>danger</b> pour les
                            destructions, <b>ghost</b> pour les actions discrètes.
                        </div>
                    </div>
                </div>
            </div>
        </UiComponentPanel>
    );
}
