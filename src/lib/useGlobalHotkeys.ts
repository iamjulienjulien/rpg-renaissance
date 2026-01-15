"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";

export function useGlobalHotkeys() {
    const toggle = useUiStore((s) => s.toggleCommandPalette);
    const close = useUiStore((s) => s.closeCommandPalette);
    const toggleQuestsPalette = useUiStore((s) => s.toggleQuestsPalette);
    const { openModal } = useUiStore();

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const isK = e.key.toLowerCase() === "k";
            const isCmdK = (e.metaKey || e.ctrlKey) && isK;

            if (isCmdK) {
                e.preventDefault();
                toggle();
                return;
            }

            const isG = e.key.toLowerCase() === "g";
            const isCmdG = (e.metaKey || e.ctrlKey) && isG;

            if (isCmdG) {
                e.preventDefault();
                toggleQuestsPalette();
                return;
            }

            const isN = e.key.toLowerCase() === "n";
            const isCmdN = (e.metaKey || e.ctrlKey) && isN;

            if (isCmdN) {
                e.preventDefault();
                console.log("ok");
                openModal("questCreate");
                return;
            }

            if (e.key === "Escape") {
                close();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [toggle, close]);
}
