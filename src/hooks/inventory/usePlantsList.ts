// src/hooks/inventory/usePlantsList.ts
"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";

export function usePlantsList(options?: { auto?: boolean }) {
    const auto = options?.auto ?? true;

    const loading = useInventoryStore((s) => s.loading);
    const error = useInventoryStore((s) => s.error);

    const plants = useInventoryStore((s) => s.plants);
    const plantsLoaded = useInventoryStore((s) => s.plantsLoaded);
    const plantsQuery = useInventoryStore((s) => s.plantsQuery);
    const plantsLimit = useInventoryStore((s) => s.plantsLimit);
    const plantsOffset = useInventoryStore((s) => s.plantsOffset);

    const setPlantsQuery = useInventoryStore((s) => s.setPlantsQuery);
    const fetchPlants = useInventoryStore((s) => s.fetchPlants);
    const resetPlantsList = useInventoryStore((s) => s.resetPlantsList);

    useEffect(() => {
        if (!auto) return;
        if (plantsLoaded) return;
        void fetchPlants({ q: plantsQuery, limit: plantsLimit, offset: plantsOffset });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auto, plantsLoaded]);

    const refresh = useCallback(async () => {
        resetPlantsList();
        await fetchPlants({ q: plantsQuery, limit: plantsLimit, offset: 0 });
    }, [resetPlantsList, fetchPlants, plantsQuery, plantsLimit]);

    const setQuery = useCallback(
        (q: string) => {
            setPlantsQuery(q);
        },
        [setPlantsQuery]
    );

    const hasItems = useMemo(() => (plants?.length ?? 0) > 0, [plants?.length]);

    return {
        loading,
        error,

        plants,
        hasItems,

        query: plantsQuery,
        setQuery,

        limit: plantsLimit,
        offset: plantsOffset,

        fetch: fetchPlants,
        refresh,
    };
}
