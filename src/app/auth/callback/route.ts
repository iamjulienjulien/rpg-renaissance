// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            return NextResponse.redirect(
                new URL(`/auth/signin?error=${encodeURIComponent(error.message)}`, url.origin)
            );
        }
    }

    // ✅ Toujours "/" -> décidera public vs privé
    return NextResponse.redirect(new URL("/", url.origin));
}
