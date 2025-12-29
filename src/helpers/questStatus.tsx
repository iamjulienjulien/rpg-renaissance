import React from "react";
import { Pill } from "@/components/RpgUi";

/**
 * 🎯 Type des statuts de quête
 */
export type QuestStatus = "todo" | "doing" | "done";

/**
 * Label textuel du statut
 */
export function questStatusLabel(status: QuestStatus): string {
    if (status === "doing") return "En progression";
    if (status === "done") return "Accomplie";
    return "En attente";
}

/**
 * Emoji associé au statut
 */
export function questStatusEmoji(status: QuestStatus): string {
    if (status === "doing") return "⚔️";
    if (status === "done") return "🏆";
    return "🕯️";
}

/**
 * Pill UI prête à l’emploi
 */
export function QuestStatusPill({ status }: { status: QuestStatus | null | undefined }) {
    if (!status) return null;

    return (
        <Pill>
            {questStatusEmoji(status)} {questStatusLabel(status)}
        </Pill>
    );
}
