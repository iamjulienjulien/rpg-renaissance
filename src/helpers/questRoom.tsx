import React from "react";
import { Pill } from "@/components/RpgUi";
import { useGameStore } from "@/stores/gameStore";

/**
 * 🧱 Room (tel que défini dans gameStore)
 * (normalement déjà exporté côté store, mais on le redéfinit ici pour clarté)
 */
export type Room = {
    id: string;
    adventure_id: string;
    code: string;
    title: string;
    sort: number | null;
    source: "template" | "custom" | string;
    template_id: string | null;
    session_id: string | null;
};

/* ============================================================================
🧠 LOGIQUE MÉTIER
============================================================================ */

/**
 * 🏷️ Récupère le label humain d’une pièce depuis son code
 * 👉 lit directement gameStore.rooms
 */
export function questRoomLabel(roomCode: string | null | undefined): string {
    const code = typeof roomCode === "string" ? roomCode.trim() : "";
    if (!code) return "sans pièce";

    const rooms = useGameStore.getState().rooms as Room[] | undefined;
    if (!rooms || rooms.length === 0) return code;

    const room = rooms.find((r) => r.code === code);
    return room?.title ?? code;
}

/**
 * Emoji associé à la pièce
 */
export function questRoomEmoji(roomCode: string | null | undefined): string {
    const code = typeof roomCode === "string" ? roomCode.trim() : "";
    if (!code) return "🗺️";

    const { templates } = useGameStore.getState();

    const template = templates?.find((t) => t.code === code);
    if (template?.icon) return template.icon;

    return "🚪";
}

/* ============================================================================
🎨 UI
============================================================================ */

/**
 * Pill UI prête à l’emploi
 */
export function QuestRoomPill({ roomCode }: { roomCode: string | null | undefined }) {
    const label = questRoomLabel(roomCode);
    const emoji = questRoomEmoji(roomCode);

    return (
        <Pill>
            {emoji} {label}
        </Pill>
    );
}
