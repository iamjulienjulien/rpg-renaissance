"use client";

import React, { useEffect, useState } from "react";
import { Panel, ActionButton } from "@/components/RpgUi";
import type { Adventure, Chapter } from "@/types/game";
import { UiGradientPanel } from "@/components/ui/UiGradientPanel";
import { UiActionButton, UiPanel, UiPill } from "@/components/ui";
import UiImage from "@/components/ui/UiImage";
import { formatLongDate } from "@/helpers/dateTime";
import Helpers from "@/helpers";

export default React.memo(function CurrentAdventureBlock(props: {
    chapter: Chapter;
    adventure: Adventure | null;
    advEmoji: string;
    advTitle: string;
    advDesc: string;
    onOpenAdventureConfig: () => void;
    onGoPrepare: () => void;
}) {
    const { adventure, advEmoji, advTitle, advDesc, onOpenAdventureConfig } = props;

    const [chaptersCount, setChaptersCount] = useState<number>(0);

    useEffect(() => {
        if (adventure?.chapters_count) {
            setChaptersCount(adventure.chapters_count);
        }
    }, [adventure]);

    console.log("adventure", adventure);

    return (
        // <UiPanel variant="ghost">
        <UiGradientPanel
            eyebrow="🗺️ L'aventure"
            innerClassName="flex"
            gradient="theme"
            glowOpacity={1}

            // emoji="🌌"
            // subtitle="Le fil rouge de ton épopée actuelle."
            // right={
            //     <UiActionButton variant="solid" onClick={onOpenAdventureConfig}>
            //         ⚙️ Réglages de l'aventure
            //     </UiActionButton>
            // }
        >
            <div className="w-40 mr-5 p-1">
                <UiImage
                    src="/assets/images/adventures/realignement_du_foyer.png"
                    aspect="square"
                    alt="Aventure"
                />
            </div>
            {/* <div className="rounded-2xl bg-black/30 p-5 ring-1 ring-white/10 w-full my-1"> */}
            <div className="my-1 w-full">
                <UiPanel variant="default" className="w-full">
                    <div className="flex justify-between">
                        <div className="">
                            <div className="text-xl font-semibold text-white/90">
                                {advEmoji} {advTitle}
                            </div>

                            <div className="mt-2 rpg-rpg-text-sm text-white/65">{advDesc}</div>
                            <div className="flex gap-x-3 mt-3">
                                {adventure?.created_at && (
                                    <UiPill title="Débuté le">
                                        🕯️ {formatLongDate(adventure?.created_at)}
                                    </UiPill>
                                )}
                                <UiPill>{chaptersCount} chapitres</UiPill>
                            </div>

                            {/* <div className="mt-4 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="text-white/85 font-semibold">📖 Prologue</div>
                        <div className="mt-2 whitespace-pre-line rpg-rpg-text-sm text-white/60">
                            {adventure?.context_text?.trim()
                                ? adventure.context_text
                                : "Aucun contexte défini. Tu peux en ajouter via “Configurer”."}
                        </div>
                    </div> */}
                        </div>
                        <div>
                            <UiActionButton variant="master" onClick={onOpenAdventureConfig}>
                                ✍️ Contexte
                            </UiActionButton>
                        </div>
                    </div>
                </UiPanel>
            </div>
        </UiGradientPanel>
        // </UiPanel>
    );
});
