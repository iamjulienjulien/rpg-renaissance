"use client";

import React, { useMemo } from "react";

export function UiBarChartMini(props: {
    values: number[];
    height?: number;
    className?: string;
    ariaLabel?: string;
}) {
    const h = props.height ?? 56;

    const { max, bars } = useMemo(() => {
        const vals = (props.values ?? []).map((x) => (Number.isFinite(x) ? x : 0));
        const m = Math.max(1, ...vals);
        return { max: m, bars: vals };
    }, [props.values]);

    return (
        <div className={props.className} role="img" aria-label={props.ariaLabel ?? "Bar chart"}>
            <div
                className="flex items-end gap-[3px] rounded-2xl bg-white/5 p-2 ring-1 ring-white/10"
                style={{ height: h }}
            >
                {bars.map((v, i) => {
                    const pct = Math.max(0, Math.min(1, v / max));
                    return (
                        <div
                            key={i}
                            className="w-full rounded-[6px] bg-white/20"
                            style={{ height: `${Math.round(pct * 100)}%` }}
                            title={`${v}`}
                        />
                    );
                })}
            </div>
        </div>
    );
}
