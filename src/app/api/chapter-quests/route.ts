import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = supabaseServer();
    const url = new URL(req.url);

    const id = url.searchParams.get("id");
    const chapterId = url.searchParams.get("chapterId");

    if (!id && !chapterId) {
        return NextResponse.json({ error: "Missing id or chapterId" }, { status: 400 });
    }

    const baseSelect = `
        id,
        chapter_id,
        adventure_quest_id,
        status,
        created_at,
        adventure_quests!chapter_quests_adventure_quest_id_fkey (
            id,
            adventure_id,
            room_code,
            title,
            description,
            difficulty,
            estimate_min,
            created_at
        )
    `;

    if (id) {
        const { data, error } = await supabase
            .from("chapter_quests")
            .select(baseSelect)
            .eq("id", id)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({ item: data });
    }

    const { data, error } = await supabase
        .from("chapter_quests")
        .select(baseSelect)
        .eq("chapter_id", chapterId!)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const body = await req.json().catch(() => null);

    const chapter_id = typeof body?.chapter_id === "string" ? body.chapter_id : "";
    const adventure_quest_ids = Array.isArray(body?.adventure_quest_ids)
        ? body.adventure_quest_ids
        : [];

    if (!chapter_id || adventure_quest_ids.length === 0) {
        return NextResponse.json(
            { error: "Missing chapter_id or adventure_quest_ids" },
            { status: 400 }
        );
    }

    const rows = adventure_quest_ids
        .filter((x: unknown) => typeof x === "string" && x.length > 0)
        .map((id: string) => ({
            chapter_id,
            adventure_quest_id: id,
            status: "todo",
        }));

    const { data, error } = await supabase
        .from("chapter_quests")
        .insert(rows)
        .select("id,chapter_id,adventure_quest_id,status,created_at");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = data ?? [];

    // ✅ Génération auto des briefs
    // (si pas de clé OpenAI, on skip sans casser)
    const apiKey = process.env.OPENAI_API_KEY ?? "";
    if (apiKey) {
        const { generateMissionForChapterQuest } = await import("@/lib/mission/generateMission");

        // Génère pour chaque tâche du chapitre
        // (en parallèle, mais raisonnable)
        await Promise.all(
            items.map(async (it) => {
                try {
                    await generateMissionForChapterQuest(it.id, false);
                } catch (e) {
                    console.error("Mission generation failed for", it.id, e);
                }
            })
        );
    }

    return NextResponse.json({ items }, { status: 201 });
}

export async function PATCH(req: Request) {
    const supabase = supabaseServer();
    const body = await req.json().catch(() => null);

    const id = typeof body?.id === "string" ? body.id : "";
    const status = typeof body?.status === "string" ? body.status : "";

    if (!id || !status) {
        return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    if (!["todo", "doing", "done"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("chapter_quests")
        .update({ status })
        .eq("id", id)
        .select("id,chapter_id,adventure_quest_id,status,created_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
}

export async function DELETE(req: Request) {
    const supabase = supabaseServer();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { error } = await supabase.from("chapter_quests").delete().eq("id", id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
