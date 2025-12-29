// src/app/api/admin/sessions/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession"; // optionnel si tu veux protéger

type RowOut = {
    session_id: string;
    user_id: string;
    user_email: string | null;

    title: string;
    status: string;
    is_active: boolean;

    created_at: string;
    last_activity_at: string;

    adventures_count: number;
    quests_count: number;
    quests_done_count: number;
};

function toInt(v: string | null, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

async function getUserEmails(
    supabase: any,
    userIds: string[]
): Promise<Record<string, string | null>> {
    const out: Record<string, string | null> = {};
    const uniq = Array.from(new Set(userIds.filter(Boolean)));

    // Fallback: on ne sait pas lire les emails
    if (uniq.length === 0) return out;

    // Tentative via auth.admin.getUserById (service role requis)
    try {
        await Promise.all(
            uniq.map(async (id) => {
                try {
                    const { data, error } = await supabase.auth.admin.getUserById(id);
                    if (error) {
                        out[id] = null;
                        return;
                    }
                    out[id] = data?.user?.email ?? null;
                } catch {
                    out[id] = null;
                }
            })
        );
    } catch {
        // Si auth.admin indispo, on laisse null
        for (const id of uniq) out[id] = null;
    }

    return out;
}

export async function GET(req: NextRequest) {
    const supabase = await supabaseServer();

    // ✅ si tu veux restreindre l’accès admin, garde ça
    // (sinon tu peux retirer)
    await getActiveSessionOrThrow();

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") ?? "").trim();
    const userId = (searchParams.get("userId") ?? "").trim();

    const limit = toInt(searchParams.get("limit"), 25);
    const offset = toInt(searchParams.get("offset"), 0);

    // 1) sessions page
    let query = supabase
        .from("game_sessions")
        .select("id,user_id,title,status,is_active,created_at,updated_at", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (userId) query = query.eq("user_id", userId);

    if (q) {
        // search simple: id ou user_id ou title
        query = query.or(`id.ilike.%${q}%,user_id.ilike.%${q}%,title.ilike.%${q}%`);
    }

    const { data: sessions, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = Array.isArray(sessions) ? sessions : [];
    const sessionIds = rows.map((s: any) => s.id);
    const userIds = rows.map((s: any) => s.user_id);

    // 2) emails
    const emailByUserId = await getUserEmails(supabase, userIds);

    // 3) counts (N+1 mais OK pour 25 lignes admin)
    const enriched: RowOut[] = await Promise.all(
        rows.map(async (s: any) => {
            const session_id = s.id as string;

            const [adventuresRes, questsRes, questsDoneRes] = await Promise.all([
                supabase
                    .from("adventures")
                    .select("id", { count: "exact", head: true })
                    .eq("session_id", session_id),

                supabase
                    .from("chapter_quests")
                    .select("id", { count: "exact", head: true })
                    .eq("session_id", session_id),

                supabase
                    .from("chapter_quests")
                    .select("id", { count: "exact", head: true })
                    .eq("session_id", session_id)
                    .eq("status", "done"),
            ]);

            const adventures_count = adventuresRes.count ?? 0;
            const quests_count = questsRes.count ?? 0;
            const quests_done_count = questsDoneRes.count ?? 0;

            return {
                session_id,
                user_id: s.user_id,
                user_email: emailByUserId[s.user_id] ?? null,

                title: s.title ?? "",
                status: s.status ?? "",
                is_active: !!s.is_active,

                created_at: s.created_at,
                last_activity_at: s.updated_at ?? s.created_at,

                adventures_count,
                quests_count,
                quests_done_count,
            };
        })
    );

    return NextResponse.json({
        rows: enriched,
        count: typeof count === "number" ? count : null,
        limit,
        offset,
        filters: { q, userId },
    });
}
