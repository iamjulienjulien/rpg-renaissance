// src/app/ui/UiComponentPanel.tsx
"use client";

import React, { useState } from "react";
import { Panel, ActionButton } from "@/components/RpgUi";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type UiComponentPanelProps = {
    title: string;
    emoji?: string;
    subtitle?: string;
    right?: React.ReactNode;

    code?: string;
    children: React.ReactNode;

    defaultOpen?: boolean; // code visible by default
};

export default function UiComponentPanel({
    title,
    emoji,
    subtitle,
    right,
    code,
    children,
    defaultOpen = false,
}: UiComponentPanelProps) {
    const [open, setOpen] = useState(defaultOpen);
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 900);
        } catch {
            // noop
        }
    };

    const headerRight = (
        <div className="flex items-center gap-2">
            {right}
            {code ? (
                <>
                    <ActionButton variant="soft" onClick={() => setOpen((v) => !v)}>
                        {open ? "🙈 Code" : "👀 Code"}
                    </ActionButton>
                    <ActionButton variant="soft" onClick={onCopy}>
                        {copied ? "✅ Copié" : "📋 Copier"}
                    </ActionButton>
                </>
            ) : null}
        </div>
    );

    return (
        <Panel title={title} emoji={emoji} subtitle={subtitle} right={headerRight}>
            {children}

            {code && open ? (
                <div className="mt-3 rounded-2xl bg-black/40 ring-1 ring-white/10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10">
                        <div className="text-xs tracking-[0.18em] text-white/50">CODE</div>
                    </div>

                    <pre className="p-4 overflow-auto text-xs leading-relaxed text-white/70">
                        <code>{code}</code>
                    </pre>
                </div>
            ) : null}
        </Panel>
    );
}
