"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

import { useGameStore } from "@/stores/gameStore";
import { useSessionStore } from "@/stores/sessionStore";

type QuestThread = {
    id: string;
    session_id: string;
    chapter_quest_id: string;
    created_at?: string | null;
    updated_at?: string | null;
};

type QuestMessageRole = "mj" | "user" | "system";
type QuestMessageKind = "message" | "photo_recognition" | "system_event";

type QuestMessage = {
    id: string;
    session_id: string;
    thread_id: string;
    chapter_quest_id: string;
    role: string;
    kind: string;
    title?: string | null;
    content: string;
    meta?: Record<string, unknown> | null;
    photo_id?: string | null;
    created_at?: string | null;
};

type Props = {
    chapterQuestId: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

// -----------------------------------------------------------------------------
// 🎛️ UI primitives: le “cadre” identique à MasterCard
// -----------------------------------------------------------------------------
function GradientFrame({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                "rounded-[22px] p-[1.5px]",
                "bg-gradient-to-br",
                "from-cyan-400 via-fuchsia-500 to-emerald-400",
                className
            )}
        >
            <div className="rounded-[20px] bg-black/90 backdrop-blur px-5 py-4 ring-1 ring-white/10">
                {children}
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// FAKES (respect du schéma)
// -----------------------------------------------------------------------------
function makeFakeThread(chapterQuestId: string): QuestThread {
    return {
        id: "thread_fake_001",
        session_id: "session_fake_001",
        chapter_quest_id: chapterQuestId,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        updated_at: new Date().toISOString(),
    };
}

function makeFakeMessages(thread: QuestThread): QuestMessage[] {
    return [
        {
            id: "m_001",
            session_id: thread.session_id,
            thread_id: thread.id,
            chapter_quest_id: thread.chapter_quest_id,
            role: "system",
            kind: "system_event",
            title: "Fil scellé",
            content: "Un fil de discussion a été ouvert avec le Maître du Jeu.",
            meta: { source: "fake" },
            photo_id: null,
            created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
        },
        {
            id: "m_002",
            session_id: thread.session_id,
            thread_id: thread.id,
            chapter_quest_id: thread.chapter_quest_id,
            role: "mj",
            kind: "message",
            title: "Le MJ murmure",
            content:
                "Je vois ton pas hésiter.\n\n**Choisis un geste simple** qui ouvre la voie.\n\n- Un objet à remettre en place\n- Une tâche à commencer sans perfection\n\nQuand tu l’as fait, reviens me dire *ce que tu as ressenti*.",
            meta: { mood: "encouraging", source: "fake" },
            photo_id: null,
            created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
        },
        {
            id: "m_003",
            session_id: thread.session_id,
            thread_id: thread.id,
            chapter_quest_id: thread.chapter_quest_id,
            role: "user",
            kind: "message",
            title: null,
            content: "Ok. Je commence par 5 minutes. Juste le premier pas.",
            meta: { source: "fake" },
            photo_id: null,
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
            id: "m_004",
            session_id: thread.session_id,
            thread_id: thread.id,
            chapter_quest_id: thread.chapter_quest_id,
            role: "mj",
            kind: "message",
            title: "Très bien.",
            content:
                "Parfait. **Cinq minutes, c’est une brèche dans le mur.**\n\nJe garde la porte ouverte. Ramène-moi un détail concret:\n\n> Qu’est-ce qui a été le plus facile à démarrer ?",
            meta: { mood: "praise", source: "fake" },
            photo_id: null,
            created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        },
    ].sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")));
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function roleLabel(role: string) {
    if (role === "mj") return "MJ";
    if (role === "user") return "Toi";
    return "Système";
}

function roleEmoji(role: string) {
    if (role === "mj") return "🎭";
    if (role === "user") return "🧑‍🚀";
    return "⚙️";
}

function formatTime(iso?: string | null) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

function Bubble({ msg }: { msg: QuestMessage }) {
    const isMJ = msg.role === "mj";
    const isUser = msg.role === "user";
    const isSystem = msg.role === "system";

    const contentNode = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{roleEmoji(msg.role)}</span>
                        <div className="text-xs tracking-[0.22em] uppercase text-white/55">
                            {roleLabel(msg.role)}
                        </div>
                    </div>

                    {msg.title ? (
                        <div className="mt-1 text-sm font-semibold text-white/90 truncate">
                            {msg.title}
                        </div>
                    ) : null}
                </div>

                <div className="shrink-0 text-[11px] text-white/45">
                    {formatTime(msg.created_at)}
                </div>
            </div>

            <div
                className={cn(
                    "mt-3 text-sm leading-relaxed",
                    isMJ ? "text-white/80" : isUser ? "text-white/75" : "text-white/60"
                )}
            >
                <div
                    className={cn(
                        "prose prose-invert max-w-none",
                        "prose-p:my-3 prose-ul:my-3 prose-li:my-1",
                        "prose-strong:text-white"
                    )}
                >
                    <ReactMarkdown
                        components={{
                            p: ({ children }) => <p className="my-3">{children}</p>,
                            ul: ({ children }) => (
                                <ul className="my-3 list-disc pl-6">{children}</ul>
                            ),
                            li: ({ children }) => <li className="my-1">{children}</li>,
                            strong: ({ children }) => (
                                <strong className="text-white">{children}</strong>
                            ),
                            blockquote: ({ children }) => (
                                <blockquote className="my-3 border-l-2 border-white/15 pl-3 text-white/75">
                                    {children}
                                </blockquote>
                            ),
                        }}
                    >
                        {msg.content}
                    </ReactMarkdown>
                </div>
            </div>
        </>
    );

    // 🎭 MJ: exactement le même “cadre” que MasterCard, pour retrouver le look de ta capture
    if (isMJ) {
        return <GradientFrame className="">{contentNode}</GradientFrame>;
    }

    // 👤 User: carte sobre
    if (isUser) {
        return (
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">{contentNode}</div>
        );
    }

    // ⚙️ System: carte plus discrète
    return <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">{contentNode}</div>;
}

export default function QuestMjThreadCard({ chapterQuestId }: Props) {
    const {
        questThreadsByChapterQuestId,
        questThreadsLoadingByChapterQuestId,
        questMessagesByThreadId,
        questMessagesLoadingByThreadId,
        ensureQuestThread,
        fetchQuestMessages,
    } = useGameStore();

    const sessionId = useSessionStore((s) => s.activeSessionId);

    const thread = questThreadsByChapterQuestId[chapterQuestId];
    const threadLoading = questThreadsLoadingByChapterQuestId[chapterQuestId];

    const messages = thread ? (questMessagesByThreadId[thread.id] ?? []) : [];
    const messagesLoading = thread ? questMessagesLoadingByThreadId[thread.id] : false;

    const [expanded, setExpanded] = React.useState(false);

    // 🔌 Ensure thread + messages
    React.useEffect(() => {
        if (!chapterQuestId) return;

        (async () => {
            const t = await ensureQuestThread(chapterQuestId);
            if (t?.id) {
                await fetchQuestMessages(t.id);
            }
        })();
    }, [chapterQuestId, ensureQuestThread, fetchQuestMessages]);

    const visibleMessages = expanded ? messages : messages.slice(-2);

    return (
        <GradientFrame className="">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                        🎭 Discussion
                    </div>
                    <div className="mt-1 text-base text-white/90 font-semibold">
                        Le Maître du Jeu
                    </div>
                    <div className="mt-1 text-xs text-white/55">
                        {thread ? (
                            <>
                                Thread: <span className="text-white/70">{thread.id}</span>
                            </>
                        ) : threadLoading ? (
                            "Ouverture du fil…"
                        ) : (
                            "Aucun fil"
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className={cn(
                        "rounded-full px-2 py-1 text-[11px] text-white/80",
                        "bg-white/10 ring-1 ring-white/15 hover:bg-white/15 transition"
                    )}
                >
                    {expanded ? "Réduire" : "Voir tout"}
                </button>
            </div>

            {/* Messages */}
            <div className="mt-4 grid gap-2">
                {messagesLoading && (
                    <div className="text-xs text-white/40 italic">
                        Le Maître du Jeu rassemble ses pensées…
                    </div>
                )}

                {visibleMessages.map((m) => (
                    <Bubble key={m.id} msg={m} />
                ))}

                {!messagesLoading && visibleMessages.length === 0 && (
                    <div className="text-xs text-white/40 italic">
                        Aucun message pour l’instant.
                    </div>
                )}
            </div>

            {/* Footer (fake actions) */}
            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-[11px] text-white/45">
                    {messages.length} message{messages.length > 1 ? "s" : ""} ·{" "}
                    {expanded ? "Tout le fil" : "Aperçu"}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled
                        className={cn(
                            "rounded-full px-2 py-1 text-[11px]",
                            "bg-white/5 text-white/35 ring-1 ring-white/10 cursor-not-allowed"
                        )}
                        title="Branché après (POST /api/quest-messages)"
                    >
                        ✍️ Répondre
                    </button>
                    <button
                        type="button"
                        disabled
                        className={cn(
                            "rounded-full px-2 py-1 text-[11px]",
                            "bg-white/5 text-white/35 ring-1 ring-white/10 cursor-not-allowed"
                        )}
                        title="Branché après (photos / messages kind)"
                    >
                        📎 Joindre
                    </button>
                </div>
            </div>
        </GradientFrame>
    );
}
