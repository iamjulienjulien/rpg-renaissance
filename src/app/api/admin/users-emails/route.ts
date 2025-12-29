import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

/* ============================================================================
🔐 SERVICE ROLE CLIENT (admin only)
============================================================================ */

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ server-only
    {
        auth: { persistSession: false },
    }
);

/* ============================================================================
📄 GET /api/admin/users-emails
============================================================================ */

export async function GET(req: Request) {
    // 1) Auth utilisateur classique
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    // 2) Vérifier admin
    const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin").single();

    if (adminErr || !isAdmin) {
        return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    }

    // 3) Pagination
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    // 4) Fetch users depuis auth.users
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: Math.floor(offset / limit) + 1,
        perPage: limit,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users = (data.users ?? []).map((u) => ({
        user_id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
    }));

    return NextResponse.json({
        rows: users,
        count: data.total ?? null,
        limit,
        offset,
    });
}
