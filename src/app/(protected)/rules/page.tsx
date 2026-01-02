"use client";

import React, { useMemo, useState } from "react";
import RpgShell from "@/components/RpgShell";
import { Panel, Pill } from "@/components/RpgUi";
import { RULES_CONTENT, type RuleSection } from "@/content/rules";
import ReactMarkdown from "react-markdown";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function RulesPage() {
    const [activeId, setActiveId] = useState<string>(RULES_CONTENT[0]?.id);

    const activeSection = useMemo<RuleSection | undefined>(() => {
        return RULES_CONTENT.find((s) => s.id === activeId);
    }, [activeId]);

    return (
        <RpgShell
            title="Règles & Lexique"
            subtitle="📖 Comprendre le monde, ses lois et son langage."
            rightSlot={
                <div className="flex gap-2">
                    {RULES_CONTENT.map((s) => (
                        <Pill key={s.id} onClick={() => setActiveId(s.id)} title={s.title}>
                            {s.title}
                        </Pill>
                    ))}
                </div>
            }
        >
            <Panel>
                {!activeSection ? null : (
                    <article
                        className={cn(
                            "prose prose-invert max-w-none",
                            "prose-h1:text-white prose-h2:text-white/90",
                            "prose-p:text-white/75",
                            "prose-li:text-white/75",
                            "prose-strong:text-white"
                        )}
                    >
                        <ReactMarkdown>{activeSection.markdown}</ReactMarkdown>
                    </article>
                )}
            </Panel>
        </RpgShell>
    );
}
