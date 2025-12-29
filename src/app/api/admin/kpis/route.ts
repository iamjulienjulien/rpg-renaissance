// src/app/api/admin/kpis/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

export async function GET() {
    const supabase = await supabaseServer();

    // ✅ Garde-fou auth (même si on ne filtre pas sur session_id)
    await getActiveSessionOrThrow();

    try {
        const [sessions, adventures, chapters, questsTotal, questsDone] = await Promise.all([
            supabase.from("game_sessions").select("*", { count: "exact", head: true }),
            supabase.from("adventures").select("*", { count: "exact", head: true }),
            supabase.from("chapters").select("*", { count: "exact", head: true }),
            supabase.from("adventure_quests").select("*", { count: "exact", head: true }),
            supabase
                .from("chapter_quests")
                .select("*", { count: "exact", head: true })
                .eq("status", "done"),
        ]);

        const firstError =
            sessions.error ||
            adventures.error ||
            chapters.error ||
            questsTotal.error ||
            questsDone.error;

        if (firstError) {
            return NextResponse.json({ error: firstError.message }, { status: 500 });
        }

        const totalQuests = questsTotal.count ?? 0;
        const doneQuests = questsDone.count ?? 0;

        const completionRate =
            totalQuests > 0 ? Math.round((doneQuests / totalQuests) * 1000) / 10 : 0; // 1 décimale

        return NextResponse.json({
            kpis: {
                sessions: sessions.count ?? 0,
                adventures: adventures.count ?? 0,
                chapters: chapters.count ?? 0,
                quests_total: totalQuests,
                quests_done: doneQuests,
                completion_rate: completionRate,
            },
        });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Server error" },
            { status: 500 }
        );
    }
}
