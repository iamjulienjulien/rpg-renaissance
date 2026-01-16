// src/components/ui/UiStopwatch.tsx
// UiStopwatch
// - Chronomètre (temps écoulé) basé sur une date de départ (ISO string / Date / timestamp).
// - S’actualise automatiquement chaque seconde.
// - Pensé pour l’UI de quêtes (ex: “temps depuis le début de la quête”).

"use client";

import * as React from "react";

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UiStopwatchFormat = "auto" | "hh:mm:ss" | "mm:ss" | "verbose";

export type UiStopwatchProps = {
    /** Date de départ (ex: "2026-01-07T19:12:01.797962+00:00") */
    startAt: string | Date | number;

    /** Met à jour l’affichage toutes les X ms (par défaut 1000) */
    tickMs?: number;

    /** Format d’affichage */
    format?: UiStopwatchFormat;

    /** Afficher les jours quand > 24h (auto) */
    showDays?: boolean;

    /** Padding à 2 chiffres (auto) */
    pad?: boolean;

    /** Libellé optionnel (ex: "⏱️") */
    prefix?: React.ReactNode;

    /** Classe(s) supplémentaires */
    className?: string;

    /** Test id */
    "data-testid"?: string;

    /** Callback à chaque tick (utile pour stats/logs) */
    onTick?: (elapsedMs: number) => void;

    /** Si true, le chrono ne tourne pas (affiche la valeur figée) */
    paused?: boolean;
};

/* ============================================================================
🧰 HELPERS
============================================================================ */

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function parseStartAt(startAt: UiStopwatchProps["startAt"]) {
    if (typeof startAt === "number") return startAt;
    if (startAt instanceof Date) return startAt.getTime();
    const t = Date.parse(startAt);
    return Number.isFinite(t) ? t : NaN;
}

function clampNonNegativeMs(ms: number) {
    if (!Number.isFinite(ms)) return 0;
    return Math.max(0, ms);
}

function pad2(n: number, pad: boolean) {
    return pad ? String(n).padStart(2, "0") : String(n);
}

function formatElapsed(
    elapsedMs: number,
    opts: { format: UiStopwatchFormat; showDays: boolean; pad: boolean }
) {
    const totalSec = Math.floor(elapsedMs / 1000);

    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const showDays = opts.showDays && days > 0;

    if (opts.format === "verbose") {
        const parts: string[] = [];
        if (showDays) parts.push(`${days}j`);
        parts.push(`${pad2(hours, opts.pad)}h`);
        parts.push(`${pad2(mins, opts.pad)}m`);
        parts.push(`${pad2(secs, opts.pad)}s`);
        return parts.join(" ");
    }

    if (opts.format === "mm:ss") {
        const mm = Math.floor(totalSec / 60);
        return `${pad2(mm, opts.pad)}:${pad2(secs, opts.pad)}`;
    }

    if (opts.format === "hh:mm:ss") {
        const hh = Math.floor(totalSec / 3600);
        const mm = Math.floor((totalSec % 3600) / 60);
        return `${pad2(hh, opts.pad)}:${pad2(mm, opts.pad)}:${pad2(secs, opts.pad)}`;
    }

    // auto
    if (showDays) {
        return `${days}d ${pad2(hours, opts.pad)}:${pad2(mins, opts.pad)}:${pad2(secs, opts.pad)}`;
    }
    if (totalSec >= 3600) {
        return `${pad2(hours, opts.pad)}:${pad2(mins, opts.pad)}:${pad2(secs, opts.pad)}`;
    }
    return `${pad2(mins, opts.pad)}:${pad2(secs, opts.pad)}`;
}

/* ============================================================================
🧩 COMPONENT
============================================================================ */

export function UiStopwatch({
    startAt,
    tickMs = 1000,
    format = "auto",
    showDays = true,
    pad = true,
    prefix,
    className,
    "data-testid": testId,
    onTick,
    paused = false,
}: UiStopwatchProps) {
    const startMs = React.useMemo(() => parseStartAt(startAt), [startAt]);

    const [nowMs, setNowMs] = React.useState<number>(() => Date.now());

    /* ============================================================================
    🧠 EFFECT: TICK
    ============================================================================ */

    React.useEffect(() => {
        if (paused) return;

        // Tick aligné sur la seconde si tickMs=1000 (optionnel mais “propre”)
        const schedule = () => setNowMs(Date.now());

        schedule();

        const id = window.setInterval(
            () => {
                schedule();
            },
            Math.max(250, tickMs)
        );

        return () => window.clearInterval(id);
    }, [tickMs, paused]);

    const elapsedMs = clampNonNegativeMs(nowMs - startMs);

    React.useEffect(() => {
        if (onTick) onTick(elapsedMs);
    }, [elapsedMs, onTick]);

    const text = Number.isFinite(startMs)
        ? formatElapsed(elapsedMs, { format, showDays, pad })
        : "—";

    /* ============================================================================
    🧪 RENDER SAMPLE
    ============================================================================ */

    return (
        <span
            data-testid={testId}
            className={cn(
                "inline-flex items-center gap-2 rounded-full",
                "bg-black/25 ring-1 ring-white/10",
                "px-3 py-1.5",
                "font-mono text-xs text-white/80",
                className
            )}
            title={
                Number.isFinite(startMs)
                    ? `start: ${new Date(startMs).toISOString()}`
                    : "invalid startAt"
            }
        >
            {prefix ? <span className="opacity-80">{prefix}</span> : null}
            <span className="tabular-nums">{text}</span>
        </span>
    );
}

export default UiStopwatch;
