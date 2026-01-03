"use client";

import React from "react";
import { UiModal } from "@/components/ui/UiModal";
import { ActionButton } from "@/components/RpgUi";

export default React.memo(function AdventureConfigModal(props: {
    adventureId: string | null;
    draft: string;
    setDraft: (v: string) => void;
    saving: boolean;
    onClose: () => void;
    onSave: () => void;
}) {
    const { adventureId, draft, setDraft, saving, onClose, onSave } = props;

    if (!adventureId) return null;

    return (
        <UiModal
            id="adventureConfig"
            maxWidth="2xl"
            eyebrow="🧭 Configuration"
            title="Contexte de l’aventure"
            subtitle="Cadre global, contraintes, ambiance, objectifs long-terme."
            closeOnBackdrop
            closeOnEscape
            footer={
                <div className="flex justify-end gap-2">
                    <ActionButton onClick={onClose}>Annuler</ActionButton>
                    <ActionButton variant="solid" disabled={saving} onClick={onSave}>
                        {saving ? "⏳ Sauvegarde…" : "✅ Sauvegarder"}
                    </ActionButton>
                </div>
            }
        >
            <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ex: semaine chargée, priorité salon + cuisine, sessions courtes…"
                className="min-h-[180px] w-full rounded-2xl bg-black/30 px-4 py-3 rpg-rpg-text-sm
                           text-white/90 ring-1 ring-white/10 outline-none
                           placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
            />
        </UiModal>
    );
});
