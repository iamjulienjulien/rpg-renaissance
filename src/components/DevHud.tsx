"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDevStore } from "@/stores/devStore";
import { useToastStore } from "@/stores/toastStore";
import { ActionButton } from "./RpgUi";
import { useAiStore } from "@/stores/aiStore";
import { UiActionButton, UiCard, UiChip } from "./ui";
import { useUiStore } from "@/stores/uiStore";

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

    const { replayLastDbToast, push, toasts } = useToastStore();

    const { aiJobsPending } = useAiStore();

    const { openModal } = useUiStore();

    // ✅ init safe (évite un setState immédiat “gratuit”)
    const [href, setHref] = useState<string>(() =>
        typeof window !== "undefined" ? window.location.href : ""
    );

    console.log("toasts", toasts);

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

        // ✅ microtask: évite “useInsertionEffect must not schedule updates”
        const scheduleUpdate = () => {
            if (typeof queueMicrotask !== "undefined") {
                queueMicrotask(update);
            } else {
                Promise.resolve().then(update);
            }
        };

        // Sync initial (ok car on est dans useEffect)
        update();

        const onPop = () => update();

        const originalPush = history.pushState;
        const originalReplace = history.replaceState;

        // ✅ wrap en utilisant les originaux (pas history[method] qui peut déjà être patché)
        history.pushState = function (...args: Parameters<History["pushState"]>) {
            const ret = originalPush.apply(history, args as any);
            scheduleUpdate();
            return ret;
        };

        history.replaceState = function (...args: Parameters<History["replaceState"]>) {
            const ret = originalReplace.apply(history, args as any);
            scheduleUpdate();
            return ret;
        };

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

    const [totalJobs, setTotalJobs] = useState<number>(0);
    const [pendingJobs, setPendingJobs] = useState<number>(0);

    useEffect(() => {
        setTotalJobs(aiJobsPending.length);
        setPendingJobs(
            aiJobsPending.filter((j) => {
                return j.status === "running" || j.status === "queued";
            }).length
        );
    }, [aiJobsPending]);

    if (!show) return null;

    return (
        <div className="pointer-events-none fixed bottom-20 left-4 z-9999 w-90 max-w-[calc(100vw-32px)]">
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
                        <div className="mt-2 rpg-text-sm text-white/85">
                            <span className="text-white/60">Route:</span>{" "}
                            <span className="font-semibold">{info.path || "—"}</span>
                        </div>
                        <div className="mt-1 text-xs text-white/60 break-all">
                            <span className="text-white/40">Query:</span> {info.query || "—"}
                        </div>
                    </div>

                    <div className="shrink-0 text-right">
                        {/* <div className="text-[11px] text-white/45">⌘⇧D</div> */}
                        <div className="text-[11px] text-white/45">⌘⇧O</div>
                    </div>
                </div>
                <UiCard padded={false} className="mt-2 p-2 pt-1">
                    <span className="text-xs mr-1 ml-1">Ai Jobs : </span>
                    <UiChip tone="sky">{totalJobs}</UiChip>
                    {pendingJobs >= 1 && <UiChip tone="rose">⏳ {pendingJobs}</UiChip>}
                </UiCard>
                <div className="mt-3 grid gap-2">
                    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                        <div className="text-xs text-white/60">Toast</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <UiActionButton
                                size="xs"
                                onClick={() => {
                                    push({
                                        tone: "info",
                                        title: "Test",
                                        message: "Toast de démo",
                                        durationMs: null,
                                    });
                                }}
                            >
                                ✚ Ajouter
                            </UiActionButton>
                            <UiActionButton size="xs" onClick={() => replayLastDbToast()}>
                                🍞 Rejouer
                            </UiActionButton>

                            {/* <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                                {devEnabled ? "🧪 DEV ON" : "DEV OFF"}
                            </span>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                                {logsVerbose ? "🪵 logs ON" : "logs OFF"}
                            </span>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                                {apiLatencyMs > 0 ? `🦖 ${apiLatencyMs}ms` : "latency OFF"}
                            </span> */}
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
                <div className="mt-3">
                    <UiActionButton size="xs" onClick={() => openModal("devData")}>
                        🔎 Data
                    </UiActionButton>
                </div>

                {/* <div className="mt-3 text-[11px] text-white/45">
                    Tip: ⌘⇧D active/désactive DEV. ⌘⇧O affiche/masque l’overlay.
                </div> */}
            </div>
        </div>
    );
}
