export type Adventure = {
    id: string;
    code: "home_realignment";
    title: string;
    description: string | null;
    created_at: string;
};

export type AdventureRoom = {
    id: string;
    adventure_id: string;
    code: string;
    title: string;
    sort: number;
};

export type AdventureQuest = {
    id: string;
    adventure_id: string;
    room_code: string | null;
    title: string;
    description: string | null;
    difficulty: number;
    estimate_min: number | null;
    created_at: string;
};

export type Chapter = {
    id: string;
    adventure_id: string | null;
    title: string;
    pace: "calme" | "standard" | "intense";
    status: "draft" | "active" | "done";
    created_at: string;
};

export type ChapterQuest = {
    id: string;
    chapter_id: string;
    adventure_quest_id: string;
    status: "todo" | "doing" | "done";
    created_at: string;
};
