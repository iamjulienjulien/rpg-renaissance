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
    chapters_count?: number | null;
    chapters?: string[];
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

export type CurrentPlayer = {
    /* ------------------------------------------------------------------
     * Identité
     * ------------------------------------------------------------------ */
    user_id: string;
    email: string | null;

    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    locale: string | null;
    onboarding_done: boolean;
    created_at: string | null;

    /* ------------------------------------------------------------------
     * Profil joueur
     * ------------------------------------------------------------------ */
    display_name: string | null;

    character: {
        character_id: string;
        code: string;
        name: string;
        emoji: string | null;
        kind: string;
        archetype: string | null;
        vibe: string | null;
        motto: string | null;
        ai_style: Record<string, any>;
    } | null;

    /* ------------------------------------------------------------------
     * Player profile details (nouveau contexte IA)
     * ------------------------------------------------------------------ */
    details: {
        gender: string | null;
        birth_date: string | null;
        locale: string | null;
        country_code: string | null;

        main_goal: string | null;
        wants: string[];
        avoids: string[];

        life_rhythm: string | null;
        energy_peak: string | null;
        daily_time_budget: string | null;

        effort_style: string | null;
        challenge_preference: string | null;
        motivation_primary: string | null;
        failure_response: string | null;

        values: string[];
        authority_relation: string | null;

        archetype: string | null;
        symbolism_relation: string | null;
        resonant_elements: string[];

        extra: Record<string, any>;

        created_at: string;
        updated_at: string;
    } | null;

    /* ------------------------------------------------------------------
     * Contextes narratifs (user_contexts)
     * ------------------------------------------------------------------ */
    contexts: {
        context_self: string | null;
        context_family: string | null;
        context_home: string | null;
        context_routine: string | null;
        context_challenges: string | null;
    } | null;

    /* ------------------------------------------------------------------
     * Progression
     * ------------------------------------------------------------------ */
    renown: {
        value: number;
        updated_at: string | null;
        level: {
            number: number;
            title: string;
            tier: number;
            tier_title: string;
            level_suffix: string | null;
            is_milestone: boolean;
        } | null;
    } | null;

    badges: Array<{
        code: string;
        title: string;
        emoji: string | null;
        description: string | null;
        unlocked_at: string;
        source: string | null;
        metadata: any;
    }>;

    /* ------------------------------------------------------------------
     * Session
     * ------------------------------------------------------------------ */
    active_session: {
        id: string;
        title: string;
        is_active: boolean;
    } | null;
};

export type MeStatsResponse = {
    session: {
        id: string;
        created_at: string | null;
    };

    progression: {
        renown: {
            value: number;
            level: number;
            tier: number | null;
            tier_title: string | null;
            full_title: string | null;
            is_milestone: boolean;
            updated_at: string | null;
        };

        chapters: {
            total: number;
            by_status: Record<string, number>;
            recent: Array<{
                id: string;
                title: string | null;
                status: string | null;
                created_at: string | null;
                chapter_code: string | null;
                adventure_id: string | null;
            }>;
        };

        quests: {
            total: number;
            done: number;
            todo: number;
            by_status: Record<string, number>;
            difficulty_avg: number | null;
            rooms_touched_count: number;
        };
    };

    activity: {
        last_entry_at: string | null;
        current_streak_days: number;
        best_streak_days: number;
        active_days_last_30: number;
        activity_last_30: Array<{ date: string; count: number }>;
    };

    ai: {
        generations_last_30: {
            total: number;
            success: number;
            error: number;
            avg_duration_ms: number | null;
            types_top: Array<{ type: string; count: number }>;
        };
        jobs_last_30: {
            total: number;
            by_status: Record<string, number>;
            types_top: Array<{ job_type: string; count: number }>;
        };
    };

    achievements: {
        total: number;
        recent: Array<{
            id: string;
            unlocked_at: string | null;
            scope_key: string | null;
            code: string | null;
            name: string | null;
            icon: string | null;
            scope: string | null;
            is_repeatable: boolean;
        }>;
    };

    badges: {
        total: number;
        recent: Array<{
            id: string;
            unlocked_at: string | null;
            code: string | null;
            title: string | null;
            emoji: string | null;
        }>;
    };

    toasts: {
        unread_count: number;
        unread_recent: Array<{
            id: string;
            kind: string | null;
            title: string | null;
            created_at: string | null;
        }>;
    };

    photos: {
        total: number;
        cover_total: number;
        last_30: number;
        by_category: Record<string, number>;
    };

    meta: {
        generated_at: string;
        windows: {
            last_30_from: string;
        };
    };
};

export type PlayerStatsHighlights = {
    renownLabel: string | null;
    questsProgressLabel: string; // "12/30"
    streakLabel: string; // "🔥 5j"
    activity30Label: string; // "🗓️ 14j actifs"
    aiUsageLabel: string; // "🤖 22 gen"
    unreadToastsLabel: string | null; // "🔔 3"
};
