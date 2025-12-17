import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
    const supabase = supabaseServer();

    const { data, error } = await supabase
        .from("adventures")
        .select("id,code,title,description,created_at")
        .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ adventures: data ?? [] });
}
