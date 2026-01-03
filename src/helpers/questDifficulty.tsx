import React from "react";
import { Pill } from "@/components/RpgUi";
import { UiChip, UiPill } from "@/components/ui";

/**
 * Label textuel de difficulté
 */
export function difficultyLabel(d: number): string {
    if (d <= 1) return "Facile";
    if (d === 2) return "Standard";
    return "Difficile";
}

/**
 * Emoji associé à la difficulté
 */
export function difficultyEmoji(d: number): string {
    if (d <= 1) return "🟢";
    if (d === 2) return "🟡";
    return "🔴";
}

/**
 * Pill UI prête à l’emploi
 */
export function QuestDifficultyPill({ difficulty }: { difficulty: number | null | undefined }) {
    if (!difficulty) return null;

    return (
        <UiPill title="Difficulté">
            {difficultyEmoji(difficulty)} {difficultyLabel(difficulty)}
        </UiPill>
    );
}

export function QuestDifficultyChip({ difficulty }: { difficulty: number | null | undefined }) {
    if (!difficulty) return null;

    return <UiChip icon={difficultyEmoji(difficulty)}>{difficultyLabel(difficulty)}</UiChip>;
}
