// src/app/ui/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import RpgShell from "@/components/RpgShell";

import UiFormTextPanelV2 from "./_panels/UiFormTextPanelV2";
// import UiEmojiPickerPanelV2 from "./_panels/UiEmojiPickerPanelV2";
import UiToolbarPanelV2 from "./_panels/UiToolbarPanelV2";
import UiActionButtonPanelV2 from "./_panels/UiActionButtonPanelV2";
import UiPillPanelV2 from "./_panels/UiPillPanelV2";
import UiChipPanelV2 from "./_panels/UiChipPanelV2";
import UiActionButtonGroupPanelV2 from "./_panels/UiActionButtonGroupPanelV2";
import UiGradientPanelPanelV2 from "./_panels/UiGradientPanelPanelV2";
import UiPanelPanelV2 from "./_panels/UiPanelPanelV2";
import UiCardPanelV2 from "./_panels/UiCardPanelV2";
import UiFormSelectPanelV2 from "./_panels/UiFormSelectV2";
import UiGradientCardPanelV2 from "./_panels/UiGradientCardPanelV2";
import UiSpinnerPanelV2 from "./_panels/UiSpinnerPanelV2";

export default function UiShowcasePage() {
    return (
        <RpgShell
            title="UI Kit"
            subtitle="Vitrine interne: composants, styles, patterns, snippets copiables."
        >
            <div className="grid gap-4">
                <div className="text-gray-300">➡️ Controls</div>
                <UiChipPanelV2 />
                <UiPillPanelV2 />
                <UiActionButtonPanelV2 />
                <UiActionButtonGroupPanelV2 />
                <UiToolbarPanelV2 />
                <div className="text-gray-300">➡️ Surfaces</div>
                <UiPanelPanelV2 />
                <UiGradientPanelPanelV2 />
                <UiCardPanelV2 />
                <UiGradientCardPanelV2 />
                <div className="text-gray-300">➡️ Form Elements</div>
                <UiFormTextPanelV2 />
                <UiFormSelectPanelV2 />
                <UiSpinnerPanelV2 />
                {/* <UiEmojiPickerPanelV2 /> */}
            </div>
        </RpgShell>
    );
}
