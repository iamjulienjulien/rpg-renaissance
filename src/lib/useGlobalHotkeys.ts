"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";

export function useGlobalHotkeys() {
    const toggle = useUiStore((s) => s.toggleCommandPalette);
    const close = useUiStore((s) => s.closeCommandPalette);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const isK = e.key.toLowerCase() === "k";
            const isCmdK = (e.metaKey || e.ctrlKey) && isK;

            if (isCmdK) {
                e.preventDefault();
                toggle();
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
