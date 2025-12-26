import { Pill } from "@/components/RpgUi";
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

export function getCurrentCharacterName(): string {
    const { profile, selectedId, characters } = useGameStore.getState();

    // ✅ priorité: perso déjà hydraté dans le profil
    if (profile?.character?.name) return profile.character.name;

    // ✅ fallback: selectedId + liste characters
    if (selectedId) {
        const c = characters.find((x) => x.id === selectedId);
        if (c?.name) return c.name;
    }

    // ✅ fallback: profile sans join (au cas où)
    if (profile?.character_id) {
        const c = characters.find((x) => x.id === profile.character_id);
        if (c?.name) return c.name;
    }

    return "Aucun personnage";
}

export function getCurrentCharacterEmoji(): string {
    const { profile, selectedId, characters } = useGameStore.getState();

    // ✅ priorité: perso déjà hydraté dans le profil
    if (profile?.character?.emoji) return profile.character.emoji;

    // ✅ fallback: selectedId + liste characters
    if (selectedId) {
        const c = characters.find((x) => x.id === selectedId);
        if (c?.emoji) return c.emoji;
    }

    // ✅ fallback: profile sans join (au cas où)
    if (profile?.character_id) {
        const c = characters.find((x) => x.id === profile.character_id);
        if (c?.emoji) return c.emoji;
    }

    return "🧙";
}

export function CurrentCharacterPill() {
    const { currentCharacter } = useGameStore.getState();

    console.log("currentCharacter", currentCharacter);

    if (currentCharacter?.name) {
        return (
            <Pill>
                {currentCharacter?.emoji ?? currentCharacter.emoji + " "}
                {currentCharacter.name}
            </Pill>
        );
    }
}
