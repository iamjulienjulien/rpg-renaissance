import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function safeTrim(x: unknown) {
    return typeof x === "string" ? x.trim() : "";
}

export async function GET() {
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!auth?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // dernier chapitre
    const { data: ch, error: chErr } = await supabase
        .from("chapters")
        .select("id, context_text")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });

    return NextResponse.json({
        chapter_id: ch?.id ?? null,
        context_text: ch?.context_text ?? "",
    });
}

export async function PATCH(req: Request) {
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!auth?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const context_text = safeTrim(body?.context_text).slice(0, 1200); // garde une limite simple

    // dernier chapitre
    const { data: ch, error: chErr } = await supabase
        .from("chapters")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });
    if (!ch?.id) return NextResponse.json({ error: "No chapter" }, { status: 400 });

    const { error: upErr } = await supabase
        .from("chapters")
        .update({ context_text })
        .eq("id", ch.id);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, chapter_id: ch.id, context_text });
}
