import { useDevStore } from "@/stores/devStore";

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// ⚠️ helper pour client components
export async function fetchWithDev(input: RequestInfo | URL, init?: RequestInit) {
    const { enabled, apiLatencyMs } = useDevStore.getState();

    if (enabled && apiLatencyMs > 0) {
        await sleep(apiLatencyMs);
    }

    return fetch(input, init);
}
