import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = supabaseServer();
    const url = new URL(req.url);

    const adventureId = url.searchParams.get("adventureId") ?? "";
    if (!adventureId) {
        return NextResponse.json({ error: "Missing adventureId" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("adventure_rooms")
        .select("id, adventure_id, code, title, sort, source, template_id")
        .eq("adventure_id", adventureId)
        .order("sort", { ascending: true })
        .order("title", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rooms: data ?? [] });
}

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const body = await req.json().catch(() => null);

    const adventure_id = body?.adventure_id;
    const code = body?.code;
    const title = body?.title;

    if (!adventure_id || !code || !title) {
        return NextResponse.json({ error: "Missing adventure_id, code or title" }, { status: 400 });
    }

    const sort = typeof body?.sort === "number" ? body.sort : 100;
    const source = body?.source === "template" ? "template" : "custom";
    const template_id = body?.template_id ?? null;

    const { data, error } = await supabase
        .from("adventure_rooms")
        .insert({
            adventure_id,
            code,
            title,
            sort,
            source,
            template_id,
        })
        .select("id, adventure_id, code, title, sort, source, template_id")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ room: data }, { status: 201 });
}

export async function DELETE(req: Request) {
    const supabase = supabaseServer();
    const url = new URL(req.url);

    const id = url.searchParams.get("id") ?? "";
    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { error } = await supabase.from("adventure_rooms").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
