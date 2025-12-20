import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);

    const adventureId = url.searchParams.get("adventureId") ?? "";
    if (!adventureId) {
        return NextResponse.json({ error: "Missing adventureId" }, { status: 400 });
    }

    const session = await getActiveSessionOrThrow();

    const { data, error } = await supabase
        .from("adventure_rooms")
        .select("id, adventure_id, code, title, sort, source, template_id, session_id")
        .eq("adventure_id", adventureId)
        .eq("session_id", session.id) // ✅ multi-partie
        .order("sort", { ascending: true })
        .order("title", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rooms: data ?? [] });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const body = await req.json().catch(() => null);

    const session = await getActiveSessionOrThrow();

    const adventure_id = typeof body?.adventure_id === "string" ? body.adventure_id : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";

    if (!adventure_id || !code || !title) {
        return NextResponse.json({ error: "Missing adventure_id, code or title" }, { status: 400 });
    }

    const sort = typeof body?.sort === "number" ? body.sort : 100;
    const source = body?.source === "template" ? "template" : "custom";
    const template_id = typeof body?.template_id === "string" ? body.template_id : null;

    const { data, error } = await supabase
        .from("adventure_rooms")
        .insert({
            session_id: session.id, // ✅ REQUIRED avec RLS
            adventure_id,
            code,
            title,
            sort,
            source,
            template_id,
        })
        .select("id, adventure_id, code, title, sort, source, template_id, session_id")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ room: data }, { status: 201 });
}

export async function DELETE(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);

    const id = url.searchParams.get("id") ?? "";
    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const session = await getActiveSessionOrThrow();

    const { error } = await supabase
        .from("adventure_rooms")
        .delete()
        .eq("id", id)
        .eq("session_id", session.id); // ✅ sécurité multi-partie

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
