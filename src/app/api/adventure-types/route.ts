import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

type AdventureTypeRow = {
    id: string;
    code: string;
    title: string;
    description: string | null;
    created_at: string;
};

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    await getActiveSessionOrThrow(); // ✅ garde-fou auth/session

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const code = url.searchParams.get("code");

    // ✅ 1) Type par ID
    if (id) {
        const { data, error } = await supabase
            .from("adventure_types")
            .select("id, code, title, description, created_at")
            .eq("id", id)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ adventureType: null });

        return NextResponse.json({ adventureType: data as AdventureTypeRow });
    }

    // ✅ 2) Type par code
    if (code) {
        const { data, error } = await supabase
            .from("adventure_types")
            .select("id, code, title, description, created_at")
            .eq("code", code)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ adventureType: null });

        return NextResponse.json({ adventureType: data as AdventureTypeRow });
    }

    // ✅ 3) Liste
    const { data, error } = await supabase
        .from("adventure_types")
        .select("id, code, title, description, created_at")
        .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ adventureTypes: (data ?? []) as AdventureTypeRow[] });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    await getActiveSessionOrThrow(); // ✅ garde-fou auth/session

    const body = await req.json().catch(() => null);

    const code = safeTrim(body?.code);
    const title = safeTrim(body?.title);
    const description = safeTrim(body?.description) || null;

    if (!code || !title) {
        return NextResponse.json({ error: "Missing code or title" }, { status: 400 });
    }

    // (Optionnel) validation simple du code
    if (!/^[a-z0-9_]+$/.test(code)) {
        return NextResponse.json(
            { error: "Invalid code format (use lowercase letters, digits, underscore)" },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from("adventure_types")
        .insert({ code, title, description })
        .select("id, code, title, description, created_at")
        .single();

    if (error) {
        // unique violation / constraint friendly
        const msg = error.code === "23505" ? "Adventure type code already exists" : error.message;
        return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ adventureType: data as AdventureTypeRow }, { status: 201 });
}
