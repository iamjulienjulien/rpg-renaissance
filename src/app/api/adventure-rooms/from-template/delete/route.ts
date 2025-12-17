import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function DELETE(req: Request) {
    const supabase = supabaseServer();
    const url = new URL(req.url);

    const adventureId = url.searchParams.get("adventureId") ?? "";
    const templateCode = url.searchParams.get("templateCode") ?? "";

    if (!adventureId || !templateCode) {
        return NextResponse.json({ error: "Missing adventureId or templateCode" }, { status: 400 });
    }

    // Trouver le template id
    const { data: tpl, error: tplErr } = await supabase
        .from("room_templates")
        .select("id")
        .eq("code", templateCode)
        .maybeSingle();

    if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 500 });
    if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    // Supprimer la room active correspondante
    const { error: delErr } = await supabase
        .from("adventure_rooms")
        .delete()
        .eq("adventure_id", adventureId)
        .eq("template_id", tpl.id);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
