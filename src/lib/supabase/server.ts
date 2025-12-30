import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { patchRequestContext } from "@/lib/systemLog/requestContext";

export async function supabaseServer() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const cookieStore = await cookies();

    const supabase = createServerClient(url, anon, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                } catch {
                    // OK: certains contextes (server components) peuvent être read-only
                }
            },
        },
    });

    // ✅ Auto-injection user_id dans le request context (best-effort, jamais bloquant)
    try {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id ?? null;
        if (userId) patchRequestContext({ user_id: userId });
    } catch {
        // ignore
    }

    return supabase;
}
