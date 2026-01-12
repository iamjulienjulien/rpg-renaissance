// src/components/modals/DevDataModal.tsx
"use client";

import { UiModal } from "@/components/ui/UiModal";
import { useUiStore } from "@/stores/uiStore";
import { useEffect, useState } from "react";
import { UiData } from "../ui/UiData";
import { useGameStore } from "@/stores/gameStore";
import { UiFormSelect, type UiFormSelectOption, type UiSelectValue } from "../ui";

type Props = {};

type DataKey = "currentAdventure" | "currentChapter" | "currentQuests" | "currentPlayer";
const DATAS: DataKey[] = ["currentAdventure", "currentChapter", "currentQuests", "currentPlayer"];

export default function DevDataModal(props: Props) {
    const isOpen = useUiStore((s) => s.isModalOpen("devData"));

    const [selectedData, setSelectedData] = useState<DataKey>("currentAdventure");
    const [selectOptions, setSelectOptions] = useState<UiFormSelectOption[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedData("currentAdventure");
    }, [isOpen]);

    useEffect(() => {
        const options: UiFormSelectOption[] = DATAS.map((d) => ({
            value: d, // string
            label: d,
        }));
        setSelectOptions(options);
    }, []);

    const { currentPlayer, currentAdventure, currentChapter, currentQuests } = useGameStore();

    const dataMap: Record<DataKey, unknown> = {
        currentPlayer,
        currentAdventure,
        currentChapter,
        currentQuests,
    };

    return (
        <UiModal
            id="devData"
            maxWidth="full"
            eyebrow="🧙‍♂️ Dev"
            title="Visualisateur de données"
            closeOnBackdrop={false}
            closeOnEscape
        >
            <div>
                <UiFormSelect
                    className="mb-5"
                    options={selectOptions}
                    value={selectedData}
                    searchable={false}
                    onChange={(value) => {
                        // value peut être: UiSelectValue | UiSelectValue[] | null
                        const v = Array.isArray(value) ? value[0] : value;

                        if (typeof v === "string" && (DATAS as readonly string[]).includes(v)) {
                            setSelectedData(v as DataKey);
                        }
                    }}
                />

                <UiData
                    data={dataMap[selectedData]}
                    title={selectedData}
                    size="sm"
                    scheme="theme"
                    indent={4}
                    showQuotes={false}
                    collapsible
                />
            </div>
        </UiModal>
    );
}
