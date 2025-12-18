export function getDeviceId() {
    if (typeof window === "undefined") return "";

    const key = "renaissance_device_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;

    const id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
    return id;
}
