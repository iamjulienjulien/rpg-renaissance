// src/helpers/journalKindLabel.ts

type PhotoCategory = "initial" | "final" | "other";

function photoCatEmoji(c: PhotoCategory) {
    if (c === "initial") return "🌅";
    if (c === "final") return "🏁";
    return "✨";
}

function photoCatLabel(c: PhotoCategory) {
    if (c === "initial") return "Départ capturé";
    if (c === "final") return "Arrivée scellé";
    return "Éclat capturé";
}

export function journalKindLabel(
    kind: string,
    meta?: Record<string, any> | null
): { emoji: string; label: string } {
    if (kind === "quest_photo_added") {
        const c = meta?.photo_category as PhotoCategory | undefined;
        if (c === "initial" || c === "final" || c === "other") {
            return { emoji: photoCatEmoji(c), label: photoCatLabel(c) };
        }
        return { emoji: "✨", label: "Éclat capturé" };
    }

    switch (kind) {
        case "quests_seeded":
            return { emoji: "🔨", label: "Quête forgée" };
        case "quest_started":
            return { emoji: "⚔️", label: "Quête engagée" };
        case "quest_done":
            return { emoji: "🏁", label: "Victoire scellée" };
        default:
            return { emoji: "🗒️", label: "Note inscrite" };
    }
}
