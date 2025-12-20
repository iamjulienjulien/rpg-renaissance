// src/app/api/profile/character/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

export async function GET() {
    const supabase = await supabaseServer();

    // ✅ Auth
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const userId = auth.user?.id ?? "";
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // ✅ Profil user
    const { data, error } = await supabase
        .from("player_profiles")
        .select(
            `
            user_id,
            display_name,
            character_id,
            characters:character_id (
                id, code, name, emoji, kind, archetype, vibe, motto, ai_style
            )
        `
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        profile: data
            ? {
                  user_id: data.user_id,
                  display_name: data.display_name,
                  character_id: data.character_id,
                  character: (data as any).characters ?? null,
              }
            : null,
    });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const body = await req.json().catch(() => null);

    const characterId = typeof body?.characterId === "string" ? body.characterId : "";
    // const displayName = typeof body?.displayName === "string" ? body.displayName : null;

    if (!characterId) {
        return NextResponse.json({ error: "Missing characterId" }, { status: 400 });
    }

    // ✅ Auth
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const userId = auth.user?.id ?? "";
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // ✅ Session active
    let session;
    try {
        session = await getActiveSessionOrThrow();
    } catch (e) {
        const msg = e instanceof Error ? e.message : "No active session";
        return NextResponse.json({ error: msg }, { status: 401 });
    }

    // 🔍 1) Profil actuel
    const { data: existingProfile, error: exErr } = await supabase
        .from("player_profiles")
        .select("character_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

    const previousCharacterId = existingProfile?.character_id ?? null;
    const characterChanged = previousCharacterId !== characterId;

    // 💾 2) Upsert profil
    const { data, error } = await supabase
        .from("player_profiles")
        .upsert(
            {
                user_id: userId,
                character_id: characterId,
            },
            { onConflict: "user_id" }
        )
        .select("user_id,display_name,character_id")
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 🔥 3) Regen missions si changement de perso (sur la session active uniquement)
    let updateResult = false;
    let regenError: string | null = null;

    let chapterIds: string[] = [];
    let chapterQuestIds: string[] = [];

    if (characterChanged) {
        try {
            // 1) Chapitres de la session active
            const { data: chapters, error: chErr } = await supabase
                .from("chapters")
                .select("id")
                .eq("session_id", session.id);

            if (chErr) throw new Error(chErr.message);

            chapterIds = (chapters ?? []).map((c: any) => c.id).filter(Boolean);

            if (chapterIds.length > 0) {
                // 2) Chapter quests (scopées session)
                //    (si tu as session_id sur chapter_quests, filtre aussi dessus)
                const { data: cqs, error: cqErr } = await supabase
                    .from("chapter_quests")
                    .select("id")
                    .eq("session_id", session.id)
                    .in("chapter_id", chapterIds);

                if (cqErr) throw new Error(cqErr.message);

                chapterQuestIds = (cqs ?? []).map((cq: any) => cq.id).filter(Boolean);

                // 3) Regen missions (force=true)
                const { generateMissionForChapterQuest } =
                    await import("@/lib/mission/generateMission");

                await Promise.all(
                    chapterQuestIds.map((id) => generateMissionForChapterQuest(id, true))
                );

                updateResult = true;
            }
        } catch (e: any) {
            regenError = e?.message ?? String(e);
            console.error("Failed to regenerate missions after character change", e);
        }
    }

    return NextResponse.json({
        profile: data,
        debug: {
            sessionId: session.id,
            characterChanged,
            updateResult,
            chapterIdsCount: chapterIds.length,
            chapterQuestIdsCount: chapterQuestIds.length,
            regenError,
        },
    });
}
