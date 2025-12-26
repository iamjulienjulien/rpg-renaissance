// app/api/adventures/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";

function makeInstanceCode(typeCode: string) {
    const base = (typeCode || "adventure")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40);

    const rand = Math.random().toString(16).slice(2, 8);
    return `${base}-${rand}`;
}

// ✅ normalise une relation Supabase qui peut être typée comme T[]
function one<T>(rel: T | T[] | null | undefined): T | null {
    if (!rel) return null;
    return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

const selectWithType = `
    id,
    title,
    description,
    created_at,
    instance_code,
    context_text,
    type_id,
    adventure_types:type_id (
        code,
        title,
        description
    )
`;

function mapAdventure(row: any) {
    if (!row) return row;

    const type = one(row?.adventure_types);
    const { adventure_types, ...rest } = row;

    return {
        ...rest,
        type_code: type?.code ?? null,
        type_title: type?.title ?? null,
    };
}

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const instance_code = url.searchParams.get("instance_code");

    // 🎯 CAS 1 — aventure ciblée par ID
    if (id) {
        const { data, error } = await supabase
            .from("adventures")
            .select(selectWithType)
            .eq("id", id)
            .eq("session_id", session.id)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ error: "Adventure not found" }, { status: 404 });

        return NextResponse.json({ adventure: mapAdventure(data) });
    }

    // 🎯 CAS 1bis — aventure ciblée par instance_code ✅
    if (instance_code) {
        const { data, error } = await supabase
            .from("adventures")
            .select(selectWithType)
            .eq("instance_code", instance_code)
            .eq("session_id", session.id)
            .maybeSingle();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ error: "Adventure not found" }, { status: 404 });

        return NextResponse.json({ adventure: mapAdventure(data) });
    }

    // 📜 CAS 2 — liste de la session
    const { data, error } = await supabase
        .from("adventures")
        .select(selectWithType)
        .eq("session_id", session.id)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ adventures: (data ?? []).map(mapAdventure) });
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const body = await req.json().catch(() => null);

    const type_code = typeof body?.type_code === "string" ? body.type_code.trim() : "";
    const titleInput = typeof body?.title === "string" ? body.title.trim() : "";
    const instance_code_input =
        typeof body?.instance_code === "string" ? body.instance_code.trim() : "";

    if (!type_code) {
        return NextResponse.json({ error: "Missing type_code" }, { status: 400 });
    }

    // 1) Résoudre le type
    const { data: typeRow, error: typeErr } = await supabase
        .from("adventure_types")
        .select("id, code, title, description")
        .eq("code", type_code)
        .maybeSingle();

    if (typeErr) return NextResponse.json({ error: typeErr.message }, { status: 500 });
    if (!typeRow) return NextResponse.json({ error: "Adventure type not found" }, { status: 404 });

    // 2) Construire l’instance
    const instance_code = instance_code_input || makeInstanceCode(type_code);
    const title = titleInput || typeRow.title;
    const description = typeRow.description ?? null;

    // 3) Insert instance
    const { data: created, error: insErr } = await supabase
        .from("adventures")
        .insert({
            session_id: session.id,
            type_id: typeRow.id,
            title,
            description,
            instance_code,
        })
        .select(
            `
            id,
            title,
            description,
            created_at,
            instance_code,
            type_id,
            adventure_types:type_id ( code, title )
        `
        )
        .single();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    const type = one(created?.adventure_types);

    const adventure = {
        id: created.id,
        title: created.title,
        description: created.description,
        created_at: created.created_at,
        instance_code: created.instance_code,
        type_id: created.type_id,
        type_code: type?.code ?? null,
        type_title: type?.title ?? null,
    };

    return NextResponse.json({ adventure }, { status: 201 });
}

export async function PATCH(req: Request) {
    const supabase = await supabaseServer();
    const session = await getActiveSessionOrThrow();

    const body = await req.json().catch(() => null);

    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const instance_code = typeof body?.instance_code === "string" ? body.instance_code.trim() : "";

    const rawContext =
        typeof body?.context_text === "string"
            ? body.context_text
            : body?.context_text === null
              ? null
              : "";

    const context_text =
        rawContext === null ? null : rawContext.trim().length ? rawContext.trim() : null;

    if (!id && !instance_code) {
        return NextResponse.json({ error: "Missing id or instance_code" }, { status: 400 });
    }

    const q = supabase.from("adventures").update({ context_text }).eq("session_id", session.id);

    const { data, error } = await (id ? q.eq("id", id) : q.eq("instance_code", instance_code))
        .select("id, instance_code, context_text")
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Adventure not found" }, { status: 404 });

    return NextResponse.json({ adventure: data });
}
