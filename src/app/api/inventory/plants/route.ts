// src/app/api/inventory/plants/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

import { createPlantItem, listPlants } from "@/lib/inventory/plants/plantsRepo";
import { validatePlantDraftV1 } from "@/lib/inventory/schemas/plants/v1";

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

export async function GET(req: Request) {
    const timer = Log.timer("api.inventory.plants.GET", {
        source: "src/app/api/inventory/plants/route.ts",
    });

    const supabase = await supabaseServer();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData?.user?.id) {
        timer.endError("auth", authErr ?? undefined, { status_code: 401 });
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authData.user.id;
    patchRequestContext({ user_id: userId });

    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    const limit = Number(url.searchParams.get("limit") ?? "24");
    const offset = Number(url.searchParams.get("offset") ?? "0");

    try {
        const result = await listPlants({
            user_id: userId,
            q,
            limit: Number.isFinite(limit) ? limit : 24,
            offset: Number.isFinite(offset) ? offset : 0,
        });

        timer.endSuccess("ok", { status_code: 200 });
        return NextResponse.json(result, { status: 200 });
    } catch (e: any) {
        const msg = e?.message ? String(e.message) : "List failed";
        timer.endError("failed", e, { status_code: 500 });
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const timer = Log.timer("api.inventory.plants.POST", {
        source: "src/app/api/inventory/plants/route.ts",
    });

    const supabase = await supabaseServer();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData?.user?.id) {
        timer.endError("auth", authErr ?? undefined, { status_code: 401 });
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authData.user.id;
    patchRequestContext({ user_id: userId });

    let body: any = null;
    try {
        body = await req.json();
    } catch {
        timer.endError("bad_json", undefined, { status_code: 400 });
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const photo_id = safeTrim(body?.photo_id);
    const draft = body?.draft;

    if (!photo_id || !draft) {
        timer.endError("bad_input", undefined, { status_code: 400 });
        return NextResponse.json({ error: "Missing photo_id or draft" }, { status: 400 });
    }

    const validation = validatePlantDraftV1(draft);
    if (!validation.ok || !validation.data) {
        timer.endError("invalid_draft", undefined, { status_code: 400 });
        return NextResponse.json(
            { error: "Invalid draft", details: validation.errors ?? [] },
            { status: 400 }
        );
    }

    try {
        const created = await createPlantItem({
            user_id: userId,
            photo_id,
            draft: validation.data,
        });

        timer.endSuccess("ok", { status_code: 201 });
        return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
        const msg = e?.message ? String(e.message) : "Create failed";
        timer.endError("failed", e, { status_code: 500 });
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
