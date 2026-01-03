// src/app/api/renown-levels/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RenownLevelRow = {
    level: number;
    tier: number;
    tier_title: string;
    level_suffix: string | null;
    full_title: string;
    is_milestone: boolean;
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

    const levelRaw = url.searchParams.get("level");
    const tierRaw = url.searchParams.get("tier");
    const milestonesRaw = url.searchParams.get("milestones");

    const level = levelRaw ? Number(levelRaw) : null;
    const tier = tierRaw ? Number(tierRaw) : null;
    const milestonesOnly = milestonesRaw === "1" || milestonesRaw === "true";

    const supabase = await supabaseAdmin();

    // ─────────────────────────────────────────────────────────────
    // Single level
    // ─────────────────────────────────────────────────────────────
    if (level !== null) {
        if (!Number.isFinite(level) || level < 1 || level > 100) {
            return json({ error: "Invalid level (1–100)" }, 400);
        }

        const { data, error } = await supabase
            .from("renown_levels_catalog")
            .select("level,tier,tier_title,level_suffix,full_title,is_milestone,created_at")
            .eq("level", level)
            .maybeSingle();

        if (error) {
            return json({ error: error.message }, 500);
        }

        if (!data) {
            return json({ error: "Renown level not found" }, 404);
        }

        return json({ level: data as RenownLevelRow }, 200);
    }

    // ─────────────────────────────────────────────────────────────
    // List levels
    // ─────────────────────────────────────────────────────────────
    let query = supabase
        .from("renown_levels_catalog")
        .select("level,tier,tier_title,level_suffix,full_title,is_milestone,created_at")
        .order("level", { ascending: true });

    if (tier !== null) {
        if (!Number.isFinite(tier) || tier < 1 || tier > 10) {
            return json({ error: "Invalid tier (1–10)" }, 400);
        }
        query = query.eq("tier", tier);
    }

    if (milestonesOnly) {
        query = query.eq("is_milestone", true);
    }

    const { data, error } = await query;

    if (error) {
        return json({ error: error.message }, 500);
    }

    return json(
        {
            levels: (data ?? []) as RenownLevelRow[],
            meta: {
                tier: tier ?? null,
                milestonesOnly,
            },
        },
        200
    );
}
