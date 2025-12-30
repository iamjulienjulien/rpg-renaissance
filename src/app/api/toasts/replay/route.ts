// src/app/api/toast/replay/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type DbToast = {
    id: string;
    kind: "achievement" | "system" | "info";
    title: string;
    message: string;
    payload: any;
    status: "unread" | "read" | "dismissed";
    created_at: string;
};

export async function POST() {
    const supabase = await supabaseServer();

    // ✅ Auth obligatoire
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const userId = authData?.user?.id ?? "";
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // 1) récupérer le dernier toast (tous statuts confondus)
    const { data, error } = await supabase
        .from("user_toasts")
        .select("id,kind,title,message,payload,status,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "No toast found" }, { status: 404 });

    const toast = data as DbToast;

    // 2) le remettre en unread (replay) + refresh created_at pour "dernier"
    // NB: created_at est souvent default now() et pas modifiable selon ton schéma.
    // Donc on ne touche PAS created_at. Un replay = status unread.
    const { error: upErr } = await supabase
        .from("user_toasts")
        .update({ status: "unread", read_at: null, dismissed_at: null })
        .eq("id", toast.id)
        .eq("user_id", userId);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // 3) renvoyer le toast (utile pour push direct côté client, sans attendre realtime)
    return NextResponse.json({ ok: true, toast });
}
