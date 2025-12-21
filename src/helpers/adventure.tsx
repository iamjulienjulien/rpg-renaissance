import { useGameStore } from "@/stores/gameStore";

/**
 * 🧭 Label textuel de l'aventure en cours
 */
export function getCurrentAdventureName(): string {
    const { currentAdventure, chapter } = useGameStore.getState();

    // priorité à currentAdventure si présent
    if (currentAdventure?.title) {
        return currentAdventure.title;
    }

    // fallback: via chapter (si l’aventure n’est pas encore résolue)
    if (chapter?.adventure_code) {
        return chapter.adventure_code;
    }

    return "Aucune aventure";
}

/**
 * ⚔️ Label textuel du chapitre en cours
 */
export function getCurrentChapterName(): string {
    const { currentChapter, chapter } = useGameStore.getState();

    if (currentChapter?.title) {
        return currentChapter.title;
    }

    if (chapter?.title) {
        return chapter.title;
    }

    return "Aucun chapitre";
}

/**
 * 📜 Label textuel des quêtes en cours
 * (noms séparés par une virgule)
 */
export function getCurrentQuestsName(): string {
    const { currentQuests } = useGameStore.getState();

    if (!currentQuests || currentQuests.length === 0) {
        return "Aucune quête";
    }

    const names = currentQuests
        .map((q: any) => {
            // selon la forme (lite / jointure / normalisée)
            if (q.title) return q.title;
            if (q.adventure_quests?.title) return q.adventure_quests.title;
            if (Array.isArray(q.adventure_quests) && q.adventure_quests[0]?.title) {
                return q.adventure_quests[0].title;
            }
            return null;
        })
        .filter(Boolean) as string[];

    return names.length > 0 ? names.join(", ") : "Quêtes en cours";
}
