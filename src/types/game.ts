/* ============================================================================
🧱 GAME DOMAIN TYPES
Centralise les types métier réutilisables partout (API, stores, UI).
============================================================================ */

export type ChapterPace = "calme" | "standard" | "intense";
export type ChapterStatus = "draft" | "active" | "done";

export type QuestStatus = "todo" | "doing" | "done";

export type QuestUrgency = "low" | "normal" | "high";
export type QuestPriority = "secondary" | "main";

/** 🧭 Aventure (instance) */
export type Adventure = {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    instance_code: string | null;
    type_id: string | null;
    type_code?: string | null;
    type_title?: string | null;
    context_text?: string | null;
};

/** 🧬 Type d’aventure (catalogue) */
export type AdventureType = {
    id: string;
    code: string;
    title: string;
    description: string | null;
    created_at: string;
};

/** 🗺️ Chapitre */
export type Chapter = {
    id: string;
    adventure_id: string | null;
    adventure_code?: string | null;
    title: string;
    pace: ChapterPace;
    status: ChapterStatus;
    created_at: string;

    // selon tes routes (certains endpoints l’ont)
    context_text?: string | null;
};

/** 📌 Quête “source” (table: adventure_quests) */
export type AdventureQuest = {
    id: string;
    adventure_id?: string; // parfois inclus, parfois non
    title: string;
    description: string | null;
    room_code: string | null;
    difficulty: number;
    estimate_min: number | null;

    urgency: QuestUrgency;
    priority: QuestPriority;

    created_at?: string;
};

/** 📌 Quête “source” + statut calculé via join chapter_quests */
export type AdventureQuestWithStatus = AdventureQuest & {
    status: QuestStatus | null;
};

/** 🧩 Quête de chapitre enrichie (chapter_quests + join adventure_quests) */
export type ChapterQuestFull = {
    id: string;
    chapter_id: string;
    adventure_quest_id: string;
    status: QuestStatus;
    room_code: string | null;
    created_at: string;
    adventure_quests: AdventureQuest | AdventureQuest[] | null;
    room_title?: string | null;
};

/** 🎯 Quête “lite” (utile toast/journal + actions start/finish) */
export type QuestLite = {
    id: string;
    title: string;
    room_code?: string | null;
    difficulty?: number | null;
    mission_md?: string | null;
};

/** 🏠 Pièce d’aventure (rooms) */
export type AdventureRoom = {
    id: string;
    adventure_id: string;
    code: string;
    title: string;
    emoji: string;
    sort: number;
    source: "template" | "custom";
    template_id: string | null;
};

export type RoomTemplate = {
    emoji: string;
    id: string;
    code: string;
    title: string;
    icon: string | null;
    sort: number;
};

/** 🎭 Style IA */
export type AiStyle = {
    tone: string;
    style: string;
    verbosity: "short" | "normal" | "rich";
};

/** 🧙 Personnage */
export type Character = {
    id: string;
    code: string;
    name: string;
    emoji: string;
    kind: "history" | "fiction" | string;
    archetype: string;
    vibe: string;
    motto: string;
    ai_style: AiStyle;
    is_enabled?: boolean;
    sort?: number;
};

/** 👤 Profil joueur */
export type Profile = {
    user_id: string;
    display_name: string | null;
    character_id: string | null;
    character: Character | null;
} | null;

/** ⭐ Renommée */
export type Renown = { value: number; level: number };

export type RenownGainEvent = {
    chapterQuestId: string;
    delta: number;
    before: Renown | null;
    after: Renown;
    createdAt: number;
    reason?: string;
};

/** 💬 Encouragement MJ */
export type Encouragement = {
    title: string;
    message: string;
    createdAt: number;
    meta?: {
        model?: string;
        tone?: string;
        style?: string;
        verbosity?: string;
        character_name?: string | null;
        character_emoji?: string | null;
    };
};

export type Congratulations = {
    title: string;
    message: string;
    createdAt: number;
    meta?: {
        model?: string;
        tone?: string;
        style?: string;
        verbosity?: string;
        character_name?: string | null;
        character_emoji?: string | null;
    };
};

export type ChapterStoryRow = {
    chapter_id: string;
    session_id: string;
    story_json: any;
    story_md: string;
    model: string;
    updated_at: string;
    created_at?: string;
};

/** ✅ Inputs */
export type CreateAdventureQuestInput = {
    adventure_id: string;
    room_code: string | null;
    title: string;
    description?: string | null;
    difficulty?: 1 | 2 | 3;
    estimate_min?: number | null;

    // priority non éditable pour l’instant => absent ici
    urgency?: QuestUrgency;
};

