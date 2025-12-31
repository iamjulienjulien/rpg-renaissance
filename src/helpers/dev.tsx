import React from "react";
import { Pill } from "@/components/RpgUi";

/**
 * Label textuel d'environnement
 */
export function envLabel(env: string): string {
    if (env === "local") return "Local";
    if (env === "staging") return "Staging";
    return "Dev";
}

/**
 * Emoji associé à l'environnement
 */
export function envEmoji(env: string): string {
    if (env === "local") return "🏠";
    if (env === "staging") return "✅";
    return "⌨️";
}

/**
 * Pill UI prête à l’emploi
 */
export function DevEnvPill(env: any) {
    const currentEnv = env?.env;

    if (currentEnv === "") return "";

    return (
        <Pill>
            {envEmoji(currentEnv)} {envLabel(currentEnv)}
        </Pill>
    );
}
