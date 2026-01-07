// src/components/modals/PlayerAvatarModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UiModal } from "@/components/ui/UiModal";
import { ActionButton, Pill } from "@/components/RpgUi";
import { useUiStore } from "@/stores/uiStore";
import { useToastStore } from "@/stores/toastStore";
import { useGameStore } from "@/stores/gameStore";
import { useAiStore } from "@/stores/aiStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type Props = {
    onClosed?: () => void;
};

type AvatarFormat = "square" | "portrait";
type AvatarVibe = "knight" | "ranger" | "mage" | "dark";
type AvatarBackground = "studio" | "forest" | "castle" | "battlefield";
type AvatarAccessory = "none" | "hood" | "helm" | "crown" | "pauldron";
type AvatarFaithfulness = "faithful" | "balanced" | "stylized";

function formatLabel(f: AvatarFormat) {
    if (f === "square") return "🟦 Carré (1:1)";
    return "🟩 Portrait (4:5)";
}

function vibeLabel(v: AvatarVibe) {
    if (v === "knight") return "🛡️ Chevalier";
    if (v === "ranger") return "🏹 Rôdeur";
    if (v === "mage") return "🔮 Mage";
    return "🌑 Sombre";
}

function bgLabel(b: AvatarBackground) {
    if (b === "studio") return "✨ Studio épique";
    if (b === "forest") return "🌲 Forêt";
    if (b === "castle") return "🏰 Château";
    return "⚔️ Champ de bataille";
}

function accessoryLabel(a: AvatarAccessory) {
    if (a === "none") return "🧑‍🦱 Aucun";
    if (a === "hood") return "🧥 Capuche";
    if (a === "helm") return "⛑️ Heaume";
    if (a === "crown") return "👑 Couronne";
    return "🦾 Épaulières";
}

function faithLabel(f: AvatarFaithfulness) {
    if (f === "faithful") return "🎯 Fidèle";
    if (f === "balanced") return "⚖️ Équilibré";
    return "🎨 Stylisé";
}

type Preview = { id: string; file: File; url: string };

