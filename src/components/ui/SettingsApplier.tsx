"use client";

import React, { useEffect } from "react";
// en haut du fichier SettingsApplier.tsx
import { useSettingsStore, type TextSize } from "@/stores/settingsStore";

function setCssVar(name: string, value: string) {
    document.documentElement.style.setProperty(name, value);
}

export default function SettingsApplier() {
    const textSize = useSettingsStore((s) => s.textSize);
    const contrast = useSettingsStore((s) => s.contrast);
    const reduceMotion = useSettingsStore((s) => s.reduceMotion);
    const focusMode = useSettingsStore((s) => s.focusMode);
    const spacing = useSettingsStore((s) => s.spacing);
    const fontMode = useSettingsStore((s) => s.fontMode);
    const dyslexiaMode = useSettingsStore((s) => s.dyslexiaMode);
    const underlineLinks = useSettingsStore((s) => s.underlineLinks);

    useEffect(() => {
        const root = document.documentElement;

        /* ------------------------------------------------------------------
         * 1) Classes globales (accessibilité & UI)
         * ------------------------------------------------------------------ */

        root.classList.toggle("rpg-contrast-high", contrast === "high");
        root.classList.toggle("rpg-reduce-motion", reduceMotion);
        root.classList.toggle("rpg-focus-strong", focusMode === "strong");
        root.classList.toggle("rpg-spacing-relaxed", spacing === "relaxed");
        root.classList.toggle("rpg-font-readable", fontMode === "readable");
        root.classList.toggle("rpg-dyslexia", dyslexiaMode === "on");
        root.classList.toggle("rpg-underline-links", underlineLinks);

        /* ------------------------------------------------------------------
         * 2) TYPOGRAPHIE RPG — connectée à Tailwind
         * ------------------------------------------------------------------ */

        const typographyScale: Record<
            TextSize,
            {
                xs: string;
                sm: string;
                base: string;
                lg: string;
                xl: string;
                xxl: string;
                tight: string;
                normal: string;
                relaxed: string;
            }
        > = {
            sm: {
                xs: "12px",
                sm: "13px",
                base: "14px",
                lg: "16px",
                xl: "18px",
                xxl: "22px",
                tight: "1.35",
                normal: "1.5",
                relaxed: "1.65",
            },
            md: {
                xs: "13px",
                sm: "14px",
                base: "16px",
                lg: "18px",
                xl: "20px",
                xxl: "24px",
                tight: "1.4",
                normal: "1.6",
                relaxed: "1.75",
            },
            lg: {
                xs: "14px",
                sm: "16px",
                base: "18px",
                lg: "20px",
                xl: "22px",
                xxl: "26px",
                tight: "1.45",
                normal: "1.7",
                relaxed: "1.9",
            },
            xl: {
                xs: "15px",
                sm: "17px",
                base: "20px",
                lg: "22px",
                xl: "24px",
                xxl: "30px",
                tight: "1.5",
                normal: "1.8",
                relaxed: "2.0",
            },
        };

        const t = typographyScale[textSize] ?? typographyScale.md;

        setCssVar("--rpg-text-xs", t.xs);
        setCssVar("--rpg-rpg-text-sm", t.sm);
        setCssVar("--rpg-text-base", t.base);
        setCssVar("--rpg-text-lg", t.lg);
        setCssVar("--rpg-text-xl", t.xl);
        setCssVar("--rpg-text-2xl", t.xxl);

        setCssVar("--rpg-leading-tight", t.tight);
        setCssVar("--rpg-leading-normal", t.normal);
        setCssVar("--rpg-leading-relaxed", t.relaxed);
    }, [
        textSize,
        contrast,
        reduceMotion,
        focusMode,
        spacing,
        fontMode,
        dyslexiaMode,
        underlineLinks,
    ]);

    return null;
}
