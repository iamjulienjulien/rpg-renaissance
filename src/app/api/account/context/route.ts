import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* ============================================================================
🧠 TYPES
============================================================================ */

type UserContextRow = {
    context_self: string | null;
    context_family: string | null;
    context_home: string | null;
    context_routine: string | null;
    context_challenges: string | null;
};

const ALLOWED_FIELDS: Array<keyof UserContextRow> = [
    "context_self",
    "context_family",
    "context_home",
    "context_routine",
    "context_challenges",
];

/* ============================================================================
🧰 HELPERS
============================================================================ */

function pickAllowed(body: any): Partial<UserContextRow> {
    const out: Partial<UserContextRow> = {};

    for (const key of ALLOWED_FIELDS) {
        if (!(key in (body ?? {}))) continue;

        const v = body[key];

        if (v === null) {
            out[key] = null;
            continue;
        }

        if (typeof v === "string") {
            const trimmed = v.trim();
            out[key] = trimmed.length ? trimmed : null;
            continue;
        }
    }

    return out;
}

/* ============================================================================
🧰 GET
============================================================================ */

export async function GET() {
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const user = auth?.user ?? null;
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
        .from("user_contexts")
        .select("context_self, context_family, context_home, context_routine, context_challenges")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        context: (data ?? {
            context_self: null,
            context_family: null,
            context_home: null,
            context_routine: null,
            context_challenges: null,
        }) as UserContextRow,
    });
}

/* ============================================================================
🧰 PATCH
============================================================================ */

export async function PATCH(req: Request) {
    const supabase = await supabaseServer();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const user = auth?.user ?? null;
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const patch = pickAllowed(body);

    if (!Object.keys(patch).length) {
        return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const payload = {
        user_id: user.id,
        ...patch,
    };

    const { data, error } = await supabase
        .from("user_contexts")
        .upsert(payload, { onConflict: "user_id" })
        .select("context_self, context_family, context_home, context_routine, context_challenges")
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ context: data, updated: true });
}
