// src/components/ui/index.ts

/* ============================================================================
🧩 Core UI components
============================================================================ */

// Chips / Pills / Panels
export * from "./UiChip";
export * from "./UiPill";
export * from "./UiPanel";
export { UiGradientPanel } from "./UiGradientPanel";
export { UiModal } from "./UiModal";
export * from "./UiCard";
// Form
export * from "./UiFormSelect";
export * from "./UiFormDate";

/* ============================================================================
🧭 Actions & Controls (alias UiXXXX)
============================================================================ */

// ⛔️ fichiers internes peuvent rester en UIActionButton,
// ✅ l’API publique est normalisée en UiActionButton

export { default as UiActionButton } from "./UiActionButton";
export { default as UiActionButtonGroup } from "./UiActionButtonGroup";

export { type UIActionButtonGroupButton as UiActionButtonGroupButton } from "./UiActionButtonGroup";
export { UiFormText, type UiFormTextTone } from "./UiFormText";

/* ============================================================================
🪄 Overlays & helpers
============================================================================ */

export { default as UiTooltip } from "./UiTooltip";

// export { type UiF}
// export { type UiA}
