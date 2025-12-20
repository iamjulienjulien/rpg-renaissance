import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const { data, error } = await supabase
        .from("adventures")
        .select("id,code,title,description,created_at")
        .eq("code", code)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Adventure not found" }, { status: 404 });

    return NextResponse.json({ adventure: data });
}
