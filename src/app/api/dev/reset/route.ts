import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Forbidden in production" }, { status: 403 });
    }

    const token = req.headers.get("x-dev-reset-token") ?? "";
    const expected = process.env.DEV_RESET_TOKEN ?? "";

    if (!expected || token !== expected) {
        return NextResponse.json({ error: "Invalid reset token" }, { status: 401 });
    }

    const supabase = await supabaseServer();

    const { error } = await supabase.rpc("reset_game");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
