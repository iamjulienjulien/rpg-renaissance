"use client";

import { UiPanel, UiPill } from "@/components/ui";
import { UiGradientPanel } from "@/components/ui/UiGradientPanel";
import UiImage from "@/components/ui/UiImage";
import { useGameStore } from "@/stores/gameStore";

export default function CurrentCharacterBlock() {
    const { currentPlayer } = useGameStore();

    console.log("currentPlayer", currentPlayer);

    if (!currentPlayer) return;

    return (
        <UiGradientPanel
            eyebrow="🧙‍♂️ Le Maître du Jeu"
            innerClassName="flex"
            gradient="theme"
            glowOpacity={0.75}
            className="w-1/2"
        >
            {currentPlayer?.character?.code && (
                <div className="w-40 mr-5 p-1">
                    <UiImage
                        src={`/assets/images/characters/${currentPlayer?.character?.code}.png`}
                        aspect="square"
                        alt="Aventure"
                    />
                </div>
            )}
            <div className="my-1 w-full">
                <UiPanel variant="default" className="w-full h-full">
                    <div className="flex justify-between">
                        <div className="">
                            <div className="text-xl font-semibold text-white/90">
                                {currentPlayer?.character?.name}
                            </div>
                            <div className="mt-2">
                                <UiPill>
                                    {currentPlayer?.character?.emoji}{" "}
                                    {currentPlayer?.character?.vibe}
                                </UiPill>
                            </div>
                        </div>
                    </div>
                </UiPanel>
            </div>
        </UiGradientPanel>
    );
}
