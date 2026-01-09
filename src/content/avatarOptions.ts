export const AVATAR_OPTIONS = {
    version: "1.0.1",
    generated_from: "src/lib/prompts/generatePlayerAvatar.ts (buildPrompt + *Directives)",
    groups: [
        {
            key: "format",
            label: "Format",
            emoji: "🖼️",
            type: "enum",
            options: [
                {
                    slug: "square",
                    label: "Carré",
                    emoji: "⬛",
                    description: "Format carré, idéal pour une photo de profil.",
                    prompt: "Format: square",
                },
                {
                    slug: "portrait",
                    label: "Portrait",
                    emoji: "🧑‍🎨",
                    description:
                        "Format portrait (plus haut que large), utile si tu veux plus de buste.",
                    prompt: "Format: portrait",
                },
            ],
        },
        {
            key: "vibe",
            label: "Ambiance",
            emoji: "🧙",
            type: "enum",
            options: [
                {
                    slug: "knight",
                    label: "Chevalier",
                    emoji: "🛡️",
                    description: "Héroïque et lumineux, armure propre, posture noble.",
                    prompt: "Archétype: chevalier fantasy noble et solide.\nTenue: armure légère ou cuir renforcé, cape éventuelle.\nAttitude: stoïque, protecteur, déterminé.",
                },
                {
                    slug: "ranger",
                    label: "Rôdeur",
                    emoji: "🏹",
                    description: "Aventurier des bois, vibe outdoor, plus discret et agile.",
                    prompt: "Archétype: rôdeur, pisteur, aventurier des bois.\nTenue: cuir, tissus pratiques, cape/écharpe, détails utilitaires.\nAttitude: alerte, agile, regard perçant.",
                },
                {
                    slug: "mage",
                    label: "Mage",
                    emoji: "🔮",
                    description: "Arcane et mystique, magie subtile, aura plus surnaturelle.",
                    prompt: "Archétype: mage, érudit, mystique.\nTenue: robes fantasy, détails runiques subtils, talisman éventuel.\nAttitude: calme, intense, aura mystérieuse.",
                },
                {
                    slug: "dark",
                    label: "Sombre",
                    emoji: "🌑",
                    description: "Plus dramatique, ténébreux, contrasté, vibe anti-héros.",
                    prompt: "Archétype: dark fantasy, anti-héros ou chevalier noir.\nTenue: cuir sombre/armure, textures usées, élégance menaçante.\nAttitude: froide, résolue, dramatique.",
                },
            ],
        },
        {
            key: "background",
            label: "Décor",
            emoji: "🏞️",
            type: "enum",
            options: [
                {
                    slug: "studio",
                    label: "Studio",
                    emoji: "🎛️",
                    description:
                        "Fond neutre et maîtrisé, résultat souvent plus propre et lisible.",
                    prompt: "Fond: studio fantasy neutre, lumière maîtrisée, focus sur le visage.",
                },
                {
                    slug: "forest",
                    label: "Forêt",
                    emoji: "🌲",
                    description: "Décor nature, feuilles, brume légère possible.",
                    prompt: "Fond: forêt brumeuse, feuillage, atmosphère naturelle.",
                },
                {
                    slug: "castle",
                    label: "Château",
                    emoji: "🏰",
                    description: "Ambiance médiévale, pierres, torches, couloirs.",
                    prompt: "Fond: château, pierre, bannières, ambiance médiévale.",
                },
                {
                    slug: "battlefield",
                    label: "Champ de bataille",
                    emoji: "⚔️",
                    description: "Dynamique et épique, fumée, poussière, tension.",
                    prompt: "Fond: champ de bataille, fumée légère, dramatisme.",
                },
                {
                    slug: "tavern",
                    label: "Taverne",
                    emoji: "🍺",
                    description: "Chaleureux et narratif, bois, lumière dorée, ambiance vivante.",
                    prompt: null,
                },
            ],
        },
        {
            key: "accessory",
            label: "Accessoire",
            emoji: "🧰",
            type: "enum",
            options: [
                {
                    slug: "none",
                    label: "Aucun",
                    emoji: "✨",
                    description: "Pas d’accessoire spécifique, look plus simple et lisible.",
                    prompt: "Accessoire: aucun (none).",
                },
                {
                    slug: "hood",
                    label: "Capuche",
                    emoji: "🧥",
                    description: "Capuche ou manteau à capuche, style rôdeur ou mystérieux.",
                    prompt: "Accessoire: capuche (hood) élégante.",
                },
                {
                    slug: "helm",
                    label: "Heaume",
                    emoji: "🪖",
                    description: "Casque/heaume, style chevalier, plus martial.",
                    prompt: "Accessoire: casque (helm) partiel ou relevé, visage visible.",
                },
                {
                    slug: "crown",
                    label: "Couronne",
                    emoji: "👑",
                    description: "Couronne discrète ou marquée, style royal ou élu.",
                    prompt: "Accessoire: couronne (crown) discrète, noble.",
                },
                {
                    slug: "pauldron",
                    label: "Spalière",
                    emoji: "🦾",
                    description: "Épaulettes d’armure, silhouette plus imposante.",
                    prompt: "Accessoire: épaulière (pauldron) détaillée.",
                },
            ],
        },
        {
            key: "faithfulness",
            label: "Fidélité",
            emoji: "🎭",
            type: "enum",
            options: [
                {
                    slug: "faithful",
                    label: "Fidèle",
                    emoji: "🧬",
                    description: "Ressemblance prioritaire, stylisation minimale.",
                    prompt: "Respecte fidèlement les traits du visage observés sur les photos.\nÉvite les changements radicaux (âge, morphologie, couleur des yeux/cheveux) sauf si demandé.\nRendu fantasy, mais identité clairement reconnaissable.",
                },
                {
                    slug: "balanced",
                    label: "Équilibré",
                    emoji: "⚖️",
                    description: "Bon compromis: ressemble à la photo tout en stylisant l’univers.",
                    prompt: "Conserve une forte ressemblance, avec une stylisation légère.\nRendu épique, mais visage cohérent et reconnaissable.\nÉquilibre réalisme et illustration.",
                },
                {
                    slug: "stylized",
                    label: "Stylisé",
                    emoji: "🎨",
                    description:
                        "Style prioritaire: plus de transformation artistique, moins de réalisme.",
                    prompt: "Conserve l'identité générale, mais autorise une stylisation marquée (illustration héroïque).\nTraits légèrement amplifiés (caractère, aura, posture), sans dénaturer.\nPriorise le rendu épique et la cohérence artistique.",
                },
            ],
        },
        {
            key: "dramatic_light",
            label: "Lumière dramatique",
            emoji: "💡",
            type: "boolean",
            options: [
                {
                    slug: "dramatic_light",
                    label: "Activer",
                    emoji: "🔦",
                    description: "Ajoute des contrastes marqués et une lumière plus cinématique.",
                    prompt: "Lumière dramatique: oui",
                },
            ],
        },
        {
            key: "battle_scars",
            label: "Cicatrices de combat",
            emoji: "🩹",
            type: "boolean",
            options: [
                {
                    slug: "battle_scars",
                    label: "Activer",
                    emoji: "🗡️",
                    description: "Ajoute des marques/cicatrices légères pour un look plus vécu.",
                    prompt: "Cicatrices: oui",
                },
            ],
        },
        {
            key: "glow_eyes",
            label: "Yeux lumineux",
            emoji: "👁️",
            type: "boolean",
            options: [
                {
                    slug: "glow_eyes",
                    label: "Activer",
                    emoji: "✨",
                    description: "Donne un effet surnaturel aux yeux (à utiliser avec parcimonie).",
                    prompt: "Regard magique: oui",
                },
            ],
        },
        {
            key: "notes",
            label: "Notes",
            emoji: "📝",
            type: "string",
            options: [
                {
                    slug: "notes",
                    label: "Instructions libres",
                    emoji: "✍️",
                    description:
                        "Texte libre: détails à respecter (ex: barbe, couleur dominante, humeur, etc.).",
                    prompt: "Notes utilisateur: <notes>",
                },
            ],
        },
    ],
};
