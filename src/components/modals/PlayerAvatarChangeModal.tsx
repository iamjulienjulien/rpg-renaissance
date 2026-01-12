// src/components/modals/PlayerAvatarChangeModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UiModal } from "@/components/ui/UiModal";
import { ActionButton, Pill } from "@/components/RpgUi";
import UiSpinner from "@/components/ui/UiSpinner";
import { useUiStore } from "@/stores/uiStore";
import { useToastStore } from "@/stores/toastStore";
import { useGameStore } from "@/stores/gameStore";
import { UiActionButton, UiChip } from "../ui";
import UiImage from "../ui/UiImage";
import { getAvatarGroupOptions } from "@/lib/avatar/avatarOptionsHelpers";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type Props = {
    onClosed?: () => void;
};

type PlayerPhoto = {
    id: string;
    kind: string;
    url?: string | null;
    created_at?: string | null;
    alt_text?: string | null;
    caption?: string | null;
    is_active?: boolean | null;
    avatar_variant?: string | null;
    avatar_format?: string | null;
};

export default function PlayerAvatarChangeModal(props: Props) {
    const isOpen = useUiStore((s) => s.isModalOpen("playerAvatarChange"));
    const closeModal = useUiStore((s) => s.closeModal);

    const toast = useToastStore();

    const saving = useGameStore((s) => (s as any).saving as boolean | undefined);
    const updateMe = useGameStore((s) => (s as any).updateMe as undefined | ((p: any) => any));
    const currentPlayer = useGameStore((s) => (s as any).currentPlayer as any | null);

    const avatars = useMemo<PlayerPhoto[]>(() => {
        const photos = (currentPlayer as any)?.photos ?? [];
        const arr = Array.isArray(photos) ? photos : [];
        return arr
            .filter((p: any) => p?.kind === "avatar_generated")
            .map((p: any) => ({
                id: String(p.id),
                kind: String(p.kind),
                url: p.url ?? null,
                created_at: p.created_at ?? null,
                alt_text: p.alt_text ?? null,
                caption: p.caption ?? null,
                is_active: p.is_active ?? null,
                avatar_variant: p.avatar_variant ?? null,
                avatar_format: p.avatar_format ?? null,
            }));
    }, [currentPlayer]);

    const currentAvatarUrl = useMemo(() => {
        // best-effort: on lit avatar_url depuis currentPlayer si présent, sinon null
        return ((currentPlayer as any)?.avatar_url as string | null) ?? null;
    }, [currentPlayer]);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isHardBusy = submitting || !!saving;

    const avatarVibeOptions = getAvatarGroupOptions("vibe");
    console.log(avatarVibeOptions);

    function getAvatarVibeLabel(slug: string) {
        const vibeOptions = avatarVibeOptions.find((o) => o.slug == slug) ?? null;

        if (!vibeOptions) {
            return slug;
        }

        return `${vibeOptions.emoji} ${vibeOptions.label}`;
    }

    useEffect(() => {
        if (!isOpen) return;

        // Pré-sélection: avatar correspondant à avatar_url si dispo, sinon 1er avatar
        const byUrl = currentAvatarUrl
            ? avatars.find((a) => a.url && a.url === currentAvatarUrl)
            : null;

        setSelectedId(byUrl?.id ?? avatars[0]?.id ?? null);
        setSubmitting(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const onClose = () => {
        closeModal("playerAvatarChange");
        props.onClosed?.();
    };

    const selectedAvatar = useMemo(() => {
        if (!selectedId) return null;
        return avatars.find((a) => a.id === selectedId) ?? null;
    }, [avatars, selectedId]);

    const canSubmit = !!selectedAvatar?.url && !isHardBusy;

    const onSubmit = async () => {
        if (!updateMe) {
            toast.error("Profil", "updateMe manquant dans gameStore.");
            return;
        }

        if (!selectedAvatar?.url) {
            toast.error("Avatar", "Avatar invalide (URL manquante).");
            return;
        }

        setSubmitting(true);
        try {
            const ok = await updateMe({ avatar_url: selectedAvatar.url });
            if (!ok) return;

            toast.success("Avatar", "Avatar mis à jour ✅");
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Avatar", "Erreur réseau.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <UiModal
            id="playerAvatarChange"
            maxWidth="3xl"
            eyebrow="🧙‍♂️ Avatar"
            title="Changer d’avatar"
            closeOnBackdrop
            closeOnEscape
            footer={
                <div className="flex items-center justify-between gap-2">
                    <UiActionButton onClick={onClose} disabled={isHardBusy}>
                        Fermer
                    </UiActionButton>

                    <ActionButton
                        variant="solid"
                        disabled={!canSubmit}
                        onClick={() => void onSubmit()}
                    >
                        {isHardBusy ? <UiSpinner speed="slow" /> : "✅ Utiliser cet avatar"}
                    </ActionButton>
                </div>
            }
        >
            <div className="grid gap-3 mt-2">
                {/* Intro */}
                {/* <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                    <div className="text-sm text-white/75 leading-7">
                        Choisis parmi tes avatars déjà forgés. Celui-ci deviendra ton visage
                        officiel dans le jeu. 👤✨
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>🖼️ Avatars générés</Pill>
                        <Pill>✅ Sélection</Pill>
                        <Pill>⚡ Update profil</Pill>
                    </div>
                </div> */}

                {/* Empty state */}
                {!avatars.length ? (
                    <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/10 text-sm text-white/70">
                        Aucun avatar généré pour l’instant.
                        <div className="mt-2 text-xs text-white/45">
                            Génère-en un depuis la modal de création d’avatar.
                        </div>
                    </div>
                ) : null}

                {/* Grid */}
                {avatars.length ? (
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        {/* <div className="flex items-center justify-between gap-2">
                            <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                                Avatars
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Pill>📦 {avatars.length}</Pill>
                            </div>
                        </div> */}

                        <div className="grid gap-3 sm:grid-cols-3">
                            {avatars.map((a, idx) => {
                                const selected = a.id === selectedId;
                                const imgUrl = a.url ?? null;

                                return (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => setSelectedId(a.id)}
                                        disabled={isHardBusy}
                                        className={cn(
                                            "relative overflow-hiden rounded-2xl ring-1 bg-black/30 text-left transition",
                                            selected
                                                ? "ring-white/30"
                                                : "ring-white/10 hover:ring-white/20",
                                            isHardBusy && "opacity-60 pointer-events-none"
                                        )}
                                        title="Sélectionner"
                                    >
                                        {/* <div className="h- w-ful"> */}
                                        {imgUrl ? (
                                            <UiImage
                                                src={imgUrl}
                                                alt={a.alt_text ?? `Avatar ${idx + 1}`}
                                                aspect="square"
                                                filter={selected ? "soft" : "bw"}
                                                // useNextImage={false}
                                            />
                                        ) : (
                                            // // eslint-disable-next-line @next/next/no-img-element
                                            // <img
                                            //     src={imgUrl}
                                            //     alt={a.alt_text ?? `Avatar ${idx + 1}`}
                                            //     className="h-full w-full object-cover"
                                            // />
                                            <div className="h-full w-full flex items-center justify-center text-white/40 text-sm">
                                                Image indisponible
                                            </div>
                                        )}
                                        {/* </div> */}

                                        {/* <div
                                            className={cn(
                                                "absolute left-2 top-2 rounded-full px-2 py-1 text-[11px] ring-1",
                                                selected
                                                    ? "bg-emerald-500/20 text-emerald-100 ring-emerald-400/30"
                                                    : "bg-black/55 text-white/75 ring-white/10"
                                            )}
                                        > */}
                                        <div className="absolute left-2 top-2 flex gap-2">
                                            <UiChip tone={selected ? "emerald" : "neutral"}>
                                                {selected ? "✅ Sélectionné" : "➕ Choisir"}
                                            </UiChip>
                                        </div>
                                        {/* </div> */}

                                        <div className="absolute bottom-2 left-2 flex gap-2">
                                            {/* <span className="rounded-full bg-black/55 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                                                #{idx + 1}
                                            </span> */}
                                            {a.avatar_variant ? (
                                                <UiChip>
                                                    {getAvatarVibeLabel(a.avatar_variant)}
                                                </UiChip>
                                            ) : null}
                                            {/* {a.avatar_format ? (
                                                <span className="rounded-full bg-black/55 px-2 py-1 text-[11px] text-white/75 ring-1 ring-white/10">
                                                    {a.avatar_format}
                                                </span>
                                            ) : null} */}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* <div className="mt-2 text-xs text-white/45">
                            Tip: garde 1 avatar “sobre” (studio) et 1 avatar “story” (décor) selon
                            le contexte.
                        </div> */}
                    </div>
                ) : null}

                {/* Preview / Summary */}
                {/* {avatars.length ? (
                    <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                        <div className="text-xs tracking-[0.22em] text-white/55 uppercase">
                            Sélection
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                            <Pill>
                                {selectedAvatar ? `🖼️ ${selectedAvatar.id.slice(0, 8)}…` : "—"}
                            </Pill>
                            {selectedAvatar?.avatar_variant ? (
                                <Pill>🧙 {selectedAvatar.avatar_variant}</Pill>
                            ) : null}
                            {selectedAvatar?.avatar_format ? (
                                <Pill>🖼️ {selectedAvatar.avatar_format}</Pill>
                            ) : null}
                            {currentAvatarUrl && selectedAvatar?.url === currentAvatarUrl ? (
                                <Pill>✅ Déjà actif</Pill>
                            ) : null}
                        </div>

                        {isHardBusy ? (
                            <div className="mt-3 text-xs text-white/55">
                                ⏳ Mise à jour en cours…
                            </div>
                        ) : null}
                    </div>
                ) : null} */}
            </div>
        </UiModal>
    );
}
