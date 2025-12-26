import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

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

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const url = new URL(req.url);

    const id = url.searchParams.get("id");
    const code = url.searchParams.get("code"); // ✅ chapter_code
    const latest = url.searchParams.get("latest");
    const adventureId = url.searchParams.get("adventureId");

    // ✅ FIX: adventures.code n’existe pas (chez toi c’est très probablement instance_code)
    const selectWithAdventure = `
        *,
        adventures:adventure_id (
            instance_code
        )
    `;

    const mapChapter = (row: any) => {
        if (!row) return row;

        const adventure_instance_code = row?.adventures?.instance_code ?? null;

        const { adventures, ...rest } = row;
        return {
            ...rest,
            adventure_instance_code,
        };
    };

    // ✅ 0) Chapitre par chapter_code (prioritaire après id)
    if (code) {
        const { data, error } = await supabase
            .from("chapters")
            .select(selectWithAdventure)
            .eq("chapter_code", code)
            .eq("session_id", session.id)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

        return NextResponse.json({ chapter: mapChapter(data) });
    }

    // ✅ 1) Chapitre par ID (prioritaire)
    if (id) {
        const { data, error } = await supabase
            .from("chapters")
            .select(selectWithAdventure)
            .eq("id", id)
            .eq("session_id", session.id)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

        return NextResponse.json({ chapter: mapChapter(data) });
    }

    const isLatest = latest === "1" || latest === "true";

    // ✅ 2) Latest = dernier chapitre de l’aventure
    if (isLatest) {
        // 2a) Si adventureId fourni => dernier chapitre de CETTE aventure
        if (adventureId) {
            const { data, error } = await supabase
                .from("chapters")
                .select(selectWithAdventure)
                .eq("session_id", session.id)
                .eq("adventure_id", adventureId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            if (!data) return NextResponse.json({ chapter: null });

            return NextResponse.json({ chapter: mapChapter(data) });
        }

        // 2b) Sinon => on déduit l’aventure “courante” via le dernier chapitre de la session
        const { data: lastAny, error: lastErr } = await supabase
            .from("chapters")
            .select("adventure_id")
            .eq("session_id", session.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastErr) return NextResponse.json({ error: lastErr.message }, { status: 500 });
        if (!lastAny?.adventure_id) return NextResponse.json({ chapter: null });

        const advId = lastAny.adventure_id as string;

        const { data, error } = await supabase
            .from("chapters")
            .select(selectWithAdventure)
            .eq("session_id", session.id)
            .eq("adventure_id", advId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ chapter: null });

        return NextResponse.json({ chapter: mapChapter(data) });
    }

    // ✅ 3) Liste par aventure (adventureId=...)
    if (adventureId) {
        const { data, error } = await supabase
            .from("chapters")
            .select(selectWithAdventure)
            .eq("session_id", session.id)
            .eq("adventure_id", adventureId)
            .order("created_at", { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({
            chapters: (data ?? []).map(mapChapter),
        });
    }

    // ✅ 4) Liste globale session
    const { data, error } = await supabase
        .from("chapters")
        .select(selectWithAdventure)
        .eq("session_id", session.id)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        chapters: (data ?? []).map(mapChapter),
    });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const body = await req.json().catch(() => null);

    const adventure_id = typeof body?.adventure_id === "string" ? body.adventure_id : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const pace = typeof body?.pace === "string" ? body.pace : "standard";

    // ✅ nouveau: accepte un code forcé (utile dev) sinon génère
    const chapter_code_input =
        typeof body?.chapter_code === "string" ? body.chapter_code.trim() : "";
    const chapter_code = chapter_code_input || makeChapterCode(title || "chapter");

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
            session_id: session.id,
            chapter_code,
        })
        .select("id,adventure_id,title,pace,status,created_at,session_id,chapter_code")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(
        {
            chapter: data,
            journal: "best_effort",
        },
        { status: 201 }
    );
}

export async function PATCH(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const body = await req.json().catch(() => null);

    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const code = typeof body?.chapter_code === "string" ? body.chapter_code.trim() : "";

    const rawContext =
        typeof body?.context_text === "string"
            ? body.context_text
            : body?.context_text === null
              ? null
              : "";

    const context_text =
        rawContext === null ? null : rawContext.trim().length ? rawContext.trim() : null;

    if (!id && !code) {
        return NextResponse.json({ error: "Missing id or chapter_code" }, { status: 400 });
    }

    const q = supabase.from("chapters").update({ context_text }).eq("session_id", session.id);

    const { data, error } = await (id ? q.eq("id", id) : q.eq("chapter_code", code))
        .select("id, chapter_code, context_text")
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

    return NextResponse.json({ chapter: data });
}
