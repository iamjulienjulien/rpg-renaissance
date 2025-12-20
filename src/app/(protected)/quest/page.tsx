import React, { Suspense } from "react";
import RpgShell from "@/components/RpgShell";
import QuestClient from "./QuestClient";

export default function QuestPage() {
    return (
        <Suspense
            fallback={
                <RpgShell title="Quête" rightSlot={null}>
                    <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                        ⏳ Chargement…
                    </div>
                </RpgShell>
            }
        >
            <QuestClient />
        </Suspense>
    );
}
