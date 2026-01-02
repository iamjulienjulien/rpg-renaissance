"use client";

import React from "react";

export function StickyCtaBar(p: { children: React.ReactNode; className?: string }) {
    return (
        <div className={["sticky bottom-0 z-20 pb-3", p.className].filter(Boolean).join(" ")}>
            <div className="rounded-[28px] bg-black/55 backdrop-blur-md p-3 ring-1 ring-white/10">
                {p.children}
            </div>
        </div>
    );
}
