import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = supabaseServer();
    const url = new URL(req.url);
    const deviceId = url.searchParams.get("deviceId") ?? "";

    if (!deviceId) {
        return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("player_profile")
        .select(
            `
            device_id,
            display_name,
            character_id,
            characters:character_id (
                id, code, name, emoji, kind, archetype, vibe, motto, ai_style
            )
        `
        )
        .eq("device_id", deviceId)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        profile: data
            ? {
                  device_id: data.device_id,
                  display_name: data.display_name,
                  character_id: data.character_id,
                  character: (data as any).characters ?? null,
              }
            : null,
    });
}

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const body = await req.json().catch(() => null);

    const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
    const characterId = typeof body?.characterId === "string" ? body.characterId : "";
    const displayName = typeof body?.displayName === "string" ? body.displayName : null;

    if (!deviceId || !characterId) {
        return NextResponse.json({ error: "Missing deviceId or characterId" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("player_profile")
        .upsert(
            {
                device_id: deviceId,
                character_id: characterId,
                display_name: displayName,
            },
            { onConflict: "device_id" }
        )
        .select("device_id,display_name,character_id")
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ profile: data });
}
