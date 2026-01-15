// src/components/ui/index.ts

/* ============================================================================
🧩 UI Controls
============================================================================ */

export * from "./UiChip";
export * from "./UiPill";
export * from "./UiActionButton";
export * from "./UiActionButtonGroup";
export * from "./UiToolbar";

/* ============================================================================
🧩 UI Surfaces
============================================================================ */

export * from "./UiPanel";
export * from "./UiCard";
export * from "./UiGradientPanel";
export * from "./UiGradientCard";

/* ============================================================================
🧩 UI Form Elements
============================================================================ */
export * from "./UiFormText";
export * from "./UiFormSelect";
export * from "./UiFormDate";

export { UiModal } from "./UiModal";

/* ============================================================================
🧭 Actions & Controls (alias UiXXXX)
============================================================================ */

// ⛔️ fichiers internes peuvent rester en UiActionButton,
// ✅ l’API publique est normalisée en UiActionButton

// export { type UiActionButtonGroupButton as UiActionButtonGroupButton } from "./UiActionButtonGroup";

/* ============================================================================
🪄 Overlays & helpers
============================================================================ */

export { default as UiTooltip } from "./UiTooltip";
