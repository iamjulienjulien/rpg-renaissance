"use client";

import React, { useMemo } from "react";

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function UiDonut(props: {
    value: number; // 0..1
    size?: number;
    stroke?: number;
    label?: string;
}) {
    const size = props.size ?? 64;
    const stroke = props.stroke ?? 8;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;

    const pct = clamp(props.value ?? 0, 0, 1);
    const dash = useMemo(() => `${pct * c} ${c}`, [pct, c]);

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={stroke}
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="rgba(255,255,255,0.65)"
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={dash}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>

            <div className="absolute text-[11px] text-white/75 font-semibold">
                {props.label ?? `${Math.round(pct * 100)}%`}
            </div>
        </div>
    );
}
