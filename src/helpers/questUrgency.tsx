import React from "react";
import { Pill } from "@/components/RpgUi";

/**
 * Type d'urgence de quête
 */
export type QuestUrgency = "low" | "normal" | "high";

/**
 * Label textuel d'urgence
 */
export function urgencyLabel(u: QuestUrgency): string {
    if (u === "low") return "Basse";
    if (u === "high") return "Haute";
    return "Normale";
}

/**
 * Emoji associé à l'urgence
 */
export function urgencyEmoji(u: QuestUrgency): string {
    if (u === "low") return "🧊";
    if (u === "high") return "🔥";
    return "⚡";
}

/**
 * Pill UI prête à l’emploi
 */
export function QuestUrgencyPill({ urgency }: { urgency: QuestUrgency | null | undefined }) {
    if (!urgency) return null;

    return (
        <Pill>
            {urgencyEmoji(urgency)} {urgencyLabel(urgency)}
        </Pill>
    );
}

export function defaultUrgencyForDifficulty(difficulty?: number | null): QuestUrgency {
    if (!difficulty) return "normal";
    if (difficulty <= 1) return "low";
    if (difficulty === 2) return "normal";
    return "high";
}
