import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await supabaseServer();

    const { data, error } = await supabase
        .from("characters")
        .select("id,code,name,emoji,kind,archetype,vibe,motto,ai_style,is_enabled,sort")
        .eq("is_enabled", true)
        .order("sort", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ characters: data ?? [] });
}
