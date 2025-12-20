import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function extractCode(req: Request) {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // /api/adventures/{code}/rooms
    return decodeURIComponent(parts[2] ?? "").trim();
}

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const code = extractCode(req);

    if (!code) return NextResponse.json({ error: "Missing adventure code" }, { status: 400 });

    const { data: adv, error: advErr } = await supabase
        .from("adventures")
        .select("id,code,title")
        .eq("code", code)
        .maybeSingle();

    if (advErr) return NextResponse.json({ error: advErr.message }, { status: 500 });
    if (!adv) return NextResponse.json({ error: "Adventure not found" }, { status: 404 });

    const { data, error } = await supabase
        .from("adventure_rooms")
        .select("id,adventure_id,code,title,sort")
        .eq("adventure_id", adv.id)
        .order("sort", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ adventure: adv, rooms: data ?? [] });
}
