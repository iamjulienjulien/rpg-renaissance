import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);

    const id = url.searchParams.get("id");

    // 🎯 CAS 1 — aventure ciblée
    if (id) {
        const { data, error } = await supabase
            .from("adventures")
            .select("id, code, title, description, created_at")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: "Adventure not found" }, { status: 404 });
        }

        return NextResponse.json({ adventure: data });
    }

    // 📜 CAS 2 — comportement existant (liste complète)
    const { data, error } = await supabase
        .from("adventures")
        .select("id, code, title, description, created_at")
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ adventures: data ?? [] });
}
