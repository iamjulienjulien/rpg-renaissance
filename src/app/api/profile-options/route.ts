import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = await supabaseServer();

    const { searchParams } = new URL(req.url);
    const fieldKey = searchParams.get("field");

    let query = supabase
        .from("profile_option_refs")
        .select(
            `
            id,
            field_key,
            value_key,
            label,
            emoji,
            description,
            sort_order
        `
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    if (fieldKey) {
        query = query.eq("field_key", fieldKey);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ------------------------------------------------------------------
    // Group by field_key for frontend convenience
    // ------------------------------------------------------------------
    const grouped = (data ?? []).reduce<Record<string, any[]>>((acc, row) => {
        acc[row.field_key] ??= [];
        acc[row.field_key].push(row);
        return acc;
    }, {});

    return NextResponse.json({
        options: grouped,
    });
}
