import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const url = new URL(req.url);
    const adventureId = url.searchParams.get("adventureId");

    if (!adventureId) {
        return NextResponse.json({ error: "Missing adventureId" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("quest_chains")
        .select("id, adventure_id, title, description, created_at")
        .eq("session_id", session.id)
        .eq("adventure_id", adventureId)
        .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ chains: data ?? [] });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();
    const body = await req.json().catch(() => null);

    const adventure_id = typeof body?.adventure_id === "string" ? body.adventure_id : null;
    if (!adventure_id) {
        return NextResponse.json({ error: "Missing adventure_id" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("quest_chains")
        .insert({
            session_id: session.id,
            adventure_id,
            title: body?.title ?? null,
            description: body?.description ?? null,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ chain: data }, { status: 201 });
}
