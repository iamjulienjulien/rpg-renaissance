"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActionButton, Pill } from "@/components/RpgUi";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type PhotoUploadCategory = "initial" | "final" | "other";

export type UploadedPhotoPayload = {
    photo: {
        id: string;
        user_id: string;
        session_id: string;
        chapter_quest_id: string | null;
        adventure_quest_id: string | null;
        bucket: string;
        path: string;
        mime_type: string | null;
        size: number | null;
        width: number | null;
        height: number | null;
        caption: string | null;
        is_cover: boolean;
        sort: number;
        category: PhotoUploadCategory;
    };
    signed_url: string | null;
};

type Props = {
    // ✅ Quest mode si défini, sinon plain (inventaire, etc.)
    chapterQuestId?: string | null;

    category?: PhotoUploadCategory;
    caption?: string | null;

    // UI
    title?: string;
    subtitle?: string;
    className?: string;

    // Options
    disabled?: boolean;
    autoUpload?: boolean; // si true: upload dès sélection
    maxSizeMb?: number; // défaut 12
    accept?: string; // défaut "image/*"

    // Hooks
    onUploaded?: (payload: UploadedPhotoPayload) => void;
    onError?: (message: string) => void;
};

export default function PhotoUploader(props: Props) {
    const {
        chapterQuestId = null,
        category = "other",
        caption = null,
        title = "Ajouter une photo",
        subtitle = "Glisse une image ici, ou clique pour sélectionner.",
        className,
        disabled = false,
        autoUpload = true,
        maxSizeMb = 12,
        accept = "image/*",
        onUploaded,
        onError,
    } = props;

    const inputRef = useRef<HTMLInputElement | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const modeLabel = useMemo(() => {
        return chapterQuestId ? "Quête" : "Inventaire";
    }, [chapterQuestId]);

    const reset = useCallback(() => {
        setFile(null);
        setPreviewUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return null;
        });
        setError(null);
        setUploading(false);
    }, []);

    const validateFile = useCallback(
        (f: File) => {
            if (!f.type?.startsWith("image/")) return "Le fichier doit être une image.";
            const maxBytes = maxSizeMb * 1024 * 1024;
            if (typeof f.size === "number" && f.size > maxBytes) {
                return `Image trop lourde (max ${maxSizeMb} MB).`;
            }
            return null;
        },
        [maxSizeMb]
    );

    const setSelectedFile = useCallback(
        (f: File | null) => {
            setError(null);

            if (!f) {
                reset();
                return;
            }

            const err = validateFile(f);
            if (err) {
                setError(err);
                onError?.(err);
                return;
            }

            setFile(f);
            setPreviewUrl((old) => {
                if (old) URL.revokeObjectURL(old);
                return URL.createObjectURL(f);
            });
        },
        [onError, reset, validateFile]
    );

    const onPick = useCallback(() => {
        if (disabled || uploading) return;
        inputRef.current?.click();
    }, [disabled, uploading]);

    const upload = useCallback(async () => {
        if (!file) return;
        if (disabled) return;

        setUploading(true);
        setError(null);

        try {
            const form = new FormData();
            form.append("file", file);
            form.append("category", category);
            if (caption) form.append("caption", caption);

            // ✅ Quest mode uniquement si chapterQuestId présent
            if (chapterQuestId) form.append("chapter_quest_id", chapterQuestId);

            // Optionnel: meta
            // form.append("is_cover", "false");
            // form.append("sort", "0");

            const res = await fetch("/api/photos", {
                method: "POST",
                body: form,
            });

            const json = await res.json().catch(() => null);

            if (!res.ok) {
                const msg = json?.error ? String(json.error) : `Upload failed (${res.status})`;
                throw new Error(msg);
            }

            onUploaded?.(json as UploadedPhotoPayload);
        } catch (e: any) {
            const msg = e?.message ? String(e.message) : "Upload failed";
            setError(msg);
            onError?.(msg);
        } finally {
            setUploading(false);
        }
    }, [file, disabled, category, caption, chapterQuestId, onUploaded, onError]);

    // auto-upload quand un fichier est choisi
    React.useEffect(() => {
        if (!autoUpload) return;
        if (!file) return;
        void upload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);

    // drag & drop
    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);

            if (disabled || uploading) return;

            const f = e.dataTransfer.files?.[0] ?? null;
            setSelectedFile(f);
        },
        [disabled, uploading, setSelectedFile]
    );

    const statusPill = useMemo(() => {
        if (uploading) return <Pill>⏳ Upload…</Pill>;
        if (error) return <Pill>⚠️ Erreur</Pill>;
        if (file) return <Pill>✅ Prête</Pill>;
        return <Pill>📷 {modeLabel}</Pill>;
    }, [uploading, error, file, modeLabel]);

    const onUploadClick = useCallback(() => {
        if (uploading || disabled) return;
        void upload();
    }, [upload, uploading, disabled]);

    const onResetClick = useCallback(() => {
        if (uploading) return;
        reset();
    }, [reset, uploading]);

    return (
        <div className={cn("grid gap-3", className)}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[11px] tracking-[0.18em] text-white/55 uppercase">
                        {title}
                    </div>
                    <div className="mt-1 rpg-text-sm text-white/70">{subtitle}</div>
                </div>
                <div className="shrink-0">{statusPill}</div>
            </div>

            <div
                role="button"
                tabIndex={0}
                onClick={onPick}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onPick();
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (disabled || uploading) return;
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                    "relative overflow-hidden rounded-3xl ring-1 transition",
                    "bg-black/25 ring-white/10",
                    "cursor-pointer",
                    dragOver && "ring-white/25 bg-black/30",
                    (disabled || uploading) && "opacity-60 cursor-not-allowed pointer-events-none"
                )}
            >
                {/* Preview */}
                <div className="relative aspect-square w-full">
                    {previewUrl ? (
                        <>
                            <img
                                src={previewUrl}
                                alt="Aperçu"
                                className="h-full w-full object-cover"
                                draggable={false}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                        </>
                    ) : (
                        <div className="grid h-full w-full place-items-center p-8">
                            <div className="text-center">
                                <div className="text-3xl">📷</div>
                                <div className="mt-2 rpg-text-sm text-white/70">
                                    Dépose une photo ici
                                </div>
                                <div className="mt-1 text-xs text-white/45">
                                    JPG / PNG / WEBP, max {maxSizeMb} MB
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Badges */}
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                        <span className="rounded-full bg-black/40 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                            🏷️ {category}
                        </span>
                        {chapterQuestId ? (
                            <span className="rounded-full bg-black/40 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                                🎯 Quête
                            </span>
                        ) : (
                            <span className="rounded-full bg-black/40 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                                🎒 Inventaire
                            </span>
                        )}
                    </div>

                    {/* Footer strip */}
                    <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-end justify-between gap-3">
                            <div className="min-w-0">
                                <div className="truncate text-white/90 font-semibold">
                                    {file ? file.name : "Aucune photo sélectionnée"}
                                </div>
                                <div className="mt-1 text-xs text-white/60 line-clamp-2">
                                    {file ? "Clique pour changer" : "Clique pour sélectionner"}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                {file && !uploading ? (
                                    <>
                                        {!autoUpload ? (
                                            <ActionButton variant="solid" onClick={onUploadClick}>
                                                ⬆️ Envoyer
                                            </ActionButton>
                                        ) : null}

                                        <ActionButton onClick={onResetClick}>🧹 Reset</ActionButton>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setSelectedFile(f);
                        // permet de re-sélectionner le même fichier
                        e.currentTarget.value = "";
                    }}
                />
            </div>

            {error ? (
                <div className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-400/20">
                    ⚠️ {error}
                </div>
            ) : null}
        </div>
    );
}
