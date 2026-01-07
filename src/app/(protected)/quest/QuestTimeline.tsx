import { UiPanel } from "@/components/ui";
import { UiTimeline, type UiTimelineItem } from "@/components/ui/UiTimeline";

const items: UiTimelineItem[] = [
    {
        id: "c1",
        time: "09:12",
        icon: "📓",
        title: "Chronique de quête",
        subtitle: "Le héros a franchi la porte du donjon.",
        tone: "neutral",
        content: (
            <div>
                <p>Tu as décidé de tenter l’approche douce.</p>
                <p className="mt-2 text-xs text-white/50">XP +12 • Clarté +1</p>
            </div>
        ),
    },
    {
        id: "d1",
        time: "09:13",
        icon: "🎭",
        title: "MJ",
        subtitle: "Une question pour ajuster la quête",
        tone: "accent",
        // side: "left",
        content:
            "Quand tu penses à ce blocage, c’est plutôt du manque d’énergie ou du manque de sens ?",
    },
    {
        id: "d2",
        time: "09:14",
        icon: "🧑",
        title: "Toi",
        tone: "neutral",
        // side: "right",
        content: "Plutôt du manque de sens. Je peux bosser, mais pas “à vide”.",
        isHighlight: true,
    },
];

export function QuestTimeline() {
    return (
        <UiPanel>
            <UiTimeline items={items} order="asc" density="comfortable" showRail showTime />
        </UiPanel>
    );
}
