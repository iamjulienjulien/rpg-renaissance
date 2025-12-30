import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const { data: auth, error: aErr } = await supabase.auth.getUser();
    if (aErr || !auth?.user?.id)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabase
        .from("user_toasts")
        .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", auth.user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
