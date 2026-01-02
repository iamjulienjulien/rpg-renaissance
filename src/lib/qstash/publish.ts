// src/lib/qstash/publish.ts
export async function qstashPublishJSON(input: {
    url: string;
    body: any;
    deduplicationId?: string; // important: jobId
}) {
    const token = process.env.QSTASH_TOKEN!;
    const res = await fetch(
        "https://qstash.upstash.io/v2/publish/" + encodeURIComponent(input.url),
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...(input.deduplicationId
                    ? { "Upstash-Deduplication-Id": input.deduplicationId }
                    : {}),
            },
            body: JSON.stringify(input.body),
        }
    );

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`QStash publish failed (${res.status}): ${txt}`);
    }

    return res.json().catch(() => ({}));
}
