// src/lib/qstash/publish.ts
import { Log } from "@/lib/systemLog/Log";

/* ============================================================================
🧰 HELPERS
============================================================================ */

function msSince(t0: number) {
    return Math.max(0, Date.now() - t0);
}

function safeUrl(url: string) {
    // évite de logger des querystrings sensibles
    try {
        const u = new URL(url);
        u.search = "";
        u.hash = "";
        return u.toString();
    } catch {
        return url;
    }
}

function jsonByteLength(x: any) {
    try {
        return new TextEncoder().encode(JSON.stringify(x)).length;
    } catch {
        return null;
    }
}

/* ============================================================================
QStash publish
============================================================================ */

export async function qstashPublishJSON(input: {
    url: string;
    body: any;
    deduplicationId?: string;
}) {
    const startedAt = Date.now();
    const t = Log.timer("qstash.publish_json", { source: "lib/qstash/publish.ts" });

    const token = process.env.QSTASH_TOKEN;
    if (!token) {
        const err = new Error("Missing env QSTASH_TOKEN");
        Log.error("qstash.publish_json.missing_token", err, {
            status_code: 500,
            metadata: {
                url: safeUrl(input.url),
                deduplication_id: input.deduplicationId ?? null,
            },
        });
        t.endError("qstash.publish_json.missing_token", err, { status_code: 500 });
        throw err;
    }

    const dest = String(input.url ?? "").trim();

    if (!/^https?:\/\//i.test(dest)) {
        throw new Error(`Invalid destination url (missing scheme): "${dest}"`);
    }

    // ✅ DO NOT encodeURIComponent(dest)
    const publishUrl = `https://qstash.upstash.io/v2/publish/${dest}`;

    const payloadBytes = jsonByteLength(input.body);

    Log.debug("qstash.publish_json.start", {
        metadata: {
            url: safeUrl(input.url),
            publish_url: "https://qstash.upstash.io/v2/publish/<encoded>",
            deduplication_id: input.deduplicationId ?? null,
            payload_bytes: payloadBytes,
        },
    });

    let res: Response | null = null;
    let resText: string | null = null;

    try {
        res = await fetch(publishUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...(input.deduplicationId
                    ? { "Upstash-Deduplication-Id": input.deduplicationId }
                    : {}),
            },
            body: JSON.stringify(input.body),
        });

        const ms = msSince(startedAt);

        if (!res.ok) {
            // essaye de récupérer le body d’erreur (utile: “invalid token”, “rate limit”, etc.)
            resText = await res.text().catch(() => "");

            const err = new Error(`QStash publish failed (${res.status}): ${resText}`);

            Log.error("qstash.publish_json.http_error", err, {
                status_code: 502,
                metadata: {
                    ms,
                    url: safeUrl(input.url),
                    deduplication_id: input.deduplicationId ?? null,
                    qstash_status: res.status,
                    qstash_status_text: res.statusText,
                    response_text: resText?.slice(0, 2_000) ?? null,
                },
            });

            t.endError("qstash.publish_json.http_error", err, { status_code: 502 });
            throw err;
        }

        // res ok: parse JSON best-effort
        const out = await res.json().catch(() => ({}));

        Log.success("qstash.publish_json.ok", {
            status_code: 200,
            metadata: {
                ms,
                url: safeUrl(input.url),
                deduplication_id: input.deduplicationId ?? null,
                qstash_status: res.status,
            },
        });

        t.endSuccess("qstash.publish_json.success", { status_code: 200 });

        return out;
    } catch (e: any) {
        const ms = msSince(startedAt);

        // si c’est une erreur réseau (fetch throw), on log ici
        Log.error("qstash.publish_json.fatal", e, {
            status_code: 500,
            metadata: {
                ms,
                url: safeUrl(input.url),
                deduplication_id: input.deduplicationId ?? null,
                payload_bytes: payloadBytes,
            },
        });

        t.endError("qstash.publish_json.fatal", e, { status_code: 500 });
        throw e;
    }
}
