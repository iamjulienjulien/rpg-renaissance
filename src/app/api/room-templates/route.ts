import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await supabaseServer();

    const { data, error } = await supabase
        .from("room_templates")
        .select("id, code, title, icon, sort")
        .order("sort", { ascending: true })
        .order("title", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: data ?? [] });
}
