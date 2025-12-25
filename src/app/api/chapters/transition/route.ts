import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function safeString(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function safePace(x: unknown): "calme" | "standard" | "intense" {
    if (x === "calme" || x === "intense") return x;
    return "standard";
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const userId = authData?.user?.id ?? "";
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => null);

    const prevChapterId = safeString(body?.prev_chapter_id);
    const adventureId = safeString(body?.adventure_id);

    const nextTitle = safeString(body?.next?.title);
    const nextPace = safePace(body?.next?.pace);
    const aiContext = safeString(body?.next?.context_text) || null;

    const backlogIds = Array.isArray(body?.backlog_adventure_quest_ids)
        ? body.backlog_adventure_quest_ids.filter((x: any) => typeof x === "string" && x.length > 0)
        : [];

    if (!prevChapterId) {
        return NextResponse.json({ error: "Missing prev_chapter_id" }, { status: 400 });
    }
    if (!adventureId) {
        return NextResponse.json({ error: "Missing adventure_id" }, { status: 400 });
    }
    if (!nextTitle) {
        return NextResponse.json({ error: "Missing next.title" }, { status: 400 });
    }

    // 1) Load prev chapter (check ownership via session)
    const { data: prevChapter, error: prevErr } = await supabase
        .from("chapters")
        .select("id, adventure_id, session_id, status, title")
        .eq("id", prevChapterId)
        .maybeSingle();

    if (prevErr) {
        return NextResponse.json({ error: prevErr.message }, { status: 500 });
    }
    if (!prevChapter) {
        return NextResponse.json({ error: "Previous chapter not found" }, { status: 404 });
    }
    if ((prevChapter as any).adventure_id !== adventureId) {
        return NextResponse.json({ error: "Adventure mismatch" }, { status: 400 });
    }
    if (!(prevChapter as any).session_id) {
        return NextResponse.json(
            { error: "Missing session_id on previous chapter" },
            { status: 400 }
        );
    }

    const sessionId = (prevChapter as any).session_id as string;

    // 2) Get remaining chapter quests (todo/doing) from prev chapter
    const { data: remainingCq, error: remErr } = await supabase
        .from("chapter_quests")
        .select("adventure_quest_id, status")
        .eq("chapter_id", prevChapterId)
        .in("status", ["todo", "doing"]);

    if (remErr) {
        return NextResponse.json({ error: remErr.message }, { status: 500 });
    }

    const carryOverIds = (remainingCq ?? [])
        .map((x: any) => x.adventure_quest_id)
        .filter((x: any) => typeof x === "string" && x.length > 0);

    // merge unique
    const toAssign = Array.from(new Set<string>([...carryOverIds, ...backlogIds]));

    // 3) Close previous chapter
    const { error: closeErr } = await supabase
        .from("chapters")
        .update({ status: "done" })
        .eq("id", prevChapterId);

    if (closeErr) {
        return NextResponse.json({ error: closeErr.message }, { status: 500 });
    }

    // 4) Create next chapter (active) + save context_text
    // ⚠️ adapte le nom de colonne context_text si besoin
    const { data: created, error: createErr } = await supabase
        .from("chapters")
        .insert({
            adventure_id: adventureId,
            session_id: sessionId,
            title: nextTitle,
            pace: nextPace,
            status: "active",
            context_text: aiContext, // <- adapte si ta colonne s’appelle différemment
        })
        .select("id, title, pace, status, adventure_id, session_id, created_at")
        .single();

    if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    const nextChapterId = (created as any).id as string;

    // 5) Pre-assign quests to new chapter
    if (toAssign.length > 0) {
        const rows = toAssign.map((adventureQuestId) => ({
            chapter_id: nextChapterId,
            adventure_quest_id: adventureQuestId,
            status: "todo",
            session_id: sessionId,
        }));

        // onConflict à ajuster selon ta contrainte unique
        // si tu as UNIQUE(chapter_id, adventure_quest_id) -> parfait
        const { error: insErr } = await supabase
            .from("chapter_quests")
            .upsert(rows, { onConflict: "chapter_id,adventure_quest_id" });

        if (insErr) {
            return NextResponse.json({ error: insErr.message }, { status: 500 });
        }
    }

    return NextResponse.json({
        ok: true,
        nextChapter: created,
        stats: {
            carry_over: carryOverIds.length,
            backlog_selected: backlogIds.length,
            assigned_total: toAssign.length,
        },
    });
}
