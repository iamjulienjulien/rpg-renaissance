// src/hooks/inventory/usePlantPrefillFlow.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import { useInventoryStore, type PlantDraftV1 } from "@/stores/inventoryStore";

type Step = "idle" | "upload_ready" | "prefilling" | "editing" | "creating" | "done" | "error";

export function usePlantPrefillFlow() {
    const prefillLoading = useInventoryStore((s) => s.prefillLoading);
    const prefillError = useInventoryStore((s) => s.prefillError);
    const plantPrefill = useInventoryStore((s) => s.plantPrefill);

    const generatePlantPrefill = useInventoryStore((s) => s.generatePlantPrefill);
    const patchPlantPrefill = useInventoryStore((s) => s.patchPlantPrefill);
    const resetPlantPrefill = useInventoryStore((s) => s.resetPlantPrefill);

    const createPlantFromPrefill = useInventoryStore((s) => s.createPlantFromPrefill);

    const saving = useInventoryStore((s) => s.saving);
    const error = useInventoryStore((s) => s.error);

    // ✅ NEW (add these actions in store)
    const setStoreError = useInventoryStore((s) => (s as any).setError) as
        | ((message: string | null) => void)
        | undefined;

    const setStorePrefillError = useInventoryStore((s) => (s as any).setPrefillError) as
        | ((message: string | null) => void)
        | undefined;

    const [photo, setPhoto] = useState<{
        id: string;
        signed_url: string;
        caption?: string | null;
    } | null>(null);

    const step: Step = useMemo(() => {
        if (saving) return "creating";
        if (prefillLoading) return "prefilling";
        if (error || prefillError) return "error";
        if (plantPrefill) return "editing";
        if (photo) return "upload_ready";
        return "idle";
    }, [saving, prefillLoading, error, prefillError, plantPrefill, photo]);

    const setPhotoInput = useCallback(
        (input: { id: string; signed_url: string; caption?: string | null }) => {
            setPhoto({
                id: String(input.id),
                signed_url: String(input.signed_url),
                caption: input.caption ?? null,
            });
        },
        []
    );

    const clearError = useCallback(() => {
        setStoreError?.(null);
        setStorePrefillError?.(null);
    }, [setStoreError, setStorePrefillError]);

    // ✅ what InventoryPage expects
    const setError = useCallback(
        (message: string | null) => {
            // Prefer prefillError when flow is still around prefill/editing
            if (setStorePrefillError) setStorePrefillError(message);
            else setStoreError?.(message);
        },
        [setStoreError, setStorePrefillError]
    );

    const clear = useCallback(() => {
        setPhoto(null);
        resetPlantPrefill();
        clearError();
    }, [resetPlantPrefill, clearError]);

    const runPrefill = useCallback(async () => {
        if (!photo) return null;

        clearError();

        const draft = await generatePlantPrefill({
            photo_id: photo.id,
            photo_signed_url: photo.signed_url,
            photo_caption: photo.caption ?? null,
        });

        return draft ?? null;
    }, [photo, generatePlantPrefill, clearError]);

    const updateTitle = useCallback(
        (title: string) => patchPlantPrefill({ title }),
        [patchPlantPrefill]
    );

    const updateAiDescription = useCallback(
        (ai_description: string) => patchPlantPrefill({ ai_description }),
        [patchPlantPrefill]
    );

    const updateFieldValue = useCallback(
        (key: string, value: any, type?: PlantDraftV1["data"][string]["type"]) => {
            if (!key) return;
            patchPlantPrefill({
                data: {
                    [key]: {
                        type: type ?? plantPrefill?.data?.[key]?.type ?? "string",
                        value,
                    },
                },
            });
        },
        [patchPlantPrefill, plantPrefill?.data]
    );

    const create = useCallback(async () => {
        if (!photo || !plantPrefill) return null;

        clearError();

        const res = await createPlantFromPrefill({
            photo_id: photo.id,
            draft: plantPrefill,
        });

        return res ?? null;
    }, [photo, plantPrefill, createPlantFromPrefill, clearError]);

    return {
        // state
        step,
        photo,
        draft: plantPrefill,

        prefillLoading,
        createLoading: saving, // ✅ NEW alias expected by UI
        saving,

        error: error ?? prefillError ?? null,

        // actions
        setPhotoInput,
        clear,
        runPrefill,

        updateTitle,
        updateAiDescription,
        updateFieldValue,
        patchDraft: patchPlantPrefill,

        setError, // ✅ NEW expected by page
        clearError,

        create,
    };
}
