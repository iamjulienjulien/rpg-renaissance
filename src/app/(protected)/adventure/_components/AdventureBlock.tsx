"use client";

import React from "react";
import { Panel, ActionButton } from "@/components/RpgUi";
import type { Adventure, Chapter } from "@/types/game";

export default React.memo(function AdventureBlock(props: {
    chapter: Chapter;
    adventure: Adventure | null;
    advEmoji: string;
    advTitle: string;
    advDesc: string;
    onOpenAdventureConfig: () => void;
    onGoPrepare: () => void;
}) {
    const { adventure, advEmoji, advTitle, advDesc, onOpenAdventureConfig } = props;

    return (
        <Panel
            title="L'Aventure"
            emoji="🌌"
            subtitle="Le fil rouge de ton épopée actuelle."
            right={
                <ActionButton onClick={onOpenAdventureConfig}>⚙️ Ajuster le destin</ActionButton>
            }
        >
            <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
                <div className="min-w-0">
                    <div className="text-xl font-semibold text-white/90">
                        {advEmoji} {advTitle}
                    </div>

                    <div className="mt-2 max-w-3xl rpg-rpg-text-sm text-white/65">{advDesc}</div>

                    <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-white/85 font-semibold">📖 Prologue</div>
                        <div className="mt-2 whitespace-pre-line rpg-rpg-text-sm text-white/60">
                            {adventure?.context_text?.trim()
                                ? adventure.context_text
                                : "Aucun contexte défini. Tu peux en ajouter via “Configurer”."}
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    );
});
