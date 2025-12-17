import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function isNonEmptyString(x: unknown): x is string {
    return typeof x === "string" && x.trim().length > 0;
}

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const body = await req.json().catch(() => null);

    const adventureId = body?.adventureId;
    const templateCode = body?.templateCode;

    if (!isNonEmptyString(adventureId) || !isNonEmptyString(templateCode)) {
        return NextResponse.json({ error: "Missing adventureId or templateCode" }, { status: 400 });
    }

    // 1) Récupérer le template
    const { data: tpl, error: tplErr } = await supabase
        .from("room_templates")
        .select("id, code, title, icon, sort")
        .eq("code", templateCode)
        .maybeSingle();

    if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 500 });
    if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    // 2) Si déjà active pour cette aventure, on renvoie la room existante
    const { data: existing, error: exErr } = await supabase
        .from("adventure_rooms")
        .select("id, adventure_id, code, title, sort, source, template_id")
        .eq("adventure_id", adventureId)
        .eq("template_id", tpl.id)
        .maybeSingle();

    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
    if (existing) return NextResponse.json({ room: existing, created: false });

    // 3) Créer une room “active” dans l’aventure
    const { data: created, error: insErr } = await supabase
        .from("adventure_rooms")
        .insert({
            adventure_id: adventureId,
            code: tpl.code, // slug stable
            title: tpl.title,
            sort: typeof tpl.sort === "number" ? tpl.sort : 100,
            source: "template",
            template_id: tpl.id,
        })
        .select("id, adventure_id, code, title, sort, source, template_id")
        .single();

    if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ room: created, created: true }, { status: 201 });
}
