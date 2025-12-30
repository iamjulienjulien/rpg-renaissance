// src/components/toasts/ToastEngine.tsx
"use client";

import React from "react";
import { useToastStore } from "@/stores/toastStore";

export default function ToastEngine() {
    const startLive = useToastStore((s) => s.startLive);

    React.useEffect(() => {
        startLive();
    }, [startLive]);

    return null;
}
