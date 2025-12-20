import React, { Suspense } from "react";
import RpgShell from "@/components/RpgShell";

import ChapterClient from "./ChapterClient";

export default function HomeRealignmentChapterPage() {
    return (
        <Suspense
            fallback={
                <RpgShell title="Chapitre" rightSlot={null}>
                    <div className="rounded-2xl bg-black/30 p-4 rpg-rpg-text-sm text-white/60 ring-1 ring-white/10">
                        ⏳ Chargement…
                    </div>
                </RpgShell>
            }
        >
            <ChapterClient />
        </Suspense>
    );
}
