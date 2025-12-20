import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const userId = auth.user?.id ?? "";
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // 1) Session active
    const { data: active, error: aErr } = await supabase
        .from("game_sessions")
        .select("id,title,is_active,status,created_at,updated_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
    if (active) return NextResponse.json({ session: active });

    // 2) Sinon la plus récente (si tu veux “reprendre” automatiquement)
    const { data: latest, error: lErr } = await supabase
        .from("game_sessions")
        .select("id,title,is_active,status,created_at,updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

    return NextResponse.json({ session: latest ?? null });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const userId = auth.user?.id ?? "";
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "create") {
        const title =
            typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Ma partie";

        // Désactive toutes les sessions
        const { error: offErr } = await supabase
            .from("game_sessions")
            .update({ is_active: false })
            .eq("user_id", userId);

        if (offErr) return NextResponse.json({ error: offErr.message }, { status: 500 });

        // Crée + active
        const { data: session, error: cErr } = await supabase
            .from("game_sessions")
            .insert({
                user_id: userId,
                title,
                is_active: true,
                status: "active",
            })
            .select("id,title,is_active,status,created_at,updated_at")
            .single();

        if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

        return NextResponse.json({ session }, { status: 201 });
    }

    if (action === "activate") {
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
        if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

        // Désactive toutes les sessions
        const { error: offErr } = await supabase
            .from("game_sessions")
            .update({ is_active: false })
            .eq("user_id", userId);

        if (offErr) return NextResponse.json({ error: offErr.message }, { status: 500 });

        // Active celle demandée (et vérifie qu’elle appartient au user)
        const { data: session, error: onErr } = await supabase
            .from("game_sessions")
            .update({ is_active: true })
            .eq("id", sessionId)
            .eq("user_id", userId)
            .select("id,title,is_active,status,created_at,updated_at")
            .maybeSingle();

        if (onErr) return NextResponse.json({ error: onErr.message }, { status: 500 });
        if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

        return NextResponse.json({ session }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
