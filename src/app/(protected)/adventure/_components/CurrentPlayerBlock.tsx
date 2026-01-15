"use client";

import { UiPanel, UiPill } from "@/components/ui";
import { UiGradientPanel } from "@/components/ui/UiGradientPanel";
import UiImage from "@/components/ui/UiImage";
import { useGameStore } from "@/stores/gameStore";
import { useProfileOptions } from "@/hooks/useProfileOptions";
import { useEffect, useState } from "react";

export default function CurrentPlayerBlock() {
    const { currentPlayer } = useGameStore();

    const { list: archetypeOptions } = useProfileOptions({ field: "archetype" });

    console.log("currentPlayer", currentPlayer);
    console.log("archetypeOptions", archetypeOptions);

    const [archetypeLabel, setArchetypeLabel] = useState<string>("");

    useEffect(() => {
        if (archetypeOptions.length > 0 && currentPlayer?.details?.archetype) {
            const archetype =
                archetypeOptions.find((a) => a.value_key === currentPlayer?.details?.archetype) ??
                null;

            if (archetype) {
                setArchetypeLabel(`${archetype.emoji} ${archetype.label}`);
            }
        }
    }, [archetypeOptions, currentPlayer]);

    if (!currentPlayer) return;

    return (
        <UiGradientPanel
            eyebrow="🤴 Le Héros"
            innerClassName="flex"
            gradient="theme"
            glowOpacity={0.75}
            className="w-1/2"
        >
            {currentPlayer?.avatar_url && (
                <div className="w-40 mr-5 p-1">
                    <UiImage src={currentPlayer?.avatar_url} aspect="square" alt="Aventure" />
                </div>
            )}
            <div className="my-1 w-full">
                <UiPanel variant="default" className="w-full h-full">
                    <div className="flex justify-between">
                        <div className="">
                            <div className="text-xl font-semibold text-white/90">
                                {currentPlayer?.display_name}
                            </div>
                            <div className="mt-2">
                                <UiPill>{archetypeLabel}</UiPill>
                            </div>
                        </div>
                    </div>
                </UiPanel>
            </div>
        </UiGradientPanel>
    );
}
