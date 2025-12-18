import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = supabaseServer();
    const url = new URL(req.url);

    const id = url.searchParams.get("id");
    const latest = url.searchParams.get("latest");

    const selectWithAdventure = `
        *,
        adventures:adventure_id (
            code
        )
    `;

    const mapChapter = (row: any) => {
        if (!row) return row;

        const adventure_code = row?.adventures?.code ?? null;

        // On renvoie un objet "chapitre" propre, avec adventure_code à plat
        const { adventures, ...rest } = row;
        return {
            ...rest,
            adventure_code,
        };
    };

    // ✅ 1) Chapitre par ID
    if (id) {
        const { data, error } = await supabase
            .from("chapters")
            .select(selectWithAdventure)
            .eq("id", id)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

        return NextResponse.json({ chapter: mapChapter(data) });
    }

    // ✅ 2) Chapitre le plus récent (latest=1)
    if (latest === "1" || latest === "true") {
        const { data, error } = await supabase
            .from("chapters")
            .select(selectWithAdventure)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ chapter: null });

        return NextResponse.json({ chapter: mapChapter(data) });
    }

    // ✅ 3) Liste
    const { data, error } = await supabase
        .from("chapters")
        .select(selectWithAdventure)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        chapters: (data ?? []).map(mapChapter),
    });
}

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const body = await req.json().catch(() => null);

    const adventure_id = typeof body?.adventure_id === "string" ? body.adventure_id : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const pace = typeof body?.pace === "string" ? body.pace : "standard";

    if (!adventure_id || !title) {
        return NextResponse.json({ error: "Missing adventure_id or title" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("chapters")
        .insert({
            adventure_id,
            title,
            pace,
            status: "draft",
        })
        .select("id,adventure_id,title,pace,status,created_at")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ chapter: data }, { status: 201 });
}
