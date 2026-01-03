// src/lib/ai/context/buildContextPrompt.ts

import type { AdventureContextResult } from "./getAdventureContext";
import type { PlayerContextResult } from "./getPlayerContext";
import type { CharacterContextResult } from "./getCharacterContext";
import type { ChapterContextResult } from "./getChapterContext";

export type BuildContextPromptArgs = {
    adventure?: AdventureContextResult;
    player?: PlayerContextResult;
    character?: CharacterContextResult;
    chapter?: ChapterContextResult;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function cleanLine(s: string) {
    return s.replace(/\s+/g, " ").trim();
}

function pushIf(lines: string[], condition: any, line: string) {
    if (condition) lines.push(line);
}

function blockHeader(title: string) {
    return ["════════════════════════════════════", title, "════════════════════════════════════"];
}

/* ============================================================================
🧠 MAIN
============================================================================ */

/**
 * Construit un prompt de contexte "prêt à injecter" dans l’IA.
 * - Chaque bloc est optionnel
 * - Player = priorité absolue sur le fond
 * - MJ = priorité absolue sur la voix et le ton (forme)
 * - Aucun contexte absent n’est inventé
 */
export function buildContextPrompt(args: BuildContextPromptArgs) {
    const sections: string[] = [];

    /* =========================================================================
    🧠 CONTEXTE DU JOUEUR (PRIORITÉ ABSOLUE)
    ========================================================================= */

    const player = args.player ?? null;

    if (player) {
        sections.push(
            ...blockHeader("🧠 CONTEXTE DU JOUEUR (à respecter en priorité)"),
            "Voici les informations fournies par le joueur pour se décrire lui et son contexte.",
            "Utilise-les pour adapter ton ton, tes exemples et tes propositions.",
            "Ne récite jamais ces informations comme une fiche brute: intègre-les naturellement."
        );

        const name = cleanLine(player.player_display_name ?? "");
        if (name) {
            sections.push(
                `🏷️ Nom du joueur: ${name} (à utiliser 0 à 2 fois maximum, seulement si pertinent)`
            );
        } else {
            sections.push("🏷️ Nom du joueur: (non renseigné)");
        }

        pushIf(
            sections,
            player.player_context_self,
            `👤 Joueur: ${cleanLine(player.player_context_self as string)}`
        );
        pushIf(
            sections,
            player.player_context_family,
            `👨‍👩‍👧 Famille: ${cleanLine(player.player_context_family as string)}`
        );
        pushIf(
            sections,
            player.player_context_home,
            `🏠 Foyer: ${cleanLine(player.player_context_home as string)}`
        );
        pushIf(
            sections,
            player.player_context_routine,
            `⏱️ Quotidien: ${cleanLine(player.player_context_routine as string)}`
        );
        pushIf(
            sections,
            player.player_context_challenges,
            `⚠️ Défis actuels: ${cleanLine(player.player_context_challenges as string)}`
        );

        sections.push(
            "",
            "🎯 Règles:",
            "• Si une information permet de rendre la réponse plus concrète ou utile, utilise-la.",
            "• Sinon, ne brode pas et reste neutre."
        );
    }

    /* =========================================================================
    🎭 STYLE DU MAÎTRE DU JEU (VOIX, TON, CADENCE)
    ========================================================================= */

    const character = args.character ?? null;

    // valeurs de repli "game-ready"
    const mjEmoji = cleanLine(character?.character_emoji ?? "") || "🧙";
    const mjName = cleanLine(character?.character_name ?? "");
    const mjArchetype = cleanLine(character?.character_archetype ?? "");
    const mjVibe = cleanLine(character?.character_vibe ?? "");
    const mjMotto = cleanLine(character?.character_motto ?? "");

    const tone = cleanLine(character?.character_tone ?? "") || "neutre";
    const style = cleanLine(character?.character_style ?? "") || "clair";
    const verbosity = cleanLine(character?.character_verbosity ?? "") || "standard";

    // On affiche "voix neutre" si pas de perso
    const voiceLine = mjName ? `Voix: ${mjEmoji} ${mjName}` : "Voix: neutre";

    // Le bloc MJ doit toujours exister si `args.character` est présent, même si champs vides
    if (character) {
        if (sections.length) sections.push("");

        sections.push(
            ...blockHeader("🎭 STYLE DU MAÎTRE DU JEU"),
            "IMPORTANT: l’utilisateur attend une réponse du MAÎTRE DU JEU, pas d’un assistant neutre.",
            "Tu incarnes cette voix. Ta réponse doit sonner comme une intervention de MJ: immersive, guidante et orientée progression.",
            "N’explique jamais que tu suis un style: fais-le, simplement.",
            "",
            voiceLine,
            `Tone: ${tone}`,
            `Style: ${style}`,
            `Verbosité: ${verbosity}`
        );

        // Archetype / vibe (très structurants)
        if (mjArchetype) sections.push(`Archétype: ${mjArchetype}`);
        if (mjVibe) sections.push(`Vibe: ${mjVibe}`);

        // Motto: à refléter sans citer
        pushIf(sections, mjMotto, `Serment du MJ (à refléter sans citer): ${mjMotto}`);

        sections.push(
            "",
            "🧠 Directives de roleplay (très importantes):",
            "• Réponds à la première personne en tant que MJ (pas en tant que système).",
            "• Donne des consignes actionnables: prochaines étapes, choix, objectifs.",
            "• Utilise une mise en forme lisible (titres courts, listes, 2 à 4 choix max).",
            "• Garde une énergie de jeu: encourageant, stylisé, mais jamais confus.",
            "• Ne mentionne pas les 'prompts', le 'contexte', ni les données internes.",
            "",
            "🎚️ Gestion de la verbosité:",
            "• concise: va droit au but, 4 à 8 lignes + une liste de prochaines actions.",
            "• standard: un peu de narration + instructions, 2 à 4 paragraphes + actions.",
            "• verbose: narration plus riche + détails + variantes, sans noyer l’action.",
            "",
            "🎨 Gestion du style:",
            "• clair: phrases courtes, structure forte, pas d’ornement inutile.",
            "• épique: images fortes, rythme, tension légère, mais reste concret.",
            "• chaleureux: proche, humain, rassurant, sans infantiliser.",
            "• sarcastique (si applicable): piquant léger, jamais méchant, jamais humiliant.",
            "",
            "⚠️ Interdits:",
            "• Ne cite jamais le 'Serment du MJ' mot pour mot.",
            "• Ne dis pas 'en tant qu’IA' ou 'en tant qu’assistant'.",
            "• Ne parle pas des règles internes: tu es la voix du jeu."
        );
    }

    /* =========================================================================
    🌍 CONTEXTE GLOBAL D’AVENTURE
    ========================================================================= */

    const adventure = args.adventure ?? null;

    if (adventure) {
        const title = cleanLine(adventure.adventure_title ?? "");
        const description = cleanLine(adventure.adventure_description ?? "");
        const context = (adventure.adventure_context ?? "").trim();

        if (title || description || context) {
            if (sections.length) sections.push("");

            sections.push(
                ...blockHeader("🌍 CONTEXTE GLOBAL D’AVENTURE"),
                "Ce contexte définit l’univers, l’intention et les règles implicites de l’aventure.",
                "Toutes tes propositions doivent rester cohérentes avec ce cadre.",
                "N’introduis jamais d’éléments qui cassent l’ambiance ou le ton établi.",
                "",
                title ? `Nom de l'aventure: ${title}` : "Nom de l'aventure: (non renseigné)"
            );

            if (description) {
                sections.push(`Description: ${description}`);
            }

            if (context) {
                sections.push("", "📜 Contexte:", context);
            } else {
                sections.push("", "📜 Contexte: (non renseigné)");
            }

            sections.push(
                "",
                "🧭 Directives:",
                "• Reste orienté action et progression.",
                "• Propose des choix ou des pistes claires (2 à 4 max).",
                "• Si une information manque, reste volontairement vague plutôt que d’inventer."
            );
        }
    }

    /* =========================================================================
    📖 CONTEXTE DU CHAPITRE
    ========================================================================= */

    const chapter = args.chapter ?? null;

    if (chapter) {
        const title = cleanLine(chapter.chapter_title ?? "");
        const context = (chapter.chapter_context ?? "").trim();

        if (title || context) {
            if (sections.length) sections.push("");

            sections.push(
                ...blockHeader("📖 CONTEXTE DU CHAPITRE"),
                "Ce contexte décrit la situation actuelle et immédiate.",
                "Il est prioritaire sur le contexte global d’aventure pour les détails concrets.",
                "Tout ce que tu proposes doit être compatible avec l’état actuel du chapitre.",
                "",
                title ? `Chapitre: ${title}` : "Chapitre: (non renseigné)"
            );

            if (context) {
                sections.push("", "📌 Situation actuelle:", context);
            } else {
                sections.push("", "📌 Situation actuelle: (non renseignée)");
            }

            sections.push(
                "",
                "🪜 Directives:",
                "• Reste focalisé sur le moment présent.",
                "• Ne saute pas d’étape ou de conséquence importante.",
                "• Si tu fais avancer l’histoire, fais-le par petites unités actionnables."
            );
        }
    }

    /* =========================================================================
    🧩 FINAL
    ========================================================================= */

    const text = sections.join("\n").trim();

    return {
        text: text.length ? text : null,
        hasPlayer: !!player,
        hasAdventure: !!adventure,
        hasCharacter: !!character,
        hasChapter: !!chapter,
    };
}
