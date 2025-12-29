// src/components/modals/QuestPhotoUploadModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import UiModal from "@/components/ui/UiModal";
import { ActionButton, Pill } from "@/components/RpgUi";
import { useUiStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores/gameStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type Props = {
    onCreated?: () => void;
};

type PhotoCategory = "initial" | "final" | "other";

type QuestPhotoUploadModalContext = {
    chapter_quest_id?: string | null;
    adventure_quest_id?: string | null;
    quest_title?: string | null;
};

function categoryLabel(c: PhotoCategory) {
    if (c === "initial") return "📸 Initiale";
    if (c === "final") return "🏁 Finale";
    return "📎 Autre";
}

export default function QuestPhotoUploadModal(props: Props) {
    const isOpen = useUiStore((s) => s.isModalOpen("questPhotoUpload"));
    const closeModal = useUiStore((s) => s.closeModal);
    const modalCtx = useUiStore((s) =>
        s.getModalContext<QuestPhotoUploadModalContext>("questPhotoUpload")
    );

    const uploadQuestPhoto = useGameStore((s) => (s as any).uploadQuestPhoto);
    const refreshQuestPhotos = useGameStore((s) => (s as any).refreshQuestPhotos);

    const loadingById = useGameStore((s) => (s as any).questPhotosLoadingByChapterQuestId);
    const errorById = useGameStore((s) => (s as any).questPhotosErrorByChapterQuestId);

    const chapterQuestId = (modalCtx?.chapter_quest_id ?? "").trim();
    const questTitle = (modalCtx?.quest_title ?? "").trim();

    const [file, setFile] = useState<File | null>(null);
    const [category, setCategory] = useState<PhotoCategory>("other");
    const [caption, setCaption] = useState<string>("");
    const [busy, setBusy] = useState(false);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const storeLoading = chapterQuestId ? !!loadingById?.[chapterQuestId] : false;
    const storeError = chapterQuestId ? (errorById?.[chapterQuestId] as string | null) : null;

    useEffect(() => {
        if (!isOpen) return;

        // reset when open
        setFile(null);
        setCategory("other");
        setCaption("");
        setBusy(false);
        setPreviewUrl(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const fileMeta = useMemo(() => {
        if (!file) return null;
        const sizeMb = Math.round((file.size / 1024 / 1024) * 10) / 10;
        return { name: file.name, type: file.type, sizeMb };
    }, [file]);

    const onClose = () => closeModal("questPhotoUpload");

    const canSubmit = !!chapterQuestId && !!file && !busy && !storeLoading;

    const onSubmit = async () => {
        if (!chapterQuestId || !file) return;

        setBusy(true);
        try {
            const res = await uploadQuestPhoto({
                chapter_quest_id: chapterQuestId,
                file,
                category,
                caption: caption.trim() ? caption.trim() : null,
            });

            if (!res?.id) return;

            // refresh list (best-effort)
            void refreshQuestPhotos(chapterQuestId);

            props.onCreated?.();

            onClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <UiModal
            id="questPhotoUpload"
            maxWidth="lg"
            eyebrow="📸 Photos"
            title="Ajouter une photo à la quête"
            closeOnBackdrop
            closeOnEscape
            footer={
                <div className="flex items-center justify-between gap-2">
                    <ActionButton onClick={onClose}>Annuler</ActionButton>
                    <ActionButton
                        variant="solid"
                        disabled={!canSubmit}
                        onClick={() => void onSubmit()}
                    >
                        {busy || storeLoading ? "⏳ Upload…" : "✅ Ajouter"}
                    </ActionButton>
                </div>
            }
        >
            {!chapterQuestId ? (
                <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 text-sm text-white/60">
                    ⚠️ Impossible d’uploader: chapter_quest_id manquant.
                </div>
            ) : (
                <div className="grid gap-3 mt-2">
                    {/* Context */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Contexte
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Pill>🪝 chapter_quest_id OK</Pill>
                            <Pill>{categoryLabel(category)}</Pill>
                        </div>

                        {questTitle ? (
                            <div className="mt-2 text-sm text-white/70">
                                Quête:{" "}
                                <span className="text-white/90 font-semibold">{questTitle}</span>
                            </div>
                        ) : null}

                        <div className="mt-2 text-xs text-white/45 break-all">
                            ID: {chapterQuestId}
                        </div>
                    </div>

                    {/* Error */}
                    {storeError ? (
                        <div className="rounded-2xl bg-rose-400/10 p-3 ring-1 ring-rose-300/20 text-sm text-rose-200">
                            {storeError}
                        </div>
                    ) : null}

                    {/* Category */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Catégorie
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(["initial", "final", "other"] as PhotoCategory[]).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCategory(c)}
                                    className={cn(
                                        "rounded-full px-3 py-1 text-xs ring-1 transition",
                                        category === c
                                            ? "bg-white/10 text-white ring-white/15"
                                            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
                                    )}
                                >
                                    {categoryLabel(c)}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 text-xs text-white/45">
                            Tu peux avoir plusieurs photos “initiale” et “finale”.
                        </div>
                    </div>

                    {/* File picker */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Fichier
                        </div>

                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_160px] sm:items-center">
                            <label
                                className={cn(
                                    "flex items-center justify-between gap-3 rounded-2xl bg-black/30 px-4 py-3",
                                    "ring-1 ring-white/10 hover:ring-white/20 cursor-pointer"
                                )}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] ?? null;
                                        setFile(f);
                                    }}
                                />
                                <span className="text-sm text-white/80">
                                    {file ? file.name : "Choisir une image…"}
                                </span>
                                <span className="text-xs text-white/40">image/*</span>
                            </label>

                            <button
                                type="button"
                                onClick={() => setFile(null)}
                                disabled={!file}
                                className={cn(
                                    "h-10 rounded-xl px-3 text-sm ring-1 ring-white/10",
                                    !file
                                        ? "bg-white/5 text-white/30"
                                        : "bg-white/10 text-white/85 hover:bg-white/15"
                                )}
                            >
                                🧽 Reset
                            </button>
                        </div>

                        {fileMeta ? (
                            <div className="mt-2 text-xs text-white/45">
                                {fileMeta.type || "image"} • {fileMeta.sizeMb} MB
                            </div>
                        ) : null}
                    </div>

                    {/* Preview */}
                    {previewUrl ? (
                        <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Aperçu
                            </div>

                            <div className="mt-2 overflow-hidden rounded-2xl ring-1 ring-white/10 bg-black/30">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="h-[220px] w-full object-cover"
                                />
                            </div>
                        </div>
                    ) : null}

                    {/* Caption */}
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Légende (optionnel)
                        </div>

                        <input
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Ex: Avant de commencer… / Résultat final…"
                            className={cn(
                                "mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                                "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                "focus:ring-2 focus:ring-white/25"
                            )}
                        />
                    </div>

                    {/* Hint */}
                    <div className="text-xs text-white/45">
                        Astuce: si tu veux forcer la netteté et limiter la taille, on pourra ajouter
                        une compression côté client ensuite (canvas).
                    </div>
                </div>
            )}
        </UiModal>
    );
}
