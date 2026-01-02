// src/hooks/inventory/usePlantDetail.ts
"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";

export function usePlantDetail(plantId?: string | null, options?: { auto?: boolean }) {
    const auto = options?.auto ?? true;
    const id = plantId ?? null;

    const loading = useInventoryStore((s) => s.loading);
    const saving = useInventoryStore((s) => s.saving);
    const error = useInventoryStore((s) => s.error);

    const currentPlantId = useInventoryStore((s) => s.currentPlantId);
    const currentPlant = useInventoryStore((s) => s.currentPlant);
    const photos = useInventoryStore((s) => s.currentPlantPhotos);
    const loaded = useInventoryStore((s) => s.currentPlantLoaded);

    const fetchPlantById = useInventoryStore((s) => s.fetchPlantById);
    const clearCurrentPlant = useInventoryStore((s) => s.clearCurrentPlant);
    const updatePlant = useInventoryStore((s) => s.updatePlant);

    useEffect(() => {
        if (!auto) return;
        if (!id) return;

        // Si on a déjà chargé ce plant, skip
        if (loaded && currentPlantId === id) return;

        void fetchPlantById(id);

        return () => {
            // optionnel: garder en cache si tu veux. Là on nettoie pour éviter flash.
            // clearCurrentPlant();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auto, id]);

    const isCurrent = useMemo(() => !!id && currentPlantId === id, [id, currentPlantId]);

    const refresh = useCallback(async () => {
        if (!id) return;
        await fetchPlantById(id);
    }, [id, fetchPlantById]);

    const patch = useCallback(
        async (input: { title?: string | null; ai_description?: string | null; data?: any }) => {
            if (!id) return false;
            return await updatePlant({
                id,
                title: input.title ?? undefined,
                ai_description: input.ai_description ?? undefined,
                data: input.data ?? undefined,
            });
        },
        [id, updatePlant]
    );

    return {
        loading,
        saving,
        error,

        isCurrent,
        loaded,

        plant: currentPlant,
        photos,

        refresh,
        patch,

        clear: clearCurrentPlant,
    };
}
