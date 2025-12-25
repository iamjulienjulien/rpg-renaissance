"use client";

import { useEffect } from "react";
import { useUiSettingsStore } from "@/stores/uiSettingsStore";

export default function ThemeHydrator() {
    const hydrate = useUiSettingsStore((s) => s.hydrate);

    useEffect(() => {
        hydrate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
