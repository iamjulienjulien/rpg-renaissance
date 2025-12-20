"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TextSize = "sm" | "md" | "lg" | "xl";
export type Contrast = "balanced" | "high";
export type FocusMode = "default" | "strong";
export type Spacing = "standard" | "relaxed";
export type FontMode = "default" | "readable"; // ex: Atkinson/Inter selon ce que tu as
export type DyslexiaMode = "off" | "on";

type SettingsState = {
    // Accessibilité
    textSize: TextSize;
    contrast: Contrast;
    reduceMotion: boolean;
    focusMode: FocusMode;
    spacing: Spacing;
    fontMode: FontMode;
    dyslexiaMode: DyslexiaMode;
    underlineLinks: boolean;

    // Actions
    setTextSize: (v: TextSize) => void;
    setContrast: (v: Contrast) => void;
    setReduceMotion: (v: boolean) => void;
    setFocusMode: (v: FocusMode) => void;
    setSpacing: (v: Spacing) => void;
    setFontMode: (v: FontMode) => void;
    setDyslexiaMode: (v: DyslexiaMode) => void;
    setUnderlineLinks: (v: boolean) => void;

    resetAccessibility: () => void;
};

const defaults = {
    textSize: "md" as TextSize,
    contrast: "balanced" as Contrast,
    reduceMotion: false,
    focusMode: "default" as FocusMode,
    spacing: "standard" as Spacing,
    fontMode: "default" as FontMode,
    dyslexiaMode: "off" as DyslexiaMode,
    underlineLinks: false,
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            ...defaults,

            setTextSize: (v) => set({ textSize: v }),
            setContrast: (v) => set({ contrast: v }),
            setReduceMotion: (v) => set({ reduceMotion: v }),
            setFocusMode: (v) => set({ focusMode: v }),
            setSpacing: (v) => set({ spacing: v }),
            setFontMode: (v) => set({ fontMode: v }),
            setDyslexiaMode: (v) => set({ dyslexiaMode: v }),
            setUnderlineLinks: (v) => set({ underlineLinks: v }),

            resetAccessibility: () => set({ ...defaults }),
        }),
        {
            name: "renaissance_settings_v1",
            partialize: (s) => ({
                textSize: s.textSize,
                contrast: s.contrast,
                reduceMotion: s.reduceMotion,
                focusMode: s.focusMode,
                spacing: s.spacing,
                fontMode: s.fontMode,
                dyslexiaMode: s.dyslexiaMode,
                underlineLinks: s.underlineLinks,
            }),
        }
    )
);
