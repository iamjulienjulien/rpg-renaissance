import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createJournalEntry } from "@/lib/journal/createJournalEntry";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);
    const adventureId = url.searchParams.get("adventureId");

    if (!adventureId) {
        return NextResponse.json({ error: "Missing adventureId" }, { status: 400 });
    }

    const session = await getActiveSessionOrThrow();

    const { data, error } = await supabase
        .from("adventure_quests")
        .select("id,adventure_id,room_code,title,description,difficulty,estimate_min,created_at")
        .eq("adventure_id", adventureId)
        .eq("session_id", session.id) // ✅ important (et cohérent avec RLS)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ quests: data ?? [] });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const body = await req.json().catch(() => null);

    const session = await getActiveSessionOrThrow();

    const adventure_id = typeof body?.adventure_id === "string" ? body.adventure_id : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";

    if (!adventure_id || !title) {
        return NextResponse.json({ error: "Missing adventure_id or title" }, { status: 400 });
    }

    const payload = {
        session_id: session.id, // ✅ REQUIRED avec RLS
        adventure_id,
        room_code: typeof body?.room_code === "string" ? body.room_code : null,
        title,
        description: typeof body?.description === "string" ? body.description : null,
        difficulty: typeof body?.difficulty === "number" ? body.difficulty : 2,
        estimate_min: typeof body?.estimate_min === "number" ? body.estimate_min : null,
    };

    const { data, error } = await supabase
        .from("adventure_quests")
        .insert(payload)
        .select(
            "id,adventure_id,room_code,title,description,difficulty,estimate_min,created_at,session_id"
        )
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 📝 Journal — création de quête
    try {
        await createJournalEntry({
            session_id: session.id,
            kind: "quests_seeded", // 🔁 (recommandé: remplacer par "quest_created")
            title: "📜 Nouvelle quête ajoutée",
            content: data.room_code
                ? `Une nouvelle quête a été définie dans la pièce **${data.room_code}** : “${data.title}”.`
                : `Une nouvelle quête a été définie : “${data.title}”.`,
            adventure_quest_id: data.id,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json(
            { error: "Journal insert failed", details: msg, quest: data },
            { status: 500 }
        );
    }

    return NextResponse.json({ quest: data }, { status: 201 });
}
