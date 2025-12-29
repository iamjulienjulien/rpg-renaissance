import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();
    const body = await req.json().catch(() => null);

    const position = Number(body?.position);
    if (!Number.isInteger(position) || position < 1) {
        return NextResponse.json({ error: "Invalid position" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("quest_chain_items")
        .update({ position })
        .eq("id", ctx.params.id)
        .eq("session_id", session.id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ item: data });
}
