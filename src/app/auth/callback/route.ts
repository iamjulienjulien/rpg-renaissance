// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const supabase = await supabaseServer(); // ✅ await indispensable
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            return NextResponse.redirect(
                new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
            );
        }
    }

    return NextResponse.redirect(new URL("/", url.origin));
}
