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

                // ✅ 5 nouvelles ambiances
                {
                    slug: "alchemist",
                    label: "Alchimiste",
                    emoji: "⚗️",
                    description: "Savant nomade, fioles et runes discrètes, curiosité brûlante.",
                    prompt: "Archétype: alchimiste, savant aventurier.\nTenue: manteau de cuir/lin, ceinture de fioles, gants, détails artisanaux.\nAttitude: concentrée, curieuse, regard précis (comme s'il analysait le monde).",
                },
                {
                    slug: "bard",
                    label: "Barde",
                    emoji: "🎻",
                    description:
                        "Charmeur et voyageur, panache, sourire, légende vivante en devenir.",
                    prompt: "Archétype: barde, conteur, charmeur.\nTenue: vêtements élégants mais pratiques, broderies, cape légère, accessoire musical discret.\nAttitude: confiante, chaleureuse, malicieuse, regard vivant.",
                },
                {
                    slug: "paladin",
                    label: "Paladin",
                    emoji: "✨",
                    description:
                        "Foi et détermination, aura protectrice, héroïsme solaire sans être kitsch.",
                    prompt: "Archétype: paladin, gardien sacré.\nTenue: armure noble, symboles lumineux subtils, cape, métal propre.\nAttitude: droite, protectrice, sereine, force tranquille.",
                },
                {
                    slug: "assassin",
                    label: "Assassin",
                    emoji: "🗡️",
                    description:
                        "Silencieux et précis, ombres, élégance utilitaire, tension contenue.",
                    prompt: "Archétype: assassin, éclaireur nocturne.\nTenue: cuir sombre, tissus souples, ceinture utilitaire, lignes épurées.\nAttitude: calme, alerte, regard tranchant, présence discrète.",
                },
                {
                    slug: "druid",
                    label: "Druide",
                    emoji: "🍃",
                    description:
                        "Connexion à la nature, mystique organique, sagesse ancienne et douce.",
                    prompt: "Archétype: druide, gardien des forêts.\nTenue: étoffes naturelles, cuir patiné, talisman végétal/pierre, détails organiques.\nAttitude: paisible, profonde, aura bienveillante, regard calme.",
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

                // ✅ Nouveaux décors
                {
                    slug: "mountain",
                    label: "Montagnes",
                    emoji: "⛰️",
                    description: "Hauteurs majestueuses, air froid, horizon dégagé et épique.",
                    prompt: "Fond: montagnes escarpées, sommets brumeux, ciel dramatique, sensation de grandeur.",
                },
                {
                    slug: "ruins",
                    label: "Ruines anciennes",
                    emoji: "🏛️",
                    description: "Vestiges oubliés, pierres brisées, mystère et histoire ancienne.",
                    prompt: "Fond: ruines antiques, pierres effondrées, symboles anciens, atmosphère mystérieuse.",
                },
                {
                    slug: "cathedral",
                    label: "Cathédrale",
                    emoji: "⛪",
                    description: "Architecture monumentale, lumière sacrée, solennité.",
                    prompt: "Fond: cathédrale monumentale, vitraux, lumière divine filtrée, ambiance sacrée.",
                },
                {
                    slug: "arcane_library",
                    label: "Bibliothèque arcanique",
                    emoji: "📚",
                    description: "Savoir ancien, grimoires, bougies et magie latente.",
                    prompt: "Fond: bibliothèque magique, étagères de grimoires, bougies, poussière lumineuse.",
                },
                {
                    slug: "coast",
                    label: "Côte sauvage",
                    emoji: "🌊",
                    description: "Vent marin, falaises, horizon ouvert, énergie brute.",
                    prompt: "Fond: côte rocheuse, falaises, mer agitée, ciel nuageux, ambiance sauvage.",
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

                // ✅ Nouveaux accessoires
                {
                    slug: "amulet",
                    label: "Amulette",
                    emoji: "📿",
                    description: "Talisman ancien ou magique, porté près du cœur.",
                    prompt: "Accessoire: amulette ancienne ou magique, pendentif discret, symboles gravés.",
                },
                {
                    slug: "scarf",
                    label: "Écharpe",
                    emoji: "🧣",
                    description: "Tissu fluide, style voyageur ou aventurier.",
                    prompt: "Accessoire: écharpe ou foulard, tissu fluide, style aventurier.",
                },
                {
                    slug: "mask",
                    label: "Masque",
                    emoji: "🎭",
                    description: "Masque partiel, identité secrète, aura énigmatique.",
                    prompt: "Accessoire: masque partiel ou demi-masque, visage partiellement visible, aura mystérieuse.",
                },
                {
                    slug: "earring",
                    label: "Boucle d’oreille",
                    emoji: "🪶",
                    description: "Détail fin, tribal ou noble selon le style.",
                    prompt: "Accessoire: boucle d’oreille unique ou paire discrète, métal ou plume, style fantasy.",
                },
                {
                    slug: "shoulder_cape",
                    label: "Cape courte",
                    emoji: "🦇",
                    description: "Cape courte sur une épaule, élégance et mouvement.",
                    prompt: "Accessoire: cape courte ou mantelet sur une épaule, tissu noble, mouvement léger.",
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