export type UpdateAdventureQuestInput = {
    id: string;

    title?: string;
    description?: string | null;
    room_code?: string | null;

    difficulty?: 1 | 2 | 3;
    estimate_min?: number | null;

    urgency?: "low" | "normal" | "high";
};

/* ============================================================================
🔗 QUEST CHAINS (chaînes de quêtes)
============================================================================ */

/**
 * Une chaîne regroupe des quêtes (adventure_quests) dans un ordre.
 * Exemple: "Routine du soir", "Préparer la sortie vélo", etc.
 */
export type QuestChain = {
    id: string;
    adventure_id: string;
    title: string | null;
    description: string | null;

    // métadonnées
    created_at: string;
    updated_at?: string | null;

    // scope multi-tenant
    session_id: string | null;
};

/**
 * Un item de chaîne: référence une quête et porte un ordre (position).
 * L’API peut renvoyer l’objet enrichi avec la quête jointe.
 */
export type QuestChainItem = {
    id: string;
    quest_chain_id: string;
    adventure_quest_id: string;

    /**
     * Ordre dans la chaîne (1..n)
     * On garde un integer simple, facile à trier / reorder.
     */
    position: number;

    // métadonnées
    created_at: string;
    updated_at?: string | null;

    // scope multi-tenant
    session_id: string | null;

    /**
     * Join optionnelle (quand tu fais une jointure côté API)
     * Permet d’afficher directement la quête dans l’UI.
     */
    adventure_quest?: {
        id: string;
        adventure_id: string;
        room_code: string | null;
        title: string;
        description: string | null;

        difficulty: number | null;
        estimate_min: number | null;

        urgency?: QuestUrgency | null;
        priority?: QuestPriority | null;

        created_at: string;
        session_id: string | null;
    } | null;
};

/* =========================================================================
📖 PHOTOS
========================================================================= */

export type PhotoCategory = "initial" | "final" | "other";

export type PhotoRow = {
    id: string;
    created_at: string;
    category: PhotoCategory;

    bucket: string; // "photos"
    path: string;

    mime_type: string | null;
    size: number | null;
    width: number | null;
    height: number | null;

    caption: string | null;
    is_cover: boolean;
    sort: number;

    chapter_quest_id: string;
    adventure_quest_id: string | null;
    session_id: string;
    user_id: string;

    signed_url?: string | null; // renvoyé par GET
};

export type QuestPhoto = {
    id: string;
    created_at: string;
    category: "initial" | "final" | "other";
    signed_url: string | null;

    caption: string | null;
    width: number | null;
    height: number | null;

    is_cover: boolean;
    sort: number;
};

/* ============================================================================
🧵 QUEST THREADS & MESSAGES (Maître du Jeu / Discussion de quête)
============================================================================ */

/**
 * Rôle de l’auteur d’un message dans une quête
 * - mj     : Maître du Jeu (IA / système narratif)
 * - user   : Joueur (à venir)
 * - system : Message technique / automatique
 */
export type QuestMessageRole = "mj" | "user" | "system";

/**
 * Type logique de message
 * Permet de varier le rendu UI et la logique métier
 */
export type QuestMessageKind =
    | "message" // message narratif standard
    | "photo_recognition" // reconnaissance liée à une photo
    | "system_event"; // futur (debug, auto-events, etc.)

/**
 * Données additionnelles optionnelles pour enrichir le rendu
 * (souple par design)
 */
export type QuestMessageMeta = {
    /** catégorie de photo associée (si applicable) */
    photo_category?: "initial" | "final" | "other";

    /** ids de photos concernées */
    photo_ids?: string[];

    /** tonalité narrative (futur usage) */
    tone?: "recognition" | "encouragement" | "neutral";

    /** libre, pour extensions futures */
    [key: string]: unknown;
};

/**
 * Thread de discussion autour d’une quête
 * 1 thread = 1 chapter_quest
 */
export type QuestThread = {
    id: string;

    session_id: string;
    chapter_quest_id: string;

    created_at: string;
    updated_at: string;
};

/**
 * Message dans un thread de quête
 */
export type QuestMessage = {
    id: string;

    thread_id: string;
    session_id: string;
    chapter_quest_id: string;

    role: QuestMessageRole;
    kind: QuestMessageKind;

    /** Contenu principal affiché */
    content: string;

    /** Titre optionnel (utile pour MJ / system) */
    title?: string | null;

    /** Données additionnelles pour le rendu */
    meta?: QuestMessageMeta | null;

    /** Lien optionnel vers une photo */
    photo_id?: string | null;

    created_at: string;
};
