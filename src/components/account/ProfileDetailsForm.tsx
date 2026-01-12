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

    const { list: wantsOptions } = useProfileOptions({ field: "wants" });
    const { list: avoidsOptions } = useProfileOptions({ field: "avoids" });
    const { list: valuesOptions } = useProfileOptions({ field: "values" });
    const { list: archetypeOptions } = useProfileOptions({ field: "archetype" });
    const { list: resonantElementsOptions } = useProfileOptions({ field: "resonant_elements" });

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

            if (Array.isArray(d.wants)) originalData = { ...originalData, wants: d.wants };
            if (Array.isArray(d.avoids)) originalData = { ...originalData, avoids: d.avoids };
            if (Array.isArray(d.values)) originalData = { ...originalData, values: d.values };
            if (d.archetype) originalData = { ...originalData, archetype: d.archetype };
            if (Array.isArray(d.resonant_elements))
                originalData = { ...originalData, resonant_elements: d.resonant_elements };
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

    const [wantsOptionsFormatted, setWantsOptionsFormatted] = useState<UiFormSelectOption[]>([]);
    const [avoidsOptionsFormatted, setAvoidsOptionsFormatted] = useState<UiFormSelectOption[]>([]);
    const [valuesOptionsFormatted, setValuesOptionsFormatted] = useState<UiFormSelectOption[]>([]);
    const [archetypeOptionsFormatted, setArchetypeOptionsFormatted] = useState<
        UiFormSelectOption[]
    >([]);
    const [resonantElementsOptionsFormatted, setResonantElementsOptionsFormatted] = useState<
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

    useEffect(() => setWantsOptionsFormatted(formatOptions(wantsOptions)), [wantsOptions]);
    useEffect(() => setAvoidsOptionsFormatted(formatOptions(avoidsOptions)), [avoidsOptions]);
    useEffect(() => setValuesOptionsFormatted(formatOptions(valuesOptions)), [valuesOptions]);
    useEffect(
        () => setArchetypeOptionsFormatted(formatOptions(archetypeOptions)),
        [archetypeOptions]
    );
    useEffect(
        () => setResonantElementsOptionsFormatted(formatOptions(resonantElementsOptions)),
        [resonantElementsOptions]
    );

    function coerceSelectValue(v: any): string | null {
        if (v == null) return null;
        if (Array.isArray(v)) return v.length ? String(v[0] ?? "") || null : null;
        return String(v) || null;
    }

    function coerceSelectArray(v: any): string[] {
        if (v == null) return [];
        if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
        const s = String(v);
        return s ? [s] : [];
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
            <div className="space-y-8">
                {/* ============================================================
            🌍 CONTEXTE DE VIE ACTUEL
            ============================================================ */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/90">
                        🌍 Contexte de vie actuel
                    </h3>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Dans quel rythme de vie te trouves-tu en ce moment ?
                        </p>
                        <UiFormSelect
                            searchable={false}
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
                </section>

                {/* ============================================================
            ⚡ ÉNERGIE & RESSOURCES DISPONIBLES
            ============================================================ */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/90">⚡ Énergie & ressources</h3>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            À quel moment es-tu généralement le plus lucide ou disponible ?
                        </p>
                        <UiFormSelect
                            searchable={false}
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
                            Quel temps réaliste peux-tu consacrer chaque jour à avancer ?
                        </p>
                        <UiFormSelect
                            searchable={false}
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
            🧭 MANIÈRE D’AGIR & DE PROGRESSER
            ============================================================ */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/90">
                        🧭 Manière d’agir & de progresser
                    </h3>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Comment avances-tu quand tu t’engages vraiment dans quelque chose ?
                        </p>
                        <UiFormSelect
                            searchable={false}
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
                            Quel est ton rapport au risque et au défi ?
                        </p>
                        <UiFormSelect
                            searchable={false}
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
                </section>

                {/* ============================================================
            🔥 MOTIVATIONS & VALEURS
            ============================================================ */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/90">
                        🔥 Motivations & valeurs
                    </h3>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Ce qui te fait vraiment avancer, au fond
                        </p>
                        <UiFormSelect
                            searchable={false}
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

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Quelles valeurs sont particulièrement importantes pour toi (plusieurs
                            réponses possibles)
                        </p>
                        <UiFormSelect
                            searchable={false}
                            options={valuesOptionsFormatted}
                            value={draftData.values ?? []}
                            multiple
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    values: coerceSelectArray(v),
                                }))
                            }
                        />
                    </div>
                </section>

                {/* ============================================================
            🧱 OBSTACLES, ÉCHECS & CADRE
            ============================================================ */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/90">
                        🧱 Obstacles, échecs & cadre
                    </h3>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Quand une tentative échoue, quelle est ta réaction la plus fréquente ?
                        </p>
                        <UiFormSelect
                            searchable={false}
                            options={failureResponseOptionsFormatted}
                            value={draftData.failure_response ?? ""}
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    failure_response: coerceSelectValue(v),
                                }))
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Comment vis-tu la présence de règles, de cadres ou d’autorité ?
                        </p>
                        <UiFormSelect
                            searchable={false}
                            options={authorityRelationOptionsFormatted}
                            value={draftData.authority_relation ?? ""}
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    authority_relation: coerceSelectValue(v),
                                }))
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Ce que tu cherches à éviter en ce moment (plusieurs réponses possibles)
                        </p>
                        <UiFormSelect
                            searchable={false}
                            options={avoidsOptionsFormatted}
                            value={draftData.avoids ?? []}
                            multiple
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    avoids: coerceSelectArray(v),
                                }))
                            }
                        />
                    </div>
                </section>

                {/* ============================================================
            ✨ IDENTITÉ SYMBOLIQUE & RÉSONANCES
            ============================================================ */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/90">
                        ✨ Identité symbolique & résonances
                    </h3>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Quel archétype te ressemble le plus aujourd’hui ?
                        </p>
                        <UiFormSelect
                            searchable={false}
                            options={archetypeOptionsFormatted}
                            value={draftData.archetype ?? ""}
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    archetype: coerceSelectValue(v),
                                }))
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Quelle place ont les symboles, récits ou rituels pour toi ?
                        </p>
                        <UiFormSelect
                            searchable={false}
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

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Ce que tu recherches activement en ce moment (plusieurs réponses
                            possibles)
                        </p>
                        <UiFormSelect
                            searchable={false}
                            options={wantsOptionsFormatted}
                            value={draftData.wants ?? []}
                            multiple
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    wants: coerceSelectArray(v),
                                }))
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs text-white/55">
                            Éléments, thèmes ou ambiances qui te parlent profondément (plusieurs
                            réponses possibles)
                        </p>
                        <UiFormSelect
                            searchable={false}
                            options={resonantElementsOptionsFormatted}
                            value={draftData.resonant_elements ?? []}
                            multiple
                            onChange={(v) =>
                                setDraftData((prev) => ({
                                    ...prev,
                                    resonant_elements: coerceSelectArray(v),
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
