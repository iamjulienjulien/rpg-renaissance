import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

function safeString(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function safePace(x: unknown): "calme" | "standard" | "intense" {
    if (x === "calme" || x === "intense") return x;
    return "standard";
}

function makeChapterCode(base: string = "chapter") {
    const slug = (base || "chapter")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 32);

    const rand = Math.random().toString(16).slice(2, 10);
    return `${slug}-${rand}`;
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const body = await req.json().catch(() => null);

    const prevChapterId = safeString(body?.prev_chapter_id);
    const adventureId = safeString(body?.adventure_id);

    // ✅ FRONT: /adventure envoie next.ai_context (pas context_text)
    // On supporte les 2 pour compat.
    const nextTitle = safeString(body?.next?.title);
    const nextPace = safePace(body?.next?.pace);

    const rawAiContext =
        typeof body?.next?.ai_context === "string"
            ? body.next.ai_context
            : typeof body?.next?.context_text === "string"
              ? body.next.context_text
              : body?.next?.ai_context === null || body?.next?.context_text === null
                ? null
                : "";

    const context_text =
        rawAiContext === null ? null : rawAiContext.trim().length ? rawAiContext.trim() : null;

    // ✅ nouveau: accepte un code forcé (utile dev) sinon génère
    const chapter_code_input =
        typeof body?.next?.chapter_code === "string" ? body.next.chapter_code.trim() : "";
    const nextChapterCode = chapter_code_input || makeChapterCode(nextTitle || "chapter");

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

    // 1) Load prev chapter (✅ check session ownership like /chapters)
    const { data: prevChapter, error: prevErr } = await supabase
        .from("chapters")
        .select("id, adventure_id, session_id, status, title, chapter_code")
        .eq("id", prevChapterId)
        .eq("session_id", session.id)
        .maybeSingle();

    if (prevErr) return NextResponse.json({ error: prevErr.message }, { status: 500 });
    if (!prevChapter) {
        return NextResponse.json({ error: "Previous chapter not found" }, { status: 404 });
    }
    if (prevChapter.adventure_id !== adventureId) {
        return NextResponse.json({ error: "Adventure mismatch" }, { status: 400 });
    }

    // 2) Get remaining chapter quests (todo/doing) from prev chapter
    // ✅ session scope: via chapter_id + session_id
    const { data: remainingCq, error: remErr } = await supabase
        .from("chapter_quests")
        .select("adventure_quest_id, status")
        .eq("chapter_id", prevChapterId)
        .eq("session_id", session.id)
        .in("status", ["todo", "doing"]);

    if (remErr) return NextResponse.json({ error: remErr.message }, { status: 500 });

    const carryOverIds = (remainingCq ?? [])
        .map((x: any) => x.adventure_quest_id)
        .filter((x: any) => typeof x === "string" && x.length > 0);

    // merge unique
    const toAssign = Array.from(new Set<string>([...carryOverIds, ...backlogIds]));

    // 3) Close previous chapter (✅ restrict update to session)
    const { error: closeErr } = await supabase
        .from("chapters")
        .update({ status: "done" })
        .eq("id", prevChapterId)
        .eq("session_id", session.id);

    if (closeErr) return NextResponse.json({ error: closeErr.message }, { status: 500 });

    // 4) Create next chapter (active) + save context_text + ✅ chapter_code
    const { data: created, error: createErr } = await supabase
        .from("chapters")
        .insert({
            adventure_id: adventureId,
            session_id: session.id,
            title: nextTitle,
            pace: nextPace,
            status: "active",
            context_text, // ✅ même colonne que /chapters PATCH
            chapter_code: nextChapterCode, // ✅ aligné /chapters POST
        })
        .select(
            "id, adventure_id, session_id, title, pace, status, created_at, chapter_code, context_text"
        )
        .single();

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

    const nextChapterId = created.id;

    // --- 5.A) Carry-over: déplacer les lignes existantes (sans rien changer d'autre)
    if (carryOverIds.length > 0) {
        const { error: moveErr } = await supabase
            .from("chapter_quests")
            .update({ chapter_id: nextChapterId })
            .eq("session_id", session.id)
            .eq("chapter_id", prevChapterId)
            .in("status", ["todo", "doing"])
            .in("adventure_quest_id", carryOverIds);

        if (moveErr) {
            return NextResponse.json({ error: moveErr.message }, { status: 500 });
        }
    }

    // --- 5.B) Backlog: insérer seulement celles qui ne sont PAS déjà carry-over
    const carrySet = new Set<string>(carryOverIds);
    const backlogToInsert = backlogIds.filter((id: string) => !carrySet.has(id));

    if (backlogToInsert.length > 0) {
        const rows = backlogToInsert.map((adventureQuestId: any) => ({
            chapter_id: nextChapterId,
            adventure_quest_id: adventureQuestId,
            status: "todo",
            session_id: session.id,
        }));

        // Si tu as UNIQUE(chapter_id, adventure_quest_id), c’est parfait
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
