import { AsyncLocalStorage } from "node:async_hooks";

export type RequestLogContext = {
    request_id: string;

    route?: string | null;
    method?: string | null;

    session_id?: string | null;
    user_id?: string | null;

    chapter_id?: string | null;
    adventure_id?: string | null;
    chapter_quest_id?: string | null;
    adventure_quest_id?: string | null;
    trace_id?: string | null;

    started_at_ms?: number | null;
};

const als = new AsyncLocalStorage<RequestLogContext>();

export async function withRequestContext<T>(
    ctx: RequestLogContext,
    fn: () => Promise<T>
): Promise<T> {
    return await als.run(ctx, fn);
}

export function getRequestContext(): RequestLogContext | null {
    return als.getStore() ?? null;
}

/**
 * ✅ Permet d'ajouter user_id/session_id plus tard (quand on les connaît).
 * ALS stocke une référence: on peut muter l'objet de manière safe par requête.
 */
export function patchRequestContext(patch: Partial<RequestLogContext>) {
    const store = als.getStore();
    if (!store) return;

    for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;
        (store as any)[k] = v;
    }
}
