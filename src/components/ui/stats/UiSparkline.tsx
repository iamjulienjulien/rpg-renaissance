"use client";

import React, { useMemo } from "react";

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function UiSparkline(props: {
    values: number[];
    width?: number;
    height?: number;
    strokeWidth?: number;
    className?: string;
}) {
    const w = props.width ?? 140;
    const h = props.height ?? 34;
    const sw = props.strokeWidth ?? 2;

    const d = useMemo(() => {
        const vals = (props.values ?? []).map((x) => (Number.isFinite(x) ? x : 0));
        if (vals.length < 2) return "";

        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const span = max - min || 1;

        const step = w / (vals.length - 1);

        const pts = vals.map((v, i) => {
            const x = i * step;
            const y = h - ((v - min) / span) * h;
            return { x, y };
        });

        return pts
            .map(
                (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${clamp(p.y, 0, h).toFixed(2)}`
            )
            .join(" ");
    }, [props.values, w, h]);

    if (!d) {
        return (
            <div className={props.className}>
                <div className="h-[34px] w-[140px] rounded-xl bg-white/5 ring-1 ring-white/10" />
            </div>
        );
    }

    return (
        <svg className={props.className} width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
            <path d={d} stroke="rgba(255,255,255,0.65)" strokeWidth={sw} />
        </svg>
    );
}
