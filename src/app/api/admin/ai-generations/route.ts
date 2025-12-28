// src/app/api/admin/ai-generations/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function safeInt(x: string | null, fallback: number) {
    const n = Number(x);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/* ============================================================================
📡 GET
============================================================================
- If `id` is provided -> return one full row
- Else -> list with filters + pagination
============================================================================ */

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);

    const id = safeTrim(url.searchParams.get("id"));

    // ✅ Single row (full payload)
    if (id) {
        const { data, error } = await supabase
            .from("ai_generations")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({ row: data });
    }

    // ✅ List mode
    const q = safeTrim(url.searchParams.get("q"));
    const type = safeTrim(url.searchParams.get("type"));
    const status = safeTrim(url.searchParams.get("status"));
    const model = safeTrim(url.searchParams.get("model"));

    const limit = safeInt(url.searchParams.get("limit"), 25);
    const offset = safeInt(url.searchParams.get("offset"), 0);

    let query = supabase
        .from("ai_generations")
        .select(
            `
            id,
            created_at,
            session_id,
            user_id,
            generation_type,
            source,
            provider,
            model,
            status,
            duration_ms,
            error_message,
            error_code,
            chapter_quest_id,
            chapter_id,
            adventure_id
        `,
            { count: "exact" }
        )
        .order("created_at", { ascending: false });

    if (type) query = query.eq("generation_type", type);
    if (model) query = query.eq("model", model);
    if (status === "success" || status === "error") query = query.eq("status", status);

    if (q) {
        query = query.or(
            [
                `id.ilike.%${q}%`,
                `session_id.ilike.%${q}%`,
                `user_id.ilike.%${q}%`,
                `adventure_id.ilike.%${q}%`,
                `chapter_id.ilike.%${q}%`,
                `chapter_quest_id.ilike.%${q}%`,
            ].join(",")
        );
    }

    query = query.range(offset, offset + Math.min(limit, 200) - 1);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        rows: data ?? [],
        count: count ?? null,
        limit,
        offset,
    });
}
