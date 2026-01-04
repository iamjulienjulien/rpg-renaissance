"use client";

import React, { useMemo } from "react";
import { UiModal } from "@/components/ui/UiModal";
import MasterCard from "@/components/MasterCard";
import { ActionButton } from "@/components/RpgUi";
import { UiMotionDiv } from "@/components/motion/UiMotion";

export default React.memo(function RenownGainModal(props: {
    lastRenownGain: any;
    congrats?: { title?: string | null; message?: string | null } | undefined;
    loading: boolean;
    onClose: () => void;
}) {
    const { lastRenownGain, congrats, loading, onClose } = props;

    const title =
        loading && !congrats?.title ? "🕯️ Le MJ forge tes lauriers…" : (congrats?.title ?? "Bravo");

    const { pct, into } = useMemo(() => {
        const afterValue = Math.max(0, lastRenownGain.after.value);
        const intoValue = afterValue % 100;
        const pctValue = Math.max(0, Math.min(100, (intoValue / 100) * 100));
        return { pct: pctValue, into: intoValue };
    }, [lastRenownGain]);

    const leveledUp = lastRenownGain.after.level > (lastRenownGain.before?.level ?? 1);

    return (
        <UiModal
            id="renownGain"
            maxWidth="md"
            closeOnBackdrop
            closeOnEscape
            eyebrow="🏆 Renommée gagnée"
            title={title}
            footer={
                <div className="flex justify-end">
                    <ActionButton variant="solid" onClick={onClose}>
                        ✨ Continuer
                    </ActionButton>
                </div>
            }
        >
            <MasterCard title="Félicitations" emoji="🎉">
                <div className="whitespace-pre-line rpg-rpg-text-sm text-white/70">
                    {loading && !congrats?.message
                        ? "✨ ...\n✨ ...\n✨ ..."
                        : (congrats?.message ?? "Victoire enregistrée.")}
                </div>
            </MasterCard>

            <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                    <div className="text-2xl font-semibold text-white/90">
                        +{lastRenownGain.delta}
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                        {lastRenownGain.reason ?? "Quête terminée"}
                    </div>
                </div>

                {leveledUp ? (
                    <div className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-emerald-200 ring-1 ring-emerald-400/20">
                        ✨ LEVEL UP
                        <div className="text-xs opacity-80">
                            {lastRenownGain.before?.level ?? 1} → {lastRenownGain.after.level}
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="mt-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                    <UiMotionDiv
                        className="h-full rounded-full bg-white/25"
                        initial={{ width: "0%" }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-white/55">
                    <span>✨ {into}/100</span>
                    <span>Niv. {lastRenownGain.after.level}</span>
                </div>
            </div>
        </UiModal>
    );
});
