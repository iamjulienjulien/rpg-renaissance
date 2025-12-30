// src/lib/systemLog/withApiLogContext.ts
import type { NextRequest } from "next/server";
import { withRequestContext } from "@/lib/systemLog/requestContext";

export async function withApiLogContext<T>(
    req: NextRequest,
    handler: () => Promise<T>
): Promise<T> {
    const request_id = req.headers.get("x-request-id") ?? crypto.randomUUID();

    const route = req.nextUrl?.pathname ?? null;
    const method = req.method ?? null;

    return await withRequestContext(
        {
            request_id,
            route,
            method,
            started_at_ms: Date.now(),
        },
        handler
    );
}