export default function PlayerAvatarModal(props: Props) {
    const isOpen = useUiStore((s) => s.isModalOpen("playerAvatar"));
    const closeModal = useUiStore((s) => s.closeModal);

    const toast = useToastStore();

    const currentUserId = useGameStore((s) => s.currentUserId);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);
    const uploadPlayerPhoto = useGameStore(
        (s) =>
            (s as any).uploadPlayerPhoto as
                | undefined
                | ((input: {
                      file: File;
                      kind?: "portrait_source" | "avatar_generated";
                      caption?: string | null;
                      alt_text?: string | null;
                      set_active?: boolean;
                  }) => Promise<any | null>)
    );

    const generatePlayerAvatar = useAiStore(
        (s) =>
            (s as any).generatePlayerAvatar as
                | undefined
                | ((args: {
                      user_id: string;
                      photo_ids: string[];
                      options?: Record<string, any>;
                  }) => Promise<{ jobId: string; status: "queued" } | null>)
    );
    const playerAvatarLoading = useAiStore(
        (s) => (s as any).playerAvatarLoading as boolean | undefined
    );
    const playerAvatarGenerating = useAiStore(
        (s) => (s as any).playerAvatarGenerating as boolean | undefined
    );

    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<Preview[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Options (fantasy)
    const [format, setFormat] = useState<AvatarFormat>("square");
    const [vibe, setVibe] = useState<AvatarVibe>("knight");
    const [background, setBackground] = useState<AvatarBackground>("studio");
    const [accessory, setAccessory] = useState<AvatarAccessory>("none");
    const [faithfulness, setFaithfulness] = useState<AvatarFaithfulness>("balanced");

    // “intensité”
    const [dramaticLight, setDramaticLight] = useState(true);
    const [battleScars, setBattleScars] = useState(false);
    const [glowEyes, setGlowEyes] = useState(false);

    // micro prompt libre (optionnel)
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!isOpen) return;

        // reset when opening
        setFiles([]);
        setPreviews([]);
        setFormat("square");
        setVibe("knight");
        setBackground("studio");
        setAccessory("none");
        setFaithfulness("balanced");
        setDramaticLight(true);
        setBattleScars(false);
        setGlowEyes(false);
        setNotes("");
        setSubmitting(false);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Build previews
    useEffect(() => {
        // cleanup previous
        for (const p of previews) URL.revokeObjectURL(p.url);

        const next = files.map((f) => ({
            id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(16).slice(2)}`,
            file: f,
            url: URL.createObjectURL(f),
        }));

        setPreviews(next);

        return () => {
            for (const p of next) URL.revokeObjectURL(p.url);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files]);

    const onClose = () => {
        closeModal("playerAvatar");
        props.onClosed?.();
    };

    const fileMeta = useMemo(() => {
        const total = files.reduce((acc, f) => acc + f.size, 0);
        const mb = Math.round((total / 1024 / 1024) * 10) / 10;
        return { count: files.length, totalMb: mb };
    }, [files]);

    const canSubmit =
        files.length >= 1 && !submitting && !playerAvatarLoading && !playerAvatarGenerating;

    const onPickFiles = (incoming: FileList | null) => {
        if (!incoming) return;

        const list = Array.from(incoming)
            .filter((f) => f.type.startsWith("image/"))
            .slice(0, 5); // max 5

        setFiles(list);
    };

    const onRemoveOne = (idx: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    function mapOptions() {
        const mappedVibe =
            vibe === "knight"
                ? "knight"
                : vibe === "ranger"
                  ? "ranger"
                  : vibe === "mage"
                    ? "sage"
                    : "rogue";

        const mappedBg =
            background === "studio"
                ? "studio"
                : background === "forest"
                  ? "forest"
                  : background === "castle"
                    ? "temple"
                    : "tavern";

        const mappedAccessory =
            accessory === "none"
                ? "none"
                : accessory === "hood"
                  ? "cloak"
                  : accessory === "helm"
                    ? "helmet"
                    : accessory === "crown"
                      ? "crown"
                      : "amulet";

        const mappedFaith =
            faithfulness === "faithful"
                ? "strict"
                : faithfulness === "balanced"
                  ? "balanced"
                  : "creative";

        return {
            format,
            vibe: mappedVibe,
            background: mappedBg,
            accessory: mappedAccessory,
            faithfulness: mappedFaith,
            dramaticLight,
            battleScars,
            glowEyes,
            notes: notes.trim() ? notes.trim() : undefined,
        };
    }

    const onSubmit = async () => {
        if (!uploadPlayerPhoto) {
            toast.error("Avatar", "uploadPlayerPhoto manquant dans gameStore.");
            return;
        }
        if (!generatePlayerAvatar) {
            toast.error("Avatar", "generatePlayerAvatar manquant dans aiStore.");
            return;
        }

        setSubmitting(true);

        try {
            // 1) user_id
            let uid = (currentUserId ?? "").trim();
            if (!uid) {
                const p = await getCurrentPlayer().catch(() => null);
                uid = (p as any)?.user_id ?? "";
            }
            uid = (uid ?? "").trim();

            if (!uid) {
                toast.error("Avatar", "Utilisateur introuvable (session non prête).");
                return;
            }

            // 2) upload portraits -> photo_ids
            const photoIds: string[] = [];

            for (const f of files) {
                const row = await uploadPlayerPhoto({
                    file: f,
                    kind: "portrait_source",
                    caption: null,
                    alt_text: "Portrait source pour avatar",
                    set_active: false,
                });

                const id = (row as any)?.id ?? (row as any)?.photo?.id ?? null;
                if (typeof id === "string" && id.trim()) {
                    photoIds.push(id.trim());
                } else {
                    toast.error("Upload", "Une photo n’a pas pu être enregistrée.");
                    return;
                }
            }

            if (!photoIds.length) {
                toast.error("Avatar", "Aucune photo valide après upload.");
                return;
            }

            // 3) enqueue avatar generation
            const res = await generatePlayerAvatar({
                user_id: uid,
                photo_ids: photoIds,
                options: mapOptions(),
            });

            if (!res?.jobId) {
                toast.error("Avatar", "Impossible de lancer la génération.");
                return;
            }

            toast.success("Avatar", "Génération lancée (job en file).");
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Avatar", "Erreur réseau.");
        } finally {
            setSubmitting(false);
        }
    };

    const primaryLabel =
        submitting || playerAvatarLoading || playerAvatarGenerating
            ? "✨ Génération…"
            : "✨ Générer";

    return (
        <UiModal
            id="playerAvatar"
            maxWidth="lg"
            eyebrow="🧙‍♂️ Avatar"
            title="Créer ton portrait fantasy"
            closeOnBackdrop
            closeOnEscape
            footer={
                <div className="flex items-center justify-between gap-2">
                    <ActionButton onClick={onClose} disabled={submitting}>
                        Annuler
                    </ActionButton>

                    <ActionButton
                        variant="solid"
                        disabled={!canSubmit}
                        onClick={() => void onSubmit()}
                    >
                        {primaryLabel}
                    </ActionButton>
                </div>
            }
        >
            <div className="grid gap-3 mt-2">
                {/* Intro */}
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="text-sm text-white/75 leading-7">
                        Upload 1 à 5 portraits, choisis une “vibe” fantasy et quelques détails.
                        Ensuite, ton MJ mécanique (l’IA) peindra une version épique de toi. 🗡️📜
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>📌 1–5 photos</Pill>
                        <Pill>🎭 Style fantasy</Pill>
                        <Pill>🧠 Job asynchrone</Pill>
                    </div>
                </div>

                {/* Upload */}
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                        Portraits
                    </div>

                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_160px] sm:items-center">
                        <label
                            className={cn(
                                "flex items-center justify-between gap-3 rounded-2xl bg-black/30 px-4 py-3",
                                "ring-1 ring-white/10 hover:ring-white/20 cursor-pointer",
                                (submitting || playerAvatarLoading || playerAvatarGenerating) &&
                                    "opacity-60 pointer-events-none"
                            )}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => onPickFiles(e.target.files)}
                            />
                            <span className="text-sm text-white/80">
                                {files.length
                                    ? `${files.length} photo(s) sélectionnée(s)`
                                    : "Choisir des portraits…"}
                            </span>
                            <span className="text-xs text-white/40">image/* · max 5</span>
                        </label>

                        <button
                            type="button"
                            onClick={() => setFiles([])}
                            disabled={files.length === 0 || submitting}
                            className={cn(
                                "h-10 rounded-xl px-3 text-sm ring-1 ring-white/10",
                                files.length === 0 || submitting
                                    ? "bg-white/5 text-white/30"
                                    : "bg-white/10 text-white/85 hover:bg-white/15"
                            )}
                        >
                            🧽 Reset
                        </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/45">
                        <span>{fileMeta.count} fichier(s)</span>
                        <span>•</span>
                        <span>{fileMeta.totalMb} MB</span>
                        <span>•</span>
                        <span>Conseil: visage net, lumière douce, fond simple.</span>
                    </div>

                    {/* Previews grid */}
                    {previews.length ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {previews.map((p, idx) => (
                                <div
                                    key={p.id}
                                    className="relative overflow-hidden rounded-2xl ring-1 ring-white/10 bg-black/30"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={p.url}
                                        alt={`Portrait ${idx + 1}`}
                                        className="h-[140px] w-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onRemoveOne(idx)}
                                        disabled={
                                            submitting ||
                                            !!playerAvatarLoading ||
                                            !!playerAvatarGenerating
                                        }
                                        className={cn(
                                            "absolute right-2 top-2 rounded-full px-2 py-1 text-xs",
                                            "bg-black/55 text-white/85 ring-1 ring-white/15 hover:bg-black/70",
                                            (submitting ||
                                                playerAvatarLoading ||
                                                playerAvatarGenerating) &&
                                                "opacity-60 pointer-events-none"
                                        )}
                                        title="Retirer"
                                    >
                                        ✖
                                    </button>
                                    <div className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                                        #{idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Options */}
                <div className="grid gap-3 sm:grid-cols-2">
                    {/* Format */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Format
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(["square", "portrait"] as AvatarFormat[]).map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFormat(f)}
                                    disabled={submitting}
                                    className={cn(
                                        "rounded-full px-3 py-1 text-xs ring-1 transition",
                                        format === f
                                            ? "bg-white/10 text-white ring-white/15"
                                            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                        submitting && "opacity-60 pointer-events-none"
                                    )}
                                >
                                    {formatLabel(f)}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 text-xs text-white/45">
                            Carré pour avatar, portrait pour “carte personnage”.
                        </div>
                    </div>

                    {/* Vibe */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Archétype
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(["knight", "ranger", "mage", "dark"] as AvatarVibe[]).map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setVibe(v)}
                                    disabled={submitting}
                                    className={cn(
                                        "rounded-full px-3 py-1 text-xs ring-1 transition",
                                        vibe === v
                                            ? "bg-white/10 text-white ring-white/15"
                                            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                        submitting && "opacity-60 pointer-events-none"
                                    )}
                                >
                                    {vibeLabel(v)}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 text-xs text-white/45">
                            Choisit l’énergie, pas un costume exact.
                        </div>
                    </div>

                    {/* Background */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Décor
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(
                                ["studio", "forest", "castle", "battlefield"] as AvatarBackground[]
                            ).map((b) => (
                                <button
                                    key={b}
                                    type="button"
                                    onClick={() => setBackground(b)}
                                    disabled={submitting}
                                    className={cn(
                                        "rounded-full px-3 py-1 text-xs ring-1 transition",
                                        background === b
                                            ? "bg-white/10 text-white ring-white/15"
                                            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                        submitting && "opacity-60 pointer-events-none"
                                    )}
                                >
                                    {bgLabel(b)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Accessory */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Accessoire
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(
                                ["none", "hood", "helm", "crown", "pauldron"] as AvatarAccessory[]
                            ).map((a) => (
                                <button
                                    key={a}
                                    type="button"
                                    onClick={() => setAccessory(a)}
                                    disabled={submitting}
                                    className={cn(
                                        "rounded-full px-3 py-1 text-xs ring-1 transition",
                                        accessory === a
                                            ? "bg-white/10 text-white ring-white/15"
                                            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                        submitting && "opacity-60 pointer-events-none"
                                    )}
                                >
                                    {accessoryLabel(a)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sliders/toggles */}
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Style
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                                Ajuste la fidélité et quelques “épices” visuelles.
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {(["faithful", "balanced", "stylized"] as AvatarFaithfulness[]).map(
                                (f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setFaithfulness(f)}
                                        disabled={submitting}
                                        className={cn(
                                            "rounded-full px-3 py-1 text-xs ring-1 transition",
                                            faithfulness === f
                                                ? "bg-white/10 text-white ring-white/15"
                                                : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                            submitting && "opacity-60 pointer-events-none"
                                        )}
                                    >
                                        {faithLabel(f)}
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <label
                            className={cn(
                                "flex items-center justify-between gap-3 rounded-2xl px-3 py-2",
                                "bg-black/30 ring-1 ring-white/10 hover:ring-white/20 cursor-pointer",
                                submitting && "opacity-60 pointer-events-none"
                            )}
                        >
                            <span className="text-sm text-white/75">🌗 Lumière dramatique</span>
                            <input
                                type="checkbox"
                                checked={dramaticLight}
                                onChange={(e) => setDramaticLight(e.target.checked)}
                            />
                        </label>

                        <label
                            className={cn(
                                "flex items-center justify-between gap-3 rounded-2xl px-3 py-2",
                                "bg-black/30 ring-1 ring-white/10 hover:ring-white/20 cursor-pointer",
                                submitting && "opacity-60 pointer-events-none"
                            )}
                        >
                            <span className="text-sm text-white/75">🩹 Cicatrices (léger)</span>
                            <input
                                type="checkbox"
                                checked={battleScars}
                                onChange={(e) => setBattleScars(e.target.checked)}
                            />
                        </label>

                        <label
                            className={cn(
                                "flex items-center justify-between gap-3 rounded-2xl px-3 py-2",
                                "bg-black/30 ring-1 ring-white/10 hover:ring-white/20 cursor-pointer",
                                submitting && "opacity-60 pointer-events-none"
                            )}
                        >
                            <span className="text-sm text-white/75">✨ Regard “magique”</span>
                            <input
                                type="checkbox"
                                checked={glowEyes}
                                onChange={(e) => setGlowEyes(e.target.checked)}
                            />
                        </label>
                    </div>
                </div>

                {/* Notes */}
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                        Notes (optionnel)
                    </div>

                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ex: cheveux longs, barbe courte, cicatrice à la joue (si tu veux), pas d’armure lourde…"
                        disabled={submitting}
                        className={cn(
                            "mt-2 min-h-[88px] w-full resize-none rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                            "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                            "focus:ring-2 focus:ring-white/25",
                            submitting && "opacity-60"
                        )}
                    />

                    <div className="mt-2 text-xs text-white/45">
                        Ces options sont envoyées au job{" "}
                        <span className="text-white/70 font-semibold">generatePlayerAvatar</span>.
                    </div>
                </div>

                {/* Summary */}
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.22em] text-white/55 uppercase">Résumé</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>{formatLabel(format)}</Pill>
                        <Pill>{vibeLabel(vibe)}</Pill>
                        <Pill>{bgLabel(background)}</Pill>
                        <Pill>{accessoryLabel(accessory)}</Pill>
                        <Pill>{faithLabel(faithfulness)}</Pill>
                        {dramaticLight ? <Pill>🌗 Lumière</Pill> : null}
                        {battleScars ? <Pill>🩹 Cicatrices</Pill> : null}
                        {glowEyes ? <Pill>✨ Regard</Pill> : null}
                    </div>

                    {(playerAvatarLoading || playerAvatarGenerating) && (
                        <div className="mt-3 text-xs text-white/55">
                            🔥 Le job est en route. Tu peux fermer, on suivra l’avancée via
                            Realtime.
                        </div>
                    )}
                </div>
            </div>
        </UiModal>
    );
}
