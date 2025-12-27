import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
    const supabase = await supabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const display_name = typeof body?.display_name === "string" ? body.display_name.trim() : "";
    const character_id = typeof body?.character_id === "string" ? body.character_id.trim() : "";

    if (!display_name) {
        return NextResponse.json({ error: "Missing display_name" }, { status: 400 });
    }
    if (!character_id) {
        return NextResponse.json({ error: "Missing character_id" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("player_profiles")
        .upsert(
            {
                user_id: auth.user.id,
                display_name,
                character_id,
            },
            { onConflict: "user_id" }
        )
        .select("user_id,display_name,character_id")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ profile: data });
}

export async function PATCH(req: Request) {
    const supabase = await supabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const display_name = typeof body?.display_name === "string" ? body.display_name.trim() : "";

    if (!display_name) return NextResponse.json({ error: "Missing display_name" }, { status: 400 });

    const { data, error } = await supabase
        .from("player_profiles")
        .upsert({ user_id: auth.user.id, display_name }, { onConflict: "user_id" })
        .select("user_id,display_name,character_id")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ profile: data });
}
