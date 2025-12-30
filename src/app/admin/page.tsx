// src/app/admin/page.tsx
import React from "react";

import AdminKpisPanel from "./AdminKpisPanel";
import AdminAiGenerationsPanel from "./AdminAiGenerationsPanel";
import AdminUsersPanel from "./AdminUsersPanel";
import AdminSessionsPanel from "./AdminSessionsPanel";
import AdminAdventuresPanel from "./AdminAdventuresPanel";
import AdminChaptersPanel from "./AdminChaptersPanel";
import AdminQuestsPanel from "./AdminQuestsPanel";
import AdminSystemLogsPanel from "./AdminSystemLogsPanel";

type Props = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function asString(v: string | string[] | undefined) {
    if (!v) return "";
    return Array.isArray(v) ? (v[0] ?? "") : v;
}

function cleanParam(v: string) {
    const s = (v ?? "").trim();
    if (!s) return "";
    if (s === "undefined" || s === "null") return "";
    return s;
}

export default async function AdminPage(props: Props) {
    const sp = (await props.searchParams) ?? {};
    const tab = cleanParam(asString(sp.tab)) || "dashboard";

    // Pass-through (utile pour sessions?userId=...)
    const userId = cleanParam(asString(sp.userId));
    const sessionId = cleanParam(asString(sp.sessionId));
    const adventureId = cleanParam(asString(sp.adventureId));
    const requestId = cleanParam(asString(sp.requestId));
    const traceId = cleanParam(asString(sp.traceId));
    const route = cleanParam(asString(sp.route));

    return (
        <div className="space-y-10">
            {tab === "dashboard" ? (
                <>
                    <AdminKpisPanel />
                    <AdminAiGenerationsPanel />
                </>
            ) : null}

            {tab === "ai" ? <AdminAiGenerationsPanel /> : null}
            {tab === "users" ? <AdminUsersPanel /> : null}

            {tab === "sessions" ? <AdminSessionsPanel userId={userId || null} /> : null}

            {tab === "adventures" ? (
                <AdminAdventuresPanel userId={userId || null} sessionId={sessionId || null} />
            ) : null}

            {tab === "chapters" ? (
                <AdminChaptersPanel
                    userId={userId || null}
                    sessionId={sessionId || null}
                    adventureId={adventureId || null}
                />
            ) : null}

            {tab === "quests" ? (
                <AdminQuestsPanel
                    userId={userId || null}
                    sessionId={sessionId || null}
                    adventureId={adventureId || null}
                    chapterId={asString((sp as any).chapterId) || null}
                />
            ) : null}

            {tab === "systemLogs" ? (
                <AdminSystemLogsPanel
                    userId={userId ?? null}
                    sessionId={sessionId ?? null}
                    requestId={requestId ?? null}
                    traceId={traceId ?? null}
                    route={route ?? null}
                />
            ) : null}

            <footer className="text-center text-xs text-white/40">
                Admin Console • Logs branchés sur Supabase
            </footer>
        </div>
    );
}
