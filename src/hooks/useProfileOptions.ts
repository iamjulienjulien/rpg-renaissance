"use client";

import { useEffect, useMemo, useState } from "react";

export type ProfileOptionRef = {
    id: string;
    field_key: string;
    value_key: string;
    label: string;
    emoji: string;
    description: string | null;
    sort_order: number;
};

export type ProfileOptionsMap = Record<string, ProfileOptionRef[]>;

export type UiFormSelectOption = {
    value: string;
    label: string;
    description?: string;
    emoji?: string;
    disabled?: boolean;
};

type UseProfileOptionsArgs = {
    field?: string | null;
    enabled?: boolean;
};

type UseProfileOptionsResult = {
    options: ProfileOptionsMap;
    list: ProfileOptionRef[]; // pratique quand field est fourni
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    format: {
        (opts?: {
            includeEmpty?: boolean;
            emptyLabel?: string;
            emptyEmoji?: string;
            disabledValues?: string[];
        }): UiFormSelectOption[];

        (
            rows: ProfileOptionRef[],
            opts?: {
                includeEmpty?: boolean;
                emptyLabel?: string;
                emptyEmoji?: string;
                disabledValues?: string[];
            }
        ): UiFormSelectOption[];
    };
};

export function useProfileOptions(args?: UseProfileOptionsArgs): UseProfileOptionsResult {
    const field = (args?.field ?? null) ? String(args?.field).trim() : null;
    const enabled = args?.enabled ?? true;

    const [options, setOptions] = useState<ProfileOptionsMap>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const url = useMemo(() => {
        const qs = new URLSearchParams();
        if (field) qs.set("field", field);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return `/api/profile-options${suffix}`;
    }, [field]);

    const refresh = async () => {
        if (!enabled) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(url, { method: "GET", cache: "no-store" });
            const json = await res.json().catch(() => null);

            if (!res.ok) {
                setError(json?.error ?? res.statusText ?? "Request failed");
                return;
            }

            setOptions((json?.options ?? {}) as ProfileOptionsMap);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Network error");
        } finally {
            setLoading(false);
        }
    };

    function format(
        a?:
            | ProfileOptionRef[]
            | {
                  includeEmpty?: boolean;
                  emptyLabel?: string;
                  emptyEmoji?: string;
                  disabledValues?: string[];
              },
        b?: {
            includeEmpty?: boolean;
            emptyLabel?: string;
            emptyEmoji?: string;
            disabledValues?: string[];
        }
    ): UiFormSelectOption[] {
        const rows = Array.isArray(a) ? a : list;
        const opts = Array.isArray(a) ? b : a;

        const disabled = new Set(opts?.disabledValues ?? []);

        const formatted: UiFormSelectOption[] = rows.map((o) => ({
            value: o.value_key,
            label: o.label,
            description: o.description ?? undefined,
            emoji: o.emoji ?? undefined,
            disabled: disabled.has(o.value_key),
        }));

        if (opts?.includeEmpty) {
            formatted.unshift({
                value: "",
                label: opts.emptyLabel ?? "— Choisir —",
                emoji: opts.emptyEmoji ?? "❔",
            });
        }

        return formatted;
    }

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, enabled]);

    const list = useMemo(() => {
        if (!field) return [];
        return options[field] ?? [];
    }, [options, field]);

    return { options, list, loading, error, refresh, format };
}
