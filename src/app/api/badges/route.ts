// src/app/api/badges/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type BadgeCatalogRow = {
    id: string;
    code: string;
    title: string;
    emoji: string | null;
    description: string | null;
    created_at: string;
};

function json(data: any, status = 200) {
    return NextResponse.json(data, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
    const url = new URL(req.url);

    const code = (url.searchParams.get("code") ?? "").trim();
    const q = (url.searchParams.get("q") ?? "").trim();
    const limitRaw = url.searchParams.get("limit");
    const limit = clamp(Number(limitRaw ?? 200), 1, 500);

    const supabase = await supabaseAdmin();

    // ─────────────────────────────────────────────────────────────
    // Single badge by code
    // ─────────────────────────────────────────────────────────────
    if (code) {
        const { data, error } = await supabase
            .from("achievement_badges_catalog")
            .select("id,code,title,emoji,description,created_at")
            .eq("code", code)
            .maybeSingle();

        if (error) {
            return json({ error: error.message }, 500);
        }

        if (!data) {
            return json({ error: "Badge not found" }, 404);
        }

        return json({ badge: data as BadgeCatalogRow }, 200);
    }

    // ─────────────────────────────────────────────────────────────
    // List badges (optional search)
    // ─────────────────────────────────────────────────────────────
    let query = supabase
        .from("achievement_badges_catalog")
        .select("id,code,title,emoji,description,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

    // search simple (title/code/description)
    if (q) {
        // ilike OR: "col.ilike.%q%"
        const s = q.replaceAll("%", "\\%").replaceAll("_", "\\_");
        query = query.or(`code.ilike.%${s}%,title.ilike.%${s}%,description.ilike.%${s}%`);
    }

    const { data, error } = await query;

    if (error) {
        return json({ error: error.message }, 500);
    }

    return json(
        {
            badges: (data ?? []) as BadgeCatalogRow[],
            meta: {
                limit,
                q: q || null,
            },
        },
        200
    );
}
