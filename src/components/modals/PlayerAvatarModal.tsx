// src/components/modals/PlayerAvatarModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UiModal } from "@/components/ui/UiModal";
import { ActionButton, Pill } from "@/components/RpgUi";
import { useUiStore } from "@/stores/uiStore";
import { useToastStore } from "@/stores/toastStore";
import { useGameStore } from "@/stores/gameStore";
import { useAiStore } from "@/stores/aiStore";
import UiSpinner from "../ui/UiSpinner";

import {
    getAvatarGroup,
    getAvatarGroups,
    getAvatarDefaults,
    normalizeAvatarOptions,
    type AvatarGroup,
    type AvatarOptionsKey,
    type PlayerAvatarOptions,
} from "@/lib/avatar/avatarOptionsHelpers";
import { UiActionButton } from "../ui";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type Props = {
    onClosed?: () => void;
    setWaitForPlayerAvatar: (value: boolean) => void;
};

type Preview = { id: string; file: File; url: string };

type PlayerPhoto = {
    id: string;
    kind: string;
    url?: string | null; // signedUrl (API)
    created_at?: string | null;
    alt_text?: string | null;
    caption?: string | null;
};

type SourceMode = "library" | "upload";

function groupTitle(g: AvatarGroup) {
    return `${g.emoji ? `${g.emoji} ` : ""}${g.label}`;
}

function optionChipLabel(o: { emoji?: string; label: string }) {
    return `${o.emoji ? `${o.emoji} ` : ""}${o.label}`;
}

