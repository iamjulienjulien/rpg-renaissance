"use client";

import React, { useEffect, useState } from "react";
import { UiActionButton, UiPanel } from "../ui";
import { useProfileOptions } from "@/hooks/useProfileOptions";
import { UiFormSelect, type UiFormSelectOption } from "@/components/ui/UiFormSelect";
import { useGameStore, type PatchMePayload } from "@/stores/gameStore";
import { usePlayerProfileDetails } from "@/hooks/usePlayerProfileDetails";

export function ProfileDetailsForm() {
    const [savedData, setSavedData] = useState<PatchMePayload>({});
    const [draftData, setDraftData] = useState<PatchMePayload>({});

    // Options
    const { list: lifeRythmOptions } = useProfileOptions({ field: "life_rhythm" });
    const { list: energyPeakOptions } = useProfileOptions({ field: "energy_peak" });
    const { list: dailyTimeBudgetOptions } = useProfileOptions({ field: "daily_time_budget" });

    const { list: effortStyleOptions } = useProfileOptions({ field: "effort_style" });
    const { list: challengePreferenceOptions } = useProfileOptions({
        field: "challenge_preference",
    });

    const { list: motivationPrimaryOptions } = useProfileOptions({ field: "motivation_primary" });
    const { list: failureResponseOptions } = useProfileOptions({ field: "failure_response" });

    const { list: authorityRelationOptions } = useProfileOptions({ field: "authority_relation" });
    const { list: symbolismRelationOptions } = useProfileOptions({ field: "symbolism_relation" });

    const { format: formatOptions } = useProfileOptions();
    const { update, loading: updateLoading } = usePlayerProfileDetails();
    const { currentPlayer } = useGameStore();

    // Hydrate depuis currentPlayer.details
    useEffect(() => {
        let originalData: PatchMePayload = {};

        if (currentPlayer?.details) {
            const d = currentPlayer.details;

            if (d.life_rhythm) originalData = { ...originalData, life_rhythm: d.life_rhythm };
            if (d.energy_peak) originalData = { ...originalData, energy_peak: d.energy_peak };
            if (d.daily_time_budget)
                originalData = { ...originalData, daily_time_budget: d.daily_time_budget };

            if (d.effort_style) originalData = { ...originalData, effort_style: d.effort_style };
            if (d.challenge_preference)
                originalData = { ...originalData, challenge_preference: d.challenge_preference };

            if (d.motivation_primary)
                originalData = { ...originalData, motivation_primary: d.motivation_primary };
            if (d.failure_response)
                originalData = { ...originalData, failure_response: d.failure_response };

            if (d.authority_relation)
                originalData = { ...originalData, authority_relation: d.authority_relation };

            if (d.symbolism_relation)
                originalData = { ...originalData, symbolism_relation: d.symbolism_relation };
        }

        setDraftData(originalData);
        setSavedData(originalData);
    }, [currentPlayer]);

    // Formatters -> UiFormSelectOption[]
    const [lifeRythmOptionsFormatted, setLifeRythmOptionsFormatted] = useState<
        UiFormSelectOption[]
    >([]);
    const [energyPeakOptionsFormatted, setEnergyPeakOptionsFormatted] = useState<
        UiFormSelectOption[]
    >([]);
    const [dailyTimeBudgetOptionsFormatted, setDailyTimeBudgetOptionsFormatted] = useState<
        UiFormSelectOption[]
    >([]);

    const [effortStyleOptionsFormatted, setEffortStyleOptionsFormatted] = useState<
        UiFormSelectOption[]
    >([]);
    const [challengePreferenceOptionsFormatted, setChallengePreferenceOptionsFormatted] = useState<
        UiFormSelectOption[]
    >([]);

    const [motivationPrimaryOptionsFormatted, setMotivationPrimaryOptionsFormatted] = useState<
        UiFormSelectOption[]
    >([]);
    const [failureResponseOptionsFormatted, setFailureResponseOptionsFormatted] = useState<
        UiFormSelectOption[]
    >([]);

    const [authorityRelationOptionsFormatted, setAuthorityRelationOptionsFormatted] = useState<
        UiFormSelectOption[]
    >([]);
    const [symbolismRelationOptionsFormatted, setSymbolismRelationOptionsFormatted] = useState<
        UiFormSelectOption[]
    >([]);

    useEffect(
        () => setLifeRythmOptionsFormatted(formatOptions(lifeRythmOptions)),
        [lifeRythmOptions]
    );
    useEffect(
        () => setEnergyPeakOptionsFormatted(formatOptions(energyPeakOptions)),
        [energyPeakOptions]
    );
    useEffect(
        () => setDailyTimeBudgetOptionsFormatted(formatOptions(dailyTimeBudgetOptions)),
        [dailyTimeBudgetOptions]
    );

    useEffect(
        () => setEffortStyleOptionsFormatted(formatOptions(effortStyleOptions)),
        [effortStyleOptions]
    );
    useEffect(
        () => setChallengePreferenceOptionsFormatted(formatOptions(challengePreferenceOptions)),
        [challengePreferenceOptions]
    );

    useEffect(
        () => setMotivationPrimaryOptionsFormatted(formatOptions(motivationPrimaryOptions)),
        [motivationPrimaryOptions]
    );
    useEffect(
        () => setFailureResponseOptionsFormatted(formatOptions(failureResponseOptions)),
        [failureResponseOptions]
    );

    useEffect(
        () => setAuthorityRelationOptionsFormatted(formatOptions(authorityRelationOptions)),
        [authorityRelationOptions]
    );
    useEffect(
        () => setSymbolismRelationOptionsFormatted(formatOptions(symbolismRelationOptions)),
        [symbolismRelationOptions]
    );

    function coerceSelectValue(v: any): string | null {
        if (v == null) return null;
        if (Array.isArray(v)) return v.length ? String(v[0] ?? "") || null : null;
        return String(v) || null;
    }

    function onUpdateProfile() {
        update({ ...draftData });
    }

    return (
        <UiPanel
            title="Feuille de personnage"
            emoji="📜"
            subtitle="Aide le Maître du Jeu à mieux te comprendre."
        >
            <div className="space-y-6">
                {/* ============================================================
                ⏳ RYTHME & ÉNERGIE
                ============================================================ */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/90">⏳ Rythme & énergie</h3>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Comment se déroule ta vie en ce moment ?
                        </p>
                        <UiFormSelect
                            options={lifeRythmOptionsFormatted}
                            value={draftData.life_rhythm ?? ""}
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    life_rhythm: coerceSelectValue(v),
                                }))
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            À quel moment es-tu le plus disponible mentalement ?
                        </p>
                        <UiFormSelect
                            options={energyPeakOptionsFormatted}
                            value={draftData.energy_peak ?? ""}
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    energy_peak: coerceSelectValue(v),
                                }))
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Quel temps réaliste peux-tu consacrer chaque jour ?
                        </p>
                        <UiFormSelect
                            options={dailyTimeBudgetOptionsFormatted}
                            value={draftData.daily_time_budget ?? ""}
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    daily_time_budget: coerceSelectValue(v),
                                }))
                            }
                        />
                    </div>
                </section>

                {/* ============================================================
                ⚔️ STYLE DE JEU
                ============================================================ */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/90">⚔️ Style de progression</h3>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Comment avances-tu quand tu es engagé dans une quête ?
                        </p>
                        <UiFormSelect
                            options={effortStyleOptionsFormatted}
                            value={draftData.effort_style ?? ""}
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    effort_style: coerceSelectValue(v),
                                }))
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Préfères-tu la sécurité ou le défi ?
                        </p>
                        <UiFormSelect
                            options={challengePreferenceOptionsFormatted}
                            value={draftData.challenge_preference ?? ""}
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    challenge_preference: coerceSelectValue(v),
                                }))
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Qu’est-ce qui te motive le plus, au fond ?
                        </p>
                        <UiFormSelect
                            options={motivationPrimaryOptionsFormatted}
                            value={draftData.motivation_primary ?? ""}
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    motivation_primary: coerceSelectValue(v),
                                }))
                            }
                        />
                    </div>
                </section>

                {/* ============================================================
                🔁 RAPPORT À L’ÉCHEC
                ============================================================ */}
                <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-white/90">
                        🔁 Quand une quête échoue…
                    </h3>
                    <p className="text-xs text-white/55">
                        Quelle est ta réaction la plus fréquente ?
                    </p>
                    <UiFormSelect
                        options={failureResponseOptionsFormatted}
                        value={draftData.failure_response ?? ""}
                        onChange={(v) =>
                            setDraftData((prev) => ({
                                ...prev,
                                failure_response: coerceSelectValue(v),
                            }))
                        }
                    />
                </section>

                {/* ============================================================
                🧱 CADRE & AUTORITÉ
                ============================================================ */}
                <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-white/90">🧱 Cadre & autorité</h3>
                    <p className="text-xs text-white/55">
                        Comment réagis-tu quand il y a des règles, un cadre, ou quelqu’un qui guide
                        ?
                    </p>
                    <UiFormSelect
                        options={authorityRelationOptionsFormatted}
                        value={draftData.authority_relation ?? ""}
                        onChange={(v) =>
                            setDraftData((prev) => ({
                                ...prev,
                                authority_relation: coerceSelectValue(v),
                            }))
                        }
                    />
                </section>

                {/* ============================================================
                ✨ SYMBOLIQUE & NARRATIF
                ============================================================ */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/90">✨ Symbolique & récit</h3>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Quelle place le récit, les symboles ou les rituels ont-ils pour toi ?
                        </p>
                        <UiFormSelect
                            options={symbolismRelationOptionsFormatted}
                            value={draftData.symbolism_relation ?? ""}
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    symbolism_relation: coerceSelectValue(v),
                                }))
                            }
                        />
                    </div>
                </section>

                {/* ============================================================
                💾 ACTIONS
                ============================================================ */}
                <div className="flex justify-end mt-6">
                    <UiActionButton variant="solid" onClick={onUpdateProfile}>
                        {updateLoading ? "⏳" : "💾 Sauver"}
                    </UiActionButton>
                </div>
            </div>
        </UiPanel>
    );
}
