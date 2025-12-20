export type AiStyle = {
    tone: string;
    style: string;
    verbosity: "short" | "normal" | "rich";
};

export type Character = {
    id: string;
    code: string;
    name: string;
    emoji: string;
    archetype: string;
    vibe: string;
    motto: string;
    ai_style: AiStyle;
};

export type AdventureBriefing = {
    title: string;
    intro: string;
    bullets: string[];
    outro: string;
};

export type AdventureInfo = {
    code: string;
    title: string;
    emoji: string;
    baseGoal: string; // 1 ligne: objectif “neutre”
    steps: string[]; // étapes “neutres”
};

function clampBullets(list: string[], max: number) {
    return list.slice(0, max);
}

function voicePrefix(tone: string) {
    if (tone === "sec") return "🗡️";
    if (tone === "coach") return "🔥";
    if (tone === "sage") return "✨";
    if (tone === "doux") return "🌿";
    if (tone === "fervent") return "⚔️";
    if (tone === "strict") return "🦇";
    if (tone === "curieux") return "📐";
    if (tone === "calme") return "🦉";
    if (tone === "posé") return "📚";
    if (tone === "encourageant") return "🧭";
    return "🧠";
}

function introFor(character: Character, adventure: AdventureInfo) {
    const tone = character.ai_style.tone;

    if (tone === "sec") {
        return `Mission claire. ${adventure.baseGoal} Pas d’excuse, pas de théâtre.`;
    }
    if (tone === "coach") {
        return `On y va. ${adventure.baseGoal} Aujourd’hui, on gagne du terrain.`;
    }
    if (tone === "strict") {
        return `Plan. Discipline. Exécution. ${adventure.baseGoal} Rien n’est laissé au hasard.`;
    }
    if (tone === "fervent") {
        return `Écoute l’appel. ${adventure.baseGoal} Tu avances, même quand ça tremble.`;
    }
    if (tone === "sage") {
        return `Chaque pas a son heure. ${adventure.baseGoal} Et tu n’es pas seul sur la route.`;
    }
    if (tone === "doux") {
        return `Sans forcer. ${adventure.baseGoal} On enlève le superflu, on garde l’essentiel.`;
    }
    if (tone === "curieux") {
        return `Regard d’ingénieur. ${adventure.baseGoal} On structure, on optimise, on comprend.`;
    }
    if (tone === "calme") {
        return `Respire. ${adventure.baseGoal} Ni précipitation, ni inertie: juste le bon geste.`;
    }
    if (tone === "posé") {
        return `Approche méthodique. ${adventure.baseGoal} La clarté avant la vitesse.`;
    }
    if (tone === "encourageant") {
        return `Même si c’est flou, on continue. ${adventure.baseGoal} Un pas après l’autre.`;
    }

    return `${adventure.baseGoal}`;
}

function bulletsFor(character: Character, adventure: AdventureInfo) {
    const v = character.ai_style.verbosity;

    const base = adventure.steps.map((s, i) => `${i + 1}) ${s}`);

    if (v === "short") {
        // court: 3 bullets max, wording compact
        return clampBullets(
            base.map((b) => b.replace("Définir", "Définis").replace("Générer", "Génère")),
            3
        );
    }

    if (v === "rich") {
        // riche: ajoute du contexte “MJ”
        return base.map((b) => `${b} ✦ ${character.motto}`);
    }

    return base;
}

function outroFor(character: Character) {
    const tone = character.ai_style.tone;

    if (tone === "sec") return `Fais. Coche. Suivant.`;
    if (tone === "coach") return `On termine une action, puis une autre. Momentum.`;
    if (tone === "strict") return `Prépare. Exécute. Vérifie.`;
    if (tone === "fervent") return `Tiens la ligne. La victoire est une somme de petits serments.`;
    if (tone === "sage") return `Tu arriveras quand il faut. Continue.`;
    if (tone === "doux") return `Simple. Respirable. Durable.`;
    if (tone === "curieux") return `Observe, ajuste, recommence.`;
    if (tone === "calme") return `Reste juste: ni trop, ni pas assez.`;
    if (tone === "posé") return `Comprendre, puis agir.`;
    if (tone === "encourageant") return `Même perdu, tu avances.`;
    return character.motto;
}

export function buildAdventureBriefing(
    character: Character | null,
    adventure: AdventureInfo
): AdventureBriefing {
    const c = character;

    if (!c) {
        return {
            title: `Briefing: ${adventure.emoji} ${adventure.title}`,
            intro: adventure.baseGoal,
            bullets: adventure.steps.map((s, i) => `${i + 1}) ${s}`),
            outro: "Choisis un personnage pour colorer le ton du briefing.",
        };
    }

    return {
        title: `${voicePrefix(c.ai_style.tone)} Briefing de ${c.name}`,
        intro: introFor(c, adventure),
        bullets: bulletsFor(c, adventure),
        outro: `🗣️ Devise: “${c.motto}”`,
    };
}
