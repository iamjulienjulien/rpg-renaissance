import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Ctx = {
    params: Promise<{ id: string }>;
};

function extractId(req: Request, params?: { id?: string }) {
    const fromParams = params?.id ? decodeURIComponent(params.id).trim() : "";

    if (fromParams && fromParams !== "undefined" && fromParams !== "null") {
        return fromParams;
    }

    // Fallback: parse l'URL (utile si params est vide)
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    const fromPath = decodeURIComponent(last).trim();

    if (!fromPath || fromPath === "undefined" || fromPath === "null") {
        return "";
    }

    return fromPath;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json(
            {
                error: "Invalid quest id",
                debug: {
                    pathname: new URL(req.url).pathname,
                },
            },
            { status: 400 }
        );
    }

    const supabase = supabaseServer();
    const body = await req.json().catch(() => null);

    const update: Record<string, unknown> = {};

    if (typeof body?.title === "string") update.title = body.title.trim();
    if (typeof body?.description === "string" || body?.description === null)
        update.description = body.description;
    if (typeof body?.status === "string") update.status = body.status;
    if (typeof body?.priority === "number") update.priority = body.priority;

    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from("quests")
        .update(update)
        .eq("id", id)
        .select("id,title,description,status,priority,chapter_id,created_at,updated_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Journal auto: uniquement si status change
    if (typeof body?.status === "string") {
        const status = body.status;

        if (status === "done") {
            await supabase.from("journal_entries").insert({
                kind: "quest_done",
                title: `✅ Quête accomplie: ${data.title}`,
                content: "Une action de plus gravée dans le récit.",
                chapter_id: data.chapter_id ?? null,
                quest_id: data.id,
            });
        }

        if (status === "todo") {
            await supabase.from("journal_entries").insert({
                kind: "quest_reopened",
                title: `↩️ Quête réouverte: ${data.title}`,
                content: "Retour sur la carte. Rien n’est perdu.",
                chapter_id: data.chapter_id ?? null,
                quest_id: data.id,
            });
        }
    }

    return NextResponse.json({ quest: data });
}

export async function DELETE(req: NextRequest, context: Ctx) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json(
            {
                error: "Invalid quest id",
                debug: {
                    pathname: new URL(req.url).pathname,
                },
            },
            { status: 400 }
        );
    }

    const supabase = supabaseServer();

    const { error } = await supabase.from("quests").delete().eq("id", id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
