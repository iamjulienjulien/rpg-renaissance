// src/app/inventory/page.tsx
"use client";

import { useMemo, useState } from "react";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import { usePlantsList, usePlantPrefillFlow } from "@/hooks/inventory";
import PhotoUploader, { type UploadedPhotoPayload } from "@/components/PhotoUploader";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function InventoryPage() {
    const [mode, setMode] = useState<"list" | "add">("list");

    const { plants, loading, error, refresh, hasItems } = usePlantsList({ auto: true });
    const flow = usePlantPrefillFlow();

    const plantsCountLabel = useMemo(() => {
        const n = plants.length;
        return n <= 1 ? `${n} plante` : `${n} plantes`;
    }, [plants.length]);

    const goList = async () => {
        flow.clear();
        setMode("list");
    };

    const goAdd = () => {
        flow.clear();
        setMode("add");
    };

    const onUploaded = (payload: UploadedPhotoPayload) => {
        // ✅ Brancher la photo au flow de prefill
        flow.setPhotoInput({
            id: payload.photo.id,
            signed_url: payload.signed_url ?? "",
        });
    };

    return (
        <RpgShell
            title="Inventaire"
            subtitle="Ce que tu observes, cultives et conserves dans le monde réel."
        >
            <div className="grid gap-4 lg:grid-cols-3">
                {/* 🌱 INVENTAIRE PLANTES */}
                <Panel
                    title="Mes plantes"
                    emoji="🌿"
                    subtitle="Plantes observées, cultivées ou simplement présentes."
                    right={
                        mode === "list" ? (
                            <ActionButton onClick={goAdd} variant="solid">
                                ➕ Ajouter
                            </ActionButton>
                        ) : (
                            <ActionButton onClick={goList}>↩️ Retour</ActionButton>
                        )
                    }
                >
                    {/* Errors */}
                    {error ? (
                        <div className="mb-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-400/20">
                            ⚠️ {error}
                        </div>
                    ) : null}

                    {flow.error ? (
                        <div className="mb-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-400/20">
                            ⚠️ {flow.error}
                        </div>
                    ) : null}

                    {/* LISTE */}
                    {mode === "list" && (
                        <>
                            {loading && (
                                <div className="rpg-text-sm text-white/60">⏳ Chargement…</div>
                            )}

                            {!loading && !hasItems && (
                                <div className="rpg-text-sm text-white/60">
                                    Aucune plante inventoriée pour l’instant.
                                </div>
                            )}

                            <div className="grid gap-2">
                                {plants.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center gap-3 rounded-2xl bg-black/30 p-3 ring-1 ring-white/10"
                                    >
                                        {/* Photo */}
                                        <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                                            {p.cover_photo_url ? (
                                                <img
                                                    src={p.cover_photo_url}
                                                    alt={p.title ?? "Plante"}
                                                    className="h-full w-full object-cover"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="grid h-full w-full place-items-center text-xl">
                                                    🌱
                                                </div>
                                            )}
                                        </div>

                                        {/* Infos */}
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-semibold text-white/85">
                                                {p.title ?? "Plante sans nom"}
                                            </div>

                                            {p.data?.species_guess?.value ? (
                                                <div className="text-xs text-white/60">
                                                    {p.data.species_guess.value}
                                                </div>
                                            ) : p.data?.species?.value ? (
                                                <div className="text-xs text-white/60">
                                                    {p.data.species.value}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {hasItems ? (
                                <div className="mt-3 flex justify-end">
                                    <ActionButton onClick={() => void refresh()}>
                                        🔄 Rafraîchir
                                    </ActionButton>
                                </div>
                            ) : null}
                        </>
                    )}

                    {/* AJOUT */}
                    {mode === "add" && (
                        <div className="space-y-4">
                            {/* STEP */}
                            <div className="text-xs tracking-[0.18em] text-white/50">
                                {flow.step === "idle" && "📸 Photo"}
                                {flow.step === "prefilling" && "🧠 Analyse"}
                                {flow.step === "editing" && "✍️ Vérification"}
                                {flow.step === "creating" && "🌱 Création"}
                            </div>

                            {/* 1) UPLOAD */}
                            {!flow.photo ? (
                                <PhotoUploader
                                    title="Photo de la plante"
                                    subtitle="Prends une photo nette (feuilles + port). L’IA préremplira les champs."
                                    // ✅ inventory mode: pas de chapterQuestId
                                    category="other"
                                    autoUpload
                                    maxSizeMb={12}
                                    onUploaded={onUploaded}
                                    onError={(msg) => flow.setError?.(msg)} // si ton hook expose setError
                                />
                            ) : (
                                <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                                            {flow.photo.signed_url ? (
                                                <img
                                                    src={flow.photo.signed_url}
                                                    alt="Photo plante"
                                                    className="h-full w-full object-cover"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="grid h-full w-full place-items-center text-xl">
                                                    📷
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs tracking-[0.18em] text-white/55">
                                                📌 PHOTO PRÊTE
                                            </div>
                                            <div className="mt-1 rpg-text-sm text-white/70">
                                                L’IA peut analyser cette image.
                                            </div>
                                        </div>

                                        <ActionButton
                                            onClick={() => flow.clear()}
                                            disabled={flow.prefillLoading || flow.createLoading}
                                        >
                                            🧹 Reset
                                        </ActionButton>
                                    </div>
                                </div>
                            )}

                            {/* 2) PREFILL */}
                            {flow.photo && !flow.draft && (
                                <ActionButton
                                    variant="solid"
                                    onClick={() => void flow.runPrefill()}
                                    disabled={flow.prefillLoading || flow.createLoading}
                                >
                                    {flow.prefillLoading ? "⏳ Analyse…" : "🧠 Analyser la plante"}
                                </ActionButton>
                            )}

                            {/* 3) FORM */}
                            {flow.draft && (
                                <div className="space-y-3">
                                    <label className="grid gap-2">
                                        <div className="text-xs tracking-[0.18em] text-white/55">
                                            🏷️ TITRE
                                        </div>
                                        <input
                                            value={flow.draft.title ?? ""}
                                            onChange={(e) => flow.updateTitle(e.target.value)}
                                            placeholder="Ex: Pachira"
                                            className={cn(
                                                "w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                                                "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                                "focus:ring-2 focus:ring-white/20"
                                            )}
                                        />
                                    </label>

                                    <label className="grid gap-2">
                                        <div className="text-xs tracking-[0.18em] text-white/55">
                                            🧠 DESCRIPTION IA
                                        </div>
                                        <textarea
                                            value={flow.draft.ai_description ?? ""}
                                            onChange={(e) =>
                                                flow.updateAiDescription(e.target.value)
                                            }
                                            placeholder="Une description utile pour l’IA (contexte, état, indices visibles, etc.)"
                                            className={cn(
                                                "w-full min-h-[120px] rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                                                "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                                "focus:ring-2 focus:ring-white/20"
                                            )}
                                        />
                                    </label>

                                    {/* CTA create */}
                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                        <ActionButton
                                            onClick={goList}
                                            disabled={flow.createLoading || flow.prefillLoading}
                                        >
                                            ↩️ Annuler
                                        </ActionButton>

                                        <ActionButton
                                            variant="master"
                                            onClick={async () => {
                                                await flow.create();
                                                await refresh();
                                                await goList();
                                            }}
                                            disabled={flow.createLoading || flow.prefillLoading}
                                        >
                                            {flow.createLoading
                                                ? "⏳ Création…"
                                                : "🌱 Ajouter à l’inventaire"}
                                        </ActionButton>
                                    </div>
                                </div>
                            )}

                            {/* Cancel (fallback) */}
                            {!flow.draft ? (
                                <ActionButton
                                    onClick={goList}
                                    disabled={flow.createLoading || flow.prefillLoading}
                                >
                                    ↩️ Annuler
                                </ActionButton>
                            ) : null}
                        </div>
                    )}
                </Panel>

                {/* 📚 LIVRES (LOCK) */}
                <Panel title="Mes livres" emoji="📚" subtitle="Bibliothèque personnelle.">
                    <div className="rpg-text-sm text-white/50">🔒 Disponible prochainement.</div>
                </Panel>

                {/* 💿 VINYLS (LOCK) */}
                <Panel title="Mes vinyles" emoji="💿" subtitle="Collection musicale.">
                    <div className="rpg-text-sm text-white/50">🔒 Disponible prochainement.</div>
                </Panel>
            </div>
        </RpgShell>
    );
}
