// src/app/api/inventory/plants/prefill/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { Log } from "@/lib/systemLog/Log";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

import { generatePlantPrefillFromPhoto } from "@/lib/inventory/plants/generatePlantPrefillFromPhoto";

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

export async function POST(req: Request) {
    const timer = Log.timer("api.inventory.plants.prefill.POST", {
        source: "src/app/api/inventory/plants/prefill/route.ts",
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
    const photo_signed_url = safeTrim(body?.photo_signed_url);
    const photo_caption = body?.photo_caption ?? null;

    if (!photo_id || !photo_signed_url) {
        timer.endError("bad_input", undefined, { status_code: 400 });
        return NextResponse.json(
            { error: "Missing photo_id or photo_signed_url" },
            { status: 400 }
        );
    }

    try {
        const result = await generatePlantPrefillFromPhoto({
            photo_id,
            photo_signed_url,
            photo_caption,
        });

        timer.endSuccess("ok", { status_code: 200 });
        return NextResponse.json(result, { status: 200 });
    } catch (e: any) {
        const msg = e?.message ? String(e.message) : "Prefill failed";
        Log.error("api.inventory.plants.prefill.error", e, { metadata: { photo_id } });
        timer.endError("failed", e, { status_code: 500 });
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
