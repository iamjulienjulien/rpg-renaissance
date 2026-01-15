// src/app/api/admin/list-contacts/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getActiveSessionOrThrow } from "@/lib/sessions/getActiveSession";
import { Resend } from "resend";

type ResendContact = {
    id: string;
    email: string;
    unsubscribed: boolean;
    created_at?: string;
    updated_at?: string;
    properties?: Record<string, unknown>;
};

type ContactRow = {
    id: string;
    email: string;
    status: "subscribed" | "unsubscribed";
    created_at: string | null;
    updated_at: string | null;
    // On garde les properties brutes (utm, locale, landing_path, etc.)
    properties: Record<string, unknown> | null;
};

function safeTrim(x: unknown): string {
    return typeof x === "string" ? x.trim() : "";
}

function clampInt(v: any, def: number, min: number, max: number) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, Math.floor(n)));
}

function getResend() {
    const apiKey = safeTrim(process.env.RESEND_API_KEY);
    if (!apiKey) throw new Error("Missing env: RESEND_API_KEY");
    return new Resend(apiKey);
}

function getSegmentId() {
    const id = safeTrim(process.env.RESEND_SEGMENT_ID);
    if (!id) throw new Error("Missing env: RESEND_SEGMENT_ID");
    return id;
}

// Tente de normaliser les formats de réponse du SDK (selon versions)
function extractContacts(payload: any): ResendContact[] {
    // cas: { data: { data: [...] } } ou { data: [...] }

    const d = payload?.data;
    console.log("d", d);
    if (Array.isArray(d)) return d as ResendContact[];
    if (Array.isArray(d?.data)) return d.data as ResendContact[];
    if (Array.isArray(d?.contacts)) return d.contacts as ResendContact[];
    return [];
}

export async function GET(req: NextRequest) {
    // ✅ TODO: remplace par un vrai guard admin
    await getActiveSessionOrThrow();

    const { searchParams } = new URL(req.url);

    // Search (email)
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();

    // Pagination
    const limit = clampInt(searchParams.get("limit"), 50, 1, 100);
    const offset = clampInt(searchParams.get("offset"), 0, 0, 1_000_000);

    // Cursor (si l’API Resend le supporte sur cet endpoint)
    const cursor = safeTrim(searchParams.get("cursor")) || null;

    try {
        const resend = getResend();
        const segmentId = getSegmentId();

        // -----------------------------------------------------------------
        // 1) LIST contacts in segment
        // -----------------------------------------------------------------
        // NOTE:
        // La doc montre: resend.contacts.segments.list({ id })
        // Selon versions, ça peut renvoyer tous les contacts du segment.
        // Si un jour Resend ajoute cursor/limit, tu pourras les passer ici.
        const { data, error } = await resend.contacts.list({ segmentId });

        if (error) {
            return NextResponse.json({ error: error.message, test: segmentId }, { status: 500 });
        }
        // return NextResponse.json({ data, test: segmentId }, { status: 200 });
        const all = extractContacts({ data });

        // -----------------------------------------------------------------
        // 2) Filter + paginate server-side (fallback)
        // -----------------------------------------------------------------
        const filtered = q ? all.filter((c) => (c.email ?? "").toLowerCase().includes(q)) : all;

        const slice = filtered.slice(offset, offset + limit);

        const rows: ContactRow[] = slice.map((c) => ({
            id: String(c.id),
            email: String(c.email),
            status: c.unsubscribed ? "unsubscribed" : "subscribed",
            created_at: c.created_at ? String(c.created_at) : null,
            updated_at: c.updated_at ? String(c.updated_at) : null,
            properties: (c.properties as Record<string, unknown>) ?? null,
        }));

        return NextResponse.json({
            rows,
            count: filtered.length, // vrai count après filtre (fallback local)
            limit,
            offset,

            // Si tu veux gérer un mode cursor plus tard:
            cursor: cursor ?? null,
            has_more: offset + limit < filtered.length,
        });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Server error" },
            { status: 500 }
        );
    }
}
