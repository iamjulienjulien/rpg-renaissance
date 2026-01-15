import { UiChip, UiPill } from "@/components/ui";

/**
 * Type de rythme de quête
 * (contrôlée par le jeu / MJ pour l’instant)
 */
export type ChapterPace = "calme" | "standard" | "intense";

/**
 * Label textuel au rythme
 */
export function chapterPaceLabel(p: ChapterPace): string {
    if (p === "calme") return "Calme";
    if (p === "intense") return "Intense";
    return "Standard";
}

/**
 * Emoji associé au rythme
 */
export function chapterPaceEmoji(p: ChapterPace): string {
    if (p === "calme") return "🌙";
    if (p === "intense") return "⚡️";
    return "🔥";
}

/**
 * Pill UI prête à l’emploi
 */
export function ChapterPacePill({ pace }: { pace: ChapterPace | null | undefined }) {
    if (!pace) return null;

    return (
        <UiPill title="Rythme">
            {chapterPaceEmoji(pace)} {chapterPaceLabel(pace)}
        </UiPill>
    );
}

export function ChapterPaceyChip({ pace }: { pace: ChapterPace | null | undefined }) {
    if (!pace) return null;

    return <UiChip icon={chapterPaceEmoji(pace)}>{chapterPaceLabel(pace)}</UiChip>;
}
