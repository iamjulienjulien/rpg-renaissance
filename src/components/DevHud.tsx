"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDevStore } from "@/stores/devStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type DevHudProps = {
    // Optionnel: si tu veux afficher un bloc "data" (ex: { chapterId, adventureId })
    data?: Record<string, unknown>;
};

export default function DevHud(props: DevHudProps) {
    const devEnabled = useDevStore((s) => s.enabled);
    const overlays = useDevStore((s) => s.overlays);
    const logsVerbose = useDevStore((s) => s.logsVerbose);
    const apiLatencyMs = useDevStore((s) => s.apiLatencyMs);

    const [href, setHref] = useState<string>("");

    const show = devEnabled && overlays;

    const info = useMemo(() => {
        if (!href) return { path: "", query: "" };

        try {
            const u = new URL(href);
            return {
                path: u.pathname,
                query: u.search,
            };
        } catch {
            return { path: "", query: "" };
        }
    }, [href]);

    useEffect(() => {
        // Track URL changes (pushState/replaceState + popstate)
        const update = () => setHref(window.location.href);

        update();

        const onPop = () => update();

        const wrapHistory = (method: "pushState" | "replaceState") => {
            const original = history[method];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return function (this: any, ...args: any[]) {
                const ret = original.apply(this, args);
                update();
                return ret;
            };
        };

        const originalPush = history.pushState;
        const originalReplace = history.replaceState;

        history.pushState = wrapHistory("pushState");
        history.replaceState = wrapHistory("replaceState");

        window.addEventListener("popstate", onPop);

        return () => {
            window.removeEventListener("popstate", onPop);
            history.pushState = originalPush;
            history.replaceState = originalReplace;
        };
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toLowerCase().includes("mac");
            const mod = isMac ? e.metaKey : e.ctrlKey;

            // ⌘⇧D -> toggle DEV
            if (mod && e.shiftKey && e.key.toLowerCase() === "d") {
                e.preventDefault();
                useDevStore.getState().toggleEnabled();
                return;
            }

            // ⌘⇧O -> toggle Overlay
            if (mod && e.shiftKey && e.key.toLowerCase() === "o") {
                e.preventDefault();
                useDevStore.getState().toggleOverlays();
                return;
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    if (!show) return null;

    return (
        <div className="pointer-events-none fixed bottom-4 left-4 z-[9999] w-[360px] max-w-[calc(100vw-32px)]">
            <div
                className={cn(
                    "pointer-events-auto rounded-2xl bg-black/60 p-4 ring-1 ring-white/15 backdrop-blur",
                    "shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
                )}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-[11px] tracking-[0.18em] text-white/60">
                            🧪 DEV OVERLAY
                        </div>
                        <div className="mt-2 text-sm text-white/85">
                            <span className="text-white/60">Route:</span>{" "}
                            <span className="font-semibold">{info.path || "—"}</span>
                        </div>
                        <div className="mt-1 text-xs text-white/60 break-all">
                            <span className="text-white/40">Query:</span> {info.query || "—"}
                        </div>
                    </div>

                    <div className="shrink-0 text-right">
                        <div className="text-[11px] text-white/45">⌘⇧D</div>
                        <div className="text-[11px] text-white/45">⌘⇧O</div>
                    </div>
                </div>

                <div className="mt-3 grid gap-2">
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                        <div className="text-xs text-white/60">Toggles</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                                {devEnabled ? "🧪 DEV ON" : "DEV OFF"}
                            </span>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                                {logsVerbose ? "🪵 logs ON" : "logs OFF"}
                            </span>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                                {apiLatencyMs > 0 ? `🦖 ${apiLatencyMs}ms` : "latency OFF"}
                            </span>
                        </div>
                    </div>

                    {props.data ? (
                        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                            <div className="text-xs text-white/60">Data</div>
                            <pre className="mt-2 max-h-40 overflow-auto text-[11px] leading-relaxed text-white/70">
                                {JSON.stringify(props.data, null, 4)}
                            </pre>
                        </div>
                    ) : null}
                </div>

                <div className="mt-3 text-[11px] text-white/45">
                    Tip: ⌘⇧D active/désactive DEV. ⌘⇧O affiche/masque l’overlay.
                </div>
            </div>
        </div>
    );
}
