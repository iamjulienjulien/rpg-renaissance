// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    // ✅ NEW: request id (propagé requête -> réponse)
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    res.headers.set("x-request-id", requestId);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(url, anon, {
        cookies: {
            getAll() {
                return req.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    res.cookies.set(name, value, options);
                });
            },
        },
    });

    // IMPORTANT: déclenche la lecture/refresh de session si besoin
    await supabase.auth.getUser();

    return res;
}

export const config = {
    matcher: [
        /*
            Applique partout sauf assets.
        */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
