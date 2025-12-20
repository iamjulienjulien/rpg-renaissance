import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

export async function DELETE(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);

    const adventureId = url.searchParams.get("adventureId") ?? "";
    const templateCode = url.searchParams.get("templateCode") ?? "";

    if (!adventureId || !templateCode) {
        return NextResponse.json({ error: "Missing adventureId or templateCode" }, { status: 400 });
    }

    // ✅ session active (multi-partie)
    const session = await getActiveSessionOrThrow();

    // 1) Trouver le template id
    const { data: tpl, error: tplErr } = await supabase
        .from("room_templates")
        .select("id")
        .eq("code", templateCode)
        .maybeSingle();

    if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 500 });
    if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    // 2) Supprimer la room active correspondante (scopée session)
    const { error: delErr, count } = await supabase
        .from("adventure_rooms")
        .delete({ count: "exact" })
        .eq("adventure_id", adventureId)
        .eq("template_id", tpl.id)
        .eq("session_id", session.id); // ✅ important

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