export default function PlayerAvatarModal(props: Props) {
    const isOpen = useUiStore((s) => s.isModalOpen("playerAvatar"));
    const closeModal = useUiStore((s) => s.closeModal);

    const toast = useToastStore();

    const currentUserId = useGameStore((s) => s.currentUserId);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);

    // currentPlayer from store (assume it contains photos[])
    const currentPlayer = useGameStore((s) => (s as any).currentPlayer as any | null);

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

    const busy = !!playerAvatarLoading || !!playerAvatarGenerating;

    // ✅ Portraits library from currentPlayer.photos
    const libraryPortraits = useMemo<PlayerPhoto[]>(() => {
        const photos = (currentPlayer as any)?.photos ?? [];
        const arr = Array.isArray(photos) ? photos : [];
        return arr
            .filter((p: any) => p?.kind === "portrait_source")
            .map((p: any) => ({
                id: String(p.id),
                kind: String(p.kind),
                url: p.url ?? null,
                created_at: p.created_at ?? null,
                alt_text: p.alt_text ?? null,
                caption: p.caption ?? null,
            }));
    }, [currentPlayer]);

    const [sourceMode, setSourceMode] = useState<SourceMode>("library");
    const [selectedPortraitIds, setSelectedPortraitIds] = useState<string[]>([]);

    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<Preview[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Options state is now a single object (JSON is the source of truth)
    const defaults = useMemo(() => getAvatarDefaults(), []);
    const [opt, setOpt] = useState<PlayerAvatarOptions>(defaults);

    const isHardBusy = submitting || busy;

    // Memo: option groups for UI rendering
    const groups = useMemo(() => getAvatarGroups(), []);

    // Helpers: convenient getters for selected option labels in summary pills
    const selectedEnumOption = (key: AvatarOptionsKey, slug: string) => {
        const g = getAvatarGroup(key);
        if (!g) return null;
        return (g.options ?? []).find((o) => o.slug === slug) ?? null;
    };

    // Reset when opening
    useEffect(() => {
        if (!isOpen) return;

        setSourceMode("library");
        setSelectedPortraitIds([]);
        setFiles([]);
        setPreviews([]);
        setOpt(getAvatarDefaults());
        setSubmitting(false);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Build previews for uploaded files
    useEffect(() => {
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

    const selectedCount = selectedPortraitIds.length;
    const uploadCount = files.length;
    const totalCount = selectedCount + uploadCount;

    const canSubmit =
        totalCount >= 1 &&
        totalCount <= 5 &&
        !submitting &&
        !playerAvatarLoading &&
        !playerAvatarGenerating;

    const fileMeta = useMemo(() => {
        const total = files.reduce((acc, f) => acc + f.size, 0);
        const mb = Math.round((total / 1024 / 1024) * 10) / 10;
        return { count: files.length, totalMb: mb };
    }, [files]);

    const togglePortrait = (id: string) => {
        setSelectedPortraitIds((prev) => {
            const has = prev.includes(id);
            if (has) return prev.filter((x) => x !== id);
            if (prev.length + files.length >= 5) return prev;
            return [...prev, id];
        });
    };

    const onPickFiles = (incoming: FileList | null) => {
        if (!incoming) return;

        const imgs = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
        const remaining = Math.max(0, 5 - selectedPortraitIds.length);
        setFiles(imgs.slice(0, remaining));
    };

    const onRemoveOne = (idx: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const resetSources = () => {
        setSelectedPortraitIds([]);
        setFiles([]);
    };

    // Update option helpers
    const setEnum = (key: AvatarOptionsKey, slug: string) => {
        setOpt((prev) => normalizeAvatarOptions({ ...prev, [key]: slug }));
    };

    const setBool = (key: AvatarOptionsKey, value: boolean) => {
        setOpt((prev) => normalizeAvatarOptions({ ...prev, [key]: value }));
    };

    const setNotes = (value: string) => {
        setOpt((prev) => normalizeAvatarOptions({ ...prev, notes: value }));
    };

    // Payload mapping: we now send the normalized option keys expected by backend
    // (dramatic_light, battle_scars, glow_eyes)
    function toApiOptions(o: PlayerAvatarOptions) {
        const n = normalizeAvatarOptions(o);
        return {
            format: n.format,
            vibe: n.vibe,
            background: n.background,
            accessory: n.accessory,
            faithfulness: n.faithfulness,

            dramatic_light: !!n.dramatic_light,
            battle_scars: !!n.battle_scars,
            glow_eyes: !!n.glow_eyes,

            notes: n.notes ?? undefined,
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

        if (totalCount < 1) {
            toast.error("Avatar", "Choisis au moins 1 portrait.");
            return;
        }
        if (totalCount > 5) {
            toast.error("Avatar", "Maximum 5 portraits.");
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

            // 2) existing + uploads -> photo_ids
            const photoIds: string[] = [];

            for (const id of selectedPortraitIds) {
                if (typeof id === "string" && id.trim()) photoIds.push(id.trim());
            }

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

            const uniquePhotoIds = Array.from(new Set(photoIds)).slice(0, 5);

            if (!uniquePhotoIds.length) {
                toast.error("Avatar", "Aucune photo valide.");
                return;
            }

            const res = await generatePlayerAvatar({
                user_id: uid,
                photo_ids: uniquePhotoIds,
                options: toApiOptions(opt),
            });

            if (!res?.jobId) {
                toast.error("Avatar", "Impossible de lancer la génération.");
                return;
            }

            toast.info("Avatar", "⏳ Génération en cours.", null);
            props.setWaitForPlayerAvatar(true);
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Avatar", "Erreur réseau.");
        } finally {
            setSubmitting(false);
        }
    };

    // Summary labels (from JSON)
    const formatPicked = selectedEnumOption("format", opt.format);
    const vibePicked = selectedEnumOption("vibe", opt.vibe);
    const bgPicked = selectedEnumOption("background", opt.background);
    const accPicked = selectedEnumOption("accessory", opt.accessory);
    const faithPicked = selectedEnumOption("faithfulness", opt.faithfulness);

    return (
        <UiModal
            id="playerAvatar"
            maxWidth="3xl"
            eyebrow="🧙‍♂️ Avatar"
            title="Créer ton portrait fantasy"
            closeOnBackdrop={false}
            closeOnEscape
            footer={
                <div className="flex items-center justify-between gap-2">
                    <UiActionButton variant="soft" onClick={onClose} disabled={isHardBusy}>
                        Annuler
                    </UiActionButton>

                    <UiActionButton
                        variant="magic"
                        disabled={!canSubmit}
                        onClick={() => void onSubmit()}
                    >
                        {isHardBusy ? <UiSpinner speed="slow" /> : "✨ Générer"}
                    </UiActionButton>
                </div>
            }
        >
            <div className="grid gap-3 mt-2">
                {/* Intro */}
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="text-sm text-white/75 leading-7">
                        Choisis 1 à 5 portraits (déjà uploadés ou nouveaux), puis une vibe fantasy.
                        Ensuite, ton MJ mécanique peindra une version épique de toi. 🗡️📜
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>📌 1–5 portraits</Pill>
                        <Pill>🎭 Style fantasy</Pill>
                        <Pill>🧠 Job async</Pill>
                    </div>
                </div>

                {/* Portraits picker */}
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Portraits
                        </div>

                        <button
                            type="button"
                            onClick={resetSources}
                            disabled={isHardBusy || totalCount === 0}
                            className={cn(
                                "h-9 rounded-xl px-3 text-xs ring-1 ring-white/10 transition",
                                isHardBusy || totalCount === 0
                                    ? "bg-white/5 text-white/30"
                                    : "bg-white/10 text-white/85 hover:bg-white/15"
                            )}
                        >
                            🧽 Reset
                        </button>
                    </div>

                    {/* Mode toggle */}
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <button
                            type="button"
                            onClick={() => setSourceMode("library")}
                            disabled={isHardBusy}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs ring-1 transition",
                                sourceMode === "library"
                                    ? "bg-white/10 text-white ring-white/15"
                                    : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                isHardBusy && "opacity-60 pointer-events-none"
                            )}
                        >
                            🗂️ Mes portraits
                        </button>

                        <button
                            type="button"
                            onClick={() => setSourceMode("upload")}
                            disabled={isHardBusy}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs ring-1 transition",
                                sourceMode === "upload"
                                    ? "bg-white/10 text-white ring-white/15"
                                    : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                isHardBusy && "opacity-60 pointer-events-none"
                            )}
                        >
                            ⬆️ Uploader
                        </button>

                        <div className="ml-auto flex flex-wrap gap-2">
                            <Pill>✅ {selectedCount}</Pill>
                            <Pill>⬆️ {uploadCount}</Pill>
                            <Pill>📌 {totalCount}/5</Pill>
                        </div>
                    </div>

                    {/* LIBRARY */}
                    {sourceMode === "library" ? (
                        <div className="mt-3">
                            {libraryPortraits.length ? (
                                <div className="grid gap-2 sm:grid-cols-3">
                                    {libraryPortraits.map((p, idx) => {
                                        const selected = selectedPortraitIds.includes(p.id);
                                        const imgUrl = p.url ?? null;

                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => togglePortrait(p.id)}
                                                disabled={isHardBusy}
                                                className={cn(
                                                    "relative overflow-hidden rounded-2xl ring-1 bg-black/30 text-left transition",
                                                    selected
                                                        ? "ring-white/30"
                                                        : "ring-white/10 hover:ring-white/20",
                                                    isHardBusy && "opacity-60 pointer-events-none"
                                                )}
                                                title="Sélectionner / désélectionner"
                                            >
                                                <div className="h-[140px] w-full">
                                                    {imgUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={imgUrl}
                                                            alt={
                                                                p.alt_text ?? `Portrait ${idx + 1}`
                                                            }
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-white/40 text-sm">
                                                            Image indisponible
                                                        </div>
                                                    )}
                                                </div>

                                                <div
                                                    className={cn(
                                                        "absolute left-2 top-2 rounded-full px-2 py-1 text-[11px] ring-1",
                                                        selected
                                                            ? "bg-emerald-500/20 text-emerald-100 ring-emerald-400/30"
                                                            : "bg-black/55 text-white/75 ring-white/10"
                                                    )}
                                                >
                                                    {selected ? "✅ Sélectionné" : "➕ Choisir"}
                                                </div>

                                                <div className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                                                    #{idx + 1}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="mt-3 rounded-2xl bg-black/30 p-3 ring-1 ring-white/10 text-sm text-white/70">
                                    Aucun portrait trouvé. Va sur <b>Uploader</b> pour en ajouter.
                                </div>
                            )}

                            <div className="mt-2 text-xs text-white/45">
                                Conseil: 2–3 portraits cohérents (lumière similaire) donnent souvent
                                le meilleur résultat.
                            </div>
                        </div>
                    ) : null}

                    {/* UPLOAD */}
                    {sourceMode === "upload" ? (
                        <div className="mt-3">
                            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_160px] sm:items-center">
                                <label
                                    className={cn(
                                        "flex items-center justify-between gap-3 rounded-2xl bg-black/30 px-4 py-3",
                                        "ring-1 ring-white/10 hover:ring-white/20 cursor-pointer",
                                        isHardBusy && "opacity-60 pointer-events-none"
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
                                    <span className="text-xs text-white/40">
                                        reste {Math.max(0, 5 - selectedPortraitIds.length)}
                                    </span>
                                </label>

                                <button
                                    type="button"
                                    onClick={() => setFiles([])}
                                    disabled={files.length === 0 || isHardBusy}
                                    className={cn(
                                        "h-10 rounded-xl px-3 text-sm ring-1 ring-white/10",
                                        files.length === 0 || isHardBusy
                                            ? "bg-white/5 text-white/30"
                                            : "bg-white/10 text-white/85 hover:bg-white/15"
                                    )}
                                >
                                    🧽 Reset upload
                                </button>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/45">
                                <span>{fileMeta.count} fichier(s)</span>
                                <span>•</span>
                                <span>{fileMeta.totalMb} MB</span>
                                <span>•</span>
                                <span>Visage net, fond simple, lumière douce.</span>
                            </div>

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
                                                alt={`Portrait upload ${idx + 1}`}
                                                className="h-[140px] w-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => onRemoveOne(idx)}
                                                disabled={isHardBusy}
                                                className={cn(
                                                    "absolute right-2 top-2 rounded-full px-2 py-1 text-xs",
                                                    "bg-black/55 text-white/85 ring-1 ring-white/15 hover:bg-black/70",
                                                    isHardBusy && "opacity-60 pointer-events-none"
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
                    ) : null}
                </div>

                {/* Options (rendered from JSON) */}
                <div className="grid gap-3 sm:grid-cols-2">
                    {groups
                        .filter((g) => g.type === "enum" && g.key !== "faithfulness")
                        .map((g) => (
                            <div
                                key={g.key}
                                className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10"
                            >
                                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                    {groupTitle(g)}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-2">
                                    {(g.options ?? []).map((o) => (
                                        <button
                                            key={o.slug}
                                            type="button"
                                            onClick={() => setEnum(g.key, o.slug)}
                                            disabled={isHardBusy}
                                            className={cn(
                                                "rounded-full px-3 py-1 text-xs ring-1 transition",
                                                (opt as any)[g.key] === o.slug
                                                    ? "bg-white/10 text-white ring-white/15"
                                                    : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                                isHardBusy && "opacity-60 pointer-events-none"
                                            )}
                                            title={o.description ?? undefined}
                                        >
                                            {optionChipLabel(o)}
                                        </button>
                                    ))}
                                </div>

                                {g.options?.some((o) => o.description) ? (
                                    <div className="mt-2 text-xs text-white/45">
                                        {(g.options ?? []).find(
                                            (o) => o.slug === (opt as any)[g.key]
                                        )?.description ?? ""}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                </div>

                {/* Style (faithfulness + boolean toggles from JSON) */}
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                {groupTitle(
                                    getAvatarGroup("faithfulness") ?? {
                                        key: "faithfulness",
                                        label: "Style",
                                        emoji: "🎭",
                                        type: "enum",
                                        options: [],
                                    }
                                )}
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                                Ajuste la fidélité et quelques “épices”.
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {(getAvatarGroup("faithfulness")?.options ?? []).map((o) => (
                                <button
                                    key={o.slug}
                                    type="button"
                                    onClick={() => setEnum("faithfulness", o.slug)}
                                    disabled={isHardBusy}
                                    className={cn(
                                        "rounded-full px-3 py-1 text-xs ring-1 transition",
                                        opt.faithfulness === o.slug
                                            ? "bg-white/10 text-white ring-white/15"
                                            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                        isHardBusy && "opacity-60 pointer-events-none"
                                    )}
                                    title={o.description ?? undefined}
                                >
                                    {optionChipLabel(o)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {(["dramatic_light", "battle_scars", "glow_eyes"] as AvatarOptionsKey[])
                            .map((k) => getAvatarGroup(k))
                            .filter(Boolean)
                            .map((g) => {
                                const gg = g as AvatarGroup;
                                const o0 = gg.options?.[0];
                                const checked = !!(opt as any)[gg.key];

                                return (
                                    <label
                                        key={gg.key}
                                        className={cn(
                                            "flex items-center justify-between gap-3 rounded-2xl px-3 py-2",
                                            "bg-black/30 ring-1 ring-white/10 hover:ring-white/20 cursor-pointer",
                                            isHardBusy && "opacity-60 pointer-events-none"
                                        )}
                                        title={o0?.description ?? undefined}
                                    >
                                        <span className="text-sm text-white/75">
                                            {optionChipLabel({
                                                emoji: gg.emoji ?? o0?.emoji,
                                                label: gg.label,
                                            })}
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => setBool(gg.key, e.target.checked)}
                                        />
                                    </label>
                                );
                            })}
                    </div>
                </div>

                {/* Notes (from JSON group "notes") */}
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                        {groupTitle(
                            getAvatarGroup("notes") ?? {
                                key: "notes",
                                label: "Notes",
                                emoji: "📝",
                                type: "string",
                                options: [],
                            }
                        )}
                    </div>

                    <textarea
                        value={opt.notes ?? ""}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={
                            getAvatarGroup("notes")?.options?.[0]?.description
                                ? "Ex: cheveux longs, barbe courte, pas d’armure lourde…"
                                : "Instructions…"
                        }
                        disabled={isHardBusy}
                        className={cn(
                            "mt-2 min-h-[88px] w-full resize-none rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                            "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                            "focus:ring-2 focus:ring-white/25",
                            isHardBusy && "opacity-60"
                        )}
                    />
                    {getAvatarGroup("notes")?.options?.[0]?.description ? (
                        <div className="mt-2 text-xs text-white/45">
                            {getAvatarGroup("notes")?.options?.[0]?.description}
                        </div>
                    ) : null}
                </div>

                {/* Summary */}
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="text-xs tracking-[0.22em] text-white/55 uppercase">Résumé</div>

                    <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>📸 {totalCount}/5 portraits</Pill>

                        {formatPicked ? <Pill>{optionChipLabel(formatPicked)}</Pill> : null}
                        {vibePicked ? <Pill>{optionChipLabel(vibePicked)}</Pill> : null}
                        {bgPicked ? <Pill>{optionChipLabel(bgPicked)}</Pill> : null}
                        {accPicked ? <Pill>{optionChipLabel(accPicked)}</Pill> : null}
                        {faithPicked ? <Pill>{optionChipLabel(faithPicked)}</Pill> : null}

                        {opt.dramatic_light ? <Pill>💡 Dramatique</Pill> : null}
                        {opt.battle_scars ? <Pill>🩹 Cicatrices</Pill> : null}
                        {opt.glow_eyes ? <Pill>👁️ Yeux</Pill> : null}
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
