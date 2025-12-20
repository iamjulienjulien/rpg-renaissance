import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

function isNonEmptyString(x: unknown): x is string {
    return typeof x === "string" && x.trim().length > 0;
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const body = await req.json().catch(() => null);

    const adventureId = body?.adventureId;
    const templateCode = body?.templateCode;

    if (!isNonEmptyString(adventureId) || !isNonEmptyString(templateCode)) {
        return NextResponse.json({ error: "Missing adventureId or templateCode" }, { status: 400 });
    }

    // ✅ session active (multi-partie)
    const session = await getActiveSessionOrThrow();

    // 1) Récupérer le template
    const { data: tpl, error: tplErr } = await supabase
        .from("room_templates")
        .select("id, code, title, icon, sort")
        .eq("code", templateCode)
        .maybeSingle();

    if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 500 });
    if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    // 2) Si déjà active pour cette aventure *dans cette session*, on renvoie la room existante
    const { data: existing, error: exErr } = await supabase
        .from("adventure_rooms")
        .select("id, adventure_id, code, title, sort, source, template_id, session_id")
        .eq("adventure_id", adventureId)
        .eq("template_id", tpl.id)
        .eq("session_id", session.id) // ✅ important
        .maybeSingle();

    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
    if (existing) return NextResponse.json({ room: existing, created: false });

    // 3) Créer une room “active” dans l’aventure (scopée session)
    const { data: created, error: insErr } = await supabase
        .from("adventure_rooms")
        .insert({
            session_id: session.id, // ✅ REQUIRED
            adventure_id: adventureId,
            code: tpl.code, // slug stable
            title: tpl.title,
            sort: typeof tpl.sort === "number" ? tpl.sort : 100,
            source: "template",
            template_id: tpl.id,
        })
        .select("id, adventure_id, code, title, sort, source, template_id, session_id")
        .single();

    if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ room: created, created: true }, { status: 201 });
}
