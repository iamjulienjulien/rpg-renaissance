"use client";

import React, { useEffect, useState } from "react";
import { UiActionButton, UiCard, UiFormDate, UiFormText, UiPanel } from "../ui";
import { useProfileOptions } from "@/hooks/useProfileOptions";
import { UiFormSelect, type UiFormSelectOption } from "@/components/ui/UiFormSelect";
import { useGameStore, type PatchMePayload } from "@/stores/gameStore";
import { usePlayerProfileDetails } from "@/hooks/usePlayerProfileDetails";
import { usePlayerStore } from "@/stores/playerStore";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import UiImage from "../ui/UiImage";

export function ProfileForm() {
    const {
        user,
        profile,
        session,
        loading,
        saving,
        error,
        bootstrap: charsBootstrap,
        updateDisplayName,
    } = usePlayerStore();

    const { signOut } = useAuthStore();

    const { bootstrap, currentPlayer } = useGameStore();

    const { update, loading: updateLoading } = usePlayerProfileDetails();

    const { openModal } = useUiStore();

    const {
        list: genderOptions,
        loading: optLoading,
        format: formatOptions,
    } = useProfileOptions({ field: "gender" });

    // const charsBootstrap = useGameStore((s) => s.bootstrap);
    const characters = useGameStore((s) => s.characters);
    const selectedId = useGameStore((s) => s.selectedId);
    const activateCharacter = useGameStore((s) => s.activateCharacter);
    const charSaving = useGameStore((s) => s.saving);
    const charError = useGameStore((s) => s.error);

    const [nameDraft, setNameDraft] = useState("");

    const [savedData, setSavedData] = useState<PatchMePayload>({});
    const [draftData, setDraftData] = useState<PatchMePayload>({});

    useEffect(() => {
        void bootstrap();
        void charsBootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        console.info("currentPlayer", currentPlayer);
        let originalData = {};
        if (currentPlayer) {
            if (currentPlayer.first_name) {
                originalData = { ...originalData, first_name: currentPlayer.first_name };
            }
            if (currentPlayer.last_name) {
                originalData = { ...originalData, last_name: currentPlayer.last_name };
            }
            if (currentPlayer.display_name) {
                originalData = { ...originalData, display_name: currentPlayer.display_name };
            }
            if (currentPlayer.details?.gender) {
                originalData = { ...originalData, gender: currentPlayer.details?.gender };
            }
            if (currentPlayer.details?.birth_date) {
                originalData = { ...originalData, birth_date: currentPlayer.details?.birth_date };
            }
        }
        setDraftData(originalData);
        setSavedData(originalData);
    }, [currentPlayer]);

    const [genderOptionsFormatted, setGenderOptionsFormatted] = useState<UiFormSelectOption[]>([]);

    useEffect(() => {
        const formatted = formatOptions(genderOptions);
        console.info("genderOptions", formatted);
        setGenderOptionsFormatted(formatted);
    }, [genderOptions]);

    function onUpdateProfile() {
        console.info("onUpdateProfile", draftData);
        update({ ...draftData });
    }

    return (
        <UiPanel title="Profil" emoji="👤" subtitle="Ce que le jeu sait de toi.">
            <div className="space-y-4">
                {/* {error || charError ? (
                                        <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-white/80 ring-1 ring-red-500/20">
                                            {error ?? charError}
                                        </div>
                                    ) : null} */}

                <div className="flex ">
                    <div className="mr-4">
                        {currentPlayer?.avatar_url && (
                            <UiImage
                                src={currentPlayer?.avatar_url}
                                alt="Avatar"
                                layout="fixed"
                                width={110}
                                height={110}
                                // aspect="square"
                                useNextImage={false}
                                onClick={() => openModal("playerAvatarChange")}
                            />
                        )}
                    </div>
                    <UiCard variant="classic" className="w-full">
                        <div className="flex">
                            <div className="">
                                <div className="text-xs tracking-[0.18em] text-white/55 uppercase">
                                    Email
                                </div>
                                <div className="mt-2 text-sm font-semibold text-white/90">
                                    {user?.email ?? "—"}
                                </div>
                                <div className="mt-2">
                                    <UiActionButton
                                        size="xs"
                                        variant="solid"
                                        onClick={() => {
                                            openModal("playerAvatar");
                                        }}
                                    >
                                        🤳 Avatar
                                    </UiActionButton>
                                </div>
                            </div>
                        </div>
                    </UiCard>
                </div>
                <div className="flex gap-4 mt-6">
                    {/* <UiCard variant="ghost"> */}
                    <UiFormText
                        value={draftData.first_name ?? ""}
                        onChange={(v) => {
                            const next = v == null ? null : String(v);
                            setDraftData((prev) => ({
                                ...prev,
                                first_name: next || null,
                            }));
                        }}
                        tone="neutral"
                        placeholder="Ton prénom"
                        label="Prénom"
                    />
                    {/* </UiCard> */}
                    {/* <UiCard variant="classic"> */}
                    <UiFormText
                        value={draftData.last_name ?? ""}
                        onChange={(v) => {
                            const next = v == null ? null : String(v);
                            setDraftData((prev) => ({
                                ...prev,
                                last_name: next || null,
                            }));
                        }}
                        tone="neutral"
                        placeholder="Ton nom de famille"
                        label="Nom de famille"
                    />
                    {/* </UiCard> */}
                </div>

                {/* <UiCard variant="classic"> */}
                <UiFormText
                    value={draftData.display_name ?? ""}
                    onChange={(v) => {
                        const next = v == null ? null : String(v);
                        setDraftData((prev) => ({
                            ...prev,
                            display_name: next || null,
                        }));
                    }}
                    tone="neutral"
                    placeholder="Ton nom de joueur"
                    label="Nom affiché"
                />
                {/* </UiCard> */}

                {/* <UiCard variant="classic"> */}
                <UiFormSelect
                    label="Genre"
                    options={genderOptionsFormatted}
                    value={draftData.gender ?? ""}
                    onChange={(v) => {
                        const next =
                            v == null ? null : Array.isArray(v) ? String(v[0] ?? "") : String(v);

                        setDraftData((prev) => ({
                            ...prev,
                            gender: next || null,
                        }));
                    }}
                    tone="neutral"
                />
                {/* </UiCard> */}

                {/* <UiCard variant="classic"> */}
                <UiFormDate
                    label="Date de naissance"
                    tone="neutral"
                    // options={genderOptionsFormatted}
                    value={draftData.birth_date ?? ""}
                    onChange={(v) => {
                        const next = v == null ? null : String(v);
                        setDraftData((prev) => ({
                            ...prev,
                            birth_date: next || null,
                        }));
                    }}
                />
                {/* </UiCard> */}

                <div className="flex justify-between mt-6">
                    <UiActionButton variant="soft" disabled={saving} onClick={() => void signOut()}>
                        🚪 Se déconnecter
                    </UiActionButton>
                    <UiActionButton variant="solid" disabled={saving} onClick={onUpdateProfile}>
                        {updateLoading ? "⏳" : "💾 Sauver"}
                    </UiActionButton>
                </div>
            </div>
        </UiPanel>
    );
}
