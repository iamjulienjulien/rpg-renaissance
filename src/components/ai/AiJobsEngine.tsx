// src/components/ai/AiJobsEngine.tsx
"use client";

import React from "react";
import { useAiStore } from "@/stores/aiStore";
import { useGameStore } from "@/stores/gameStore";

export default function AiJobsEngine() {
    const { loadPendingJobs, subscribeToAiJobs, aiJobsPending } = useAiStore();

    // 🔑 source unique de vérité pour l’utilisateur courant
    const currentUserId = useGameStore((s) => s.currentUserId);

    React.useEffect(() => {
        loadPendingJobs();

        if (!currentUserId) return;
        const unsubscribe = subscribeToAiJobs(currentUserId);
        return () => {
            unsubscribe?.();
        };
    }, [currentUserId, subscribeToAiJobs]);

    React.useEffect(() => {
        console.info("aiJobsPending change", aiJobsPending);
    }, [aiJobsPending]);

    return null;
}
