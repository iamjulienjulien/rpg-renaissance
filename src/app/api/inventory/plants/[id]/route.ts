// src/app/api/inventory/plants/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

import { getPlantById, patchPlantItem } from "@/lib/inventory/plants/plantsRepo";

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
    const timer = Log.timer("api.inventory.plants.[id].GET", {
        source: "src/app/api/inventory/plants/[id]/route.ts",
    });

    const supabase = await supabaseServer();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData?.user?.id) {
        timer.endError("auth", authErr ?? undefined, { status_code: 401 });
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authData.user.id;
    patchRequestContext({ user_id: userId });

    const { id } = await context.params;
    const itemId = safeTrim(id);

    if (!itemId) {
        timer.endError("bad_input", undefined, { status_code: 400 });
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    try {
        const result = await getPlantById({ user_id: userId, id: itemId });
        if (!result.item) {
            timer.endSuccess("not_found", { status_code: 404 });
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        timer.endSuccess("ok", { status_code: 200 });
        return NextResponse.json(result, { status: 200 });
    } catch (e: any) {
        const msg = e?.message ? String(e.message) : "Get failed";
        timer.endError("failed", e, { status_code: 500 });
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const timer = Log.timer("api.inventory.plants.[id].PATCH", {
        source: "src/app/api/inventory/plants/[id]/route.ts",
    });

    const supabase = await supabaseServer();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData?.user?.id) {
        timer.endError("auth", authErr ?? undefined, { status_code: 401 });
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authData.user.id;
    patchRequestContext({ user_id: userId });

    const { id } = await context.params;
    const itemId = safeTrim(id);
    if (!itemId) {
        timer.endError("bad_input", undefined, { status_code: 400 });
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    let body: any = null;
    try {
        body = await req.json();
    } catch {
        timer.endError("bad_json", undefined, { status_code: 400 });
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const title = body?.title ?? undefined;
    const ai_description = body?.ai_description ?? undefined;
    const data = body?.data ?? undefined;

    try {
        await patchPlantItem({
            user_id: userId,
            id: itemId,
            title,
            ai_description,
            data,
        });

        timer.endSuccess("ok", { status_code: 200 });
        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e: any) {
        const msg = e?.message ? String(e.message) : "Patch failed";
        timer.endError("failed", e, { status_code: 500 });
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
