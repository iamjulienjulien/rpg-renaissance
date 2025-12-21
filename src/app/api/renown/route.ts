import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type RenownRow = { value: number; level: number };

export async function GET(req: Request) {
    const supabase = await supabaseServer();

    // ✅ Auth obligatoire
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const userId = authData?.user?.id;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
        return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const { data: row, error } = await supabase
        .from("player_renown")
        .select("value, level")
        .eq("user_id", userId)
        .eq("session_id", sessionId)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
        { renown: (row as RenownRow | null) ?? { value: 0, level: 1 } },
        { status: 200 }
    );
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();

    // ✅ Auth obligatoire
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const userId = authData?.user?.id;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Body
    const body = await req.json().catch(() => null);
    const sessionId = body?.session_id as string | undefined;
    const amountRaw = body?.amount;

    if (!sessionId) {
        return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount)) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // On autorise amount négatif si tu veux gérer des malus.
    // Si tu veux interdire les négatifs: if (amount <= 0) -> 400
    const safeAmount = Math.trunc(amount);

    try {
        // ✅ Appelle ta fonction SQL (RPC)
        // ⚠️ Adapte les noms d'args si ta fonction utilise d'autres paramètres
        const { data: rpcData, error: rpcErr } = await supabase.rpc("add_renown", {
            p_session_id: sessionId,
            p_amount: safeAmount,
        });

        if (rpcErr) {
            return NextResponse.json({ error: rpcErr.message }, { status: 400 });
        }

        // Selon comment tu as écrit add_renown, rpcData peut être:
        // - une row { value, level }
        // - ou un array
        const renown = Array.isArray(rpcData)
            ? (rpcData[0] as RenownRow | undefined)
            : (rpcData as RenownRow);

        // Si ta fonction ne retourne rien, on relit la table
        if (!renown) {
            const { data: row, error } = await supabase
                .from("player_renown")
                .select("value, level")
                .eq("user_id", userId)
                .eq("session_id", sessionId)
                .maybeSingle();

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

            return NextResponse.json(
                { renown: (row as RenownRow | null) ?? { value: 0, level: 1 }, delta: safeAmount },
                { status: 200 }
            );
        }

        return NextResponse.json({ renown, delta: safeAmount }, { status: 200 });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Unexpected error" },
            { status: 500 }
        );
    }
}
