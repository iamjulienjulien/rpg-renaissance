import React from "react";
import { Pill } from "@/components/RpgUi";

/**
 * Type de priorité de quête
 * (contrôlée par le jeu / MJ pour l’instant)
 */
export type QuestPriority = "secondary" | "normal" | "main";

/**
 * Label textuel de priorité
 */
export function priorityLabel(p: QuestPriority): string {
    if (p === "secondary") return "Secondaire";
    if (p === "main") return "Principale";
    return "Normale";
}

/**
 * Emoji associé à la priorité
 */
export function priorityEmoji(p: QuestPriority): string {
    if (p === "secondary") return "🌿";
    if (p === "main") return "⭐";
    return "🧭";
}

/**
 * Pill UI prête à l’emploi
 */
export function QuestPriorityPill({ priority }: { priority: QuestPriority | null | undefined }) {
    if (!priority) return null;

    return (
        <Pill>
            {priorityEmoji(priority)} {priorityLabel(priority)}
        </Pill>
    );
}

export function defaultPriority(): QuestPriority {
    return "normal";
}
