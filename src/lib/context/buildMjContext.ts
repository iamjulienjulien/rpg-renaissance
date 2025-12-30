// src/lib/context/buildMjContext.ts

import { getUserContext } from "@/lib/context/getUserContext";
import { getAdventureContext } from "@/lib/context/getAdventureContext";
import { getChapterContext } from "@/lib/context/getChapterContext";

/* ============================================================================
🧰 MAIN
============================================================================ */

export async function buildMjContext(input: { chapterId: string }) {
    const chapterId = typeof input?.chapterId === "string" ? input.chapterId.trim() : "";
    if (!chapterId) return null;

    const [user, adventure, chapter] = await Promise.all([
        getUserContext(),
        getAdventureContext(),
        getChapterContext(chapterId),
    ]);

    return {
        user: user ?? null,
        adventure: adventure ?? null,
        chapter: chapter ?? null,
    };
}
