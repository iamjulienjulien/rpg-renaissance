// src/lib/qstash/publish.ts
import { Log } from "@/lib/systemLog/Log";
import crypto from "crypto";

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

function sha256Base64Url(input: string) {
    // base64url = safe header value
    return crypto
        .createHash("sha256")
        .update(input)
        .digest("base64")
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
}

function normalizeDeduplicationId(raw?: string) {
    const original = typeof raw === "string" ? raw.trim() : "";
    if (!original) return null;

    // QStash refuse explicitement ':'.
    // On garde un charset "safe header" et stable pour la dédup.
    let cleaned = original
        .replaceAll(":", "-")
        .replaceAll(" ", "_")
        .replaceAll("\t", "_")
        .replaceAll("\n", "_")
        .replaceAll("\r", "_");

    // Autoriser seulement un set conservateur:
    // alphanum + - _ . / @ (tu peux enlever @ si tu veux ultra strict)
    cleaned = cleaned.replaceAll(/[^a-zA-Z0-9\-_.\/@]/g, "-");

    // Collapse: éviter des '-----'
    cleaned = cleaned.replaceAll(/-+/g, "-").replaceAll(/_+/g, "_");

    // Pas de début/fin crados
    cleaned = cleaned.replaceAll(/^[-_.\/@]+/g, "").replaceAll(/[-_.\/@]+$/g, "");

    // Limite raisonnable (header). Si tu veux: 128 ou 200.
    const MAX = 128;
    if (cleaned.length > MAX) {
        // On garde un prefix lisible + hash pour unicité
        const prefix = cleaned.slice(0, 40);
        const h = sha256Base64Url(original).slice(0, 22);
        cleaned = `${prefix}-${h}`.slice(0, MAX);
    }

    // Si après nettoyage c'est vide, fallback hash
    if (!cleaned) {
        return `dedup-${sha256Base64Url(original).slice(0, 32)}`;
    }

    // Double sécurité: plus aucun ':'.
    if (cleaned.includes(":")) {
        cleaned = cleaned.replaceAll(":", "-");
    }

    return cleaned;
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

    // ✅ DO NOT encodeURIComponent(dest) (tu as l'air de vouloir garder ce comportement)
    const publishUrl = `https://qstash.upstash.io/v2/publish/${dest}`;

    const payloadBytes = jsonByteLength(input.body);

    const dedupId = normalizeDeduplicationId(input.deduplicationId);

    Log.debug("qstash.publish_json.start", {
        metadata: {
            url: safeUrl(input.url),
            publish_url: "https://qstash.upstash.io/v2/publish/<encoded>",
            deduplication_id: dedupId ?? null,
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
                ...(dedupId ? { "Upstash-Deduplication-Id": dedupId } : {}),
            },
            body: JSON.stringify(input.body),
        });

        const ms = msSince(startedAt);

        if (!res.ok) {
            resText = await res.text().catch(() => "");

            const err = new Error(`QStash publish failed (${res.status}): ${resText}`);

            Log.error("qstash.publish_json.http_error", err, {
                status_code: 502,
                metadata: {
                    ms,
                    url: safeUrl(input.url),
                    deduplication_id: dedupId ?? null,
                    qstash_status: res.status,
                    qstash_status_text: res.statusText,
                    response_text: resText?.slice(0, 2_000) ?? null,
                },
            });

            t.endError("qstash.publish_json.http_error", err, { status_code: 502 });
            throw err;
        }

        const out = await res.json().catch(() => ({}));

        Log.success("qstash.publish_json.ok", {
            status_code: 200,
            metadata: {
                ms,
                url: safeUrl(input.url),
                deduplication_id: dedupId ?? null,
                qstash_status: res.status,
            },
        });

        t.endSuccess("qstash.publish_json.success", { status_code: 200 });

        return out;
    } catch (e: any) {
        const ms = msSince(startedAt);

        Log.error("qstash.publish_json.fatal", e, {
            status_code: 500,
            metadata: {
                ms,
                url: safeUrl(input.url),
                deduplication_id: dedupId ?? null,
                payload_bytes: payloadBytes,
            },
        });

        t.endError("qstash.publish_json.fatal", e, { status_code: 500 });
        throw e;
    }
}
