// src/components/ui/UiFormDate.tsx
"use client";

import * as React from "react";
import UiTooltip from "@/components/ui/UiTooltip";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiFormDateSize = "sm" | "md" | "lg";
export type UiFormDateTone = "theme" | "neutral" | "danger" | "success";

export type UiFormDateValue = string; // attendu: "YYYY-MM-DD"

export type UiFormDateProps = {
    /** Identifiant HTML (sinon auto) */
    id?: string;

    /** Label affiché au-dessus */
    label?: React.ReactNode;

    /** Tooltip sur le label (utilise UiTooltip) */
    labelTooltip?: React.ReactNode;

    /** Placeholder (si affichage texte) */
    placeholder?: string;

    /** Hint sous le champ (info légère) */
    hint?: React.ReactNode;

    /** Message d'erreur (prioritaire visuellement) */
    error?: React.ReactNode;

    /** Message succès (optionnel) */
    success?: React.ReactNode;

    /** Texte à droite du label (ex: chip, compteur, bouton) */
    right?: React.ReactNode;

    /** Champ requis */
    required?: boolean;

    /** Désactivé */
    disabled?: boolean;

    /** Lecture seule */
    readOnly?: boolean;

    /** Taille visuelle */
    size?: UiFormDateSize;

    /** Ton visuel (neutral/theme/danger/success) */
    tone?: UiFormDateTone;

    /** Valeur contrôlée (format "YYYY-MM-DD") */
    value?: UiFormDateValue;

    /** Valeur non contrôlée (format "YYYY-MM-DD") */
    defaultValue?: UiFormDateValue;

    /** Change (renvoie "YYYY-MM-DD" ou "" si clear) */
    onChange?: (value: UiFormDateValue) => void;

    /** Blur/Focus */
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
    onFocus?: React.FocusEventHandler<HTMLInputElement>;

    /** KeyDown */
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;

    /** Nom HTML */
    name?: string;

    /** Autocomplete */
    autoComplete?: string;

    /** Min/Max (format "YYYY-MM-DD") */
    min?: UiFormDateValue;
    max?: UiFormDateValue;

    /** Icone/prefixe à gauche dans le champ */
    leftIcon?: React.ReactNode;

    /** Icone/suffixe à droite dans le champ */
    rightIcon?: React.ReactNode;

    /** Bouton clear (si clearable) */
    clearable?: boolean;

    /** Appelé quand clear est déclenché */
    onClear?: () => void;

    /** Force l’ouverture du picker natif si dispo (sur click / focus) */
    openOnFocus?: boolean;

    /** Classe wrapper */
    className?: string;

    /** Classe input */
    inputClassName?: string;

    /** Test id */
    "data-testid"?: string;
};

const sizeMap: Record<UiFormDateSize, { pad: string; text: string; radius: string }> = {
    sm: { pad: "px-3 py-2", text: "text-sm", radius: "rounded-2xl" },
    md: { pad: "px-3.5 py-2.5", text: "text-sm", radius: "rounded-[18px]" },
    lg: { pad: "px-4 py-3", text: "text-base", radius: "rounded-[20px]" },
};

function toneClasses(tone: UiFormDateTone, hasError: boolean, hasSuccess: boolean) {
    if (hasError) {
        return {
            ring: "ring-rose-400/30 focus-within:ring-rose-400/45",
            bg: "bg-black/25",
            glow: "bg-[radial-gradient(280px_160px_at_15%_20%,rgba(244,63,94,0.18),transparent_65%)]",
            text: "text-white/90 placeholder:text-white/35",
        };
    }

    if (hasSuccess) {
        return {
            ring: "ring-emerald-400/25 focus-within:ring-emerald-400/40",
            bg: "bg-black/25",
            glow: "bg-[radial-gradient(280px_160px_at_15%_20%,rgba(16,185,129,0.16),transparent_65%)]",
            text: "text-white/90 placeholder:text-white/35",
        };
    }

    if (tone === "theme") {
        return {
            ring: "ring-white/10 focus-within:ring-[hsl(var(--accent)/0.40)]",
            bg: "bg-black/25",
            glow: "bg-[radial-gradient(280px_160px_at_15%_20%,hsl(var(--accent)/0.14),transparent_65%)]",
            text: "text-white/90 placeholder:text-white/35",
        };
    }

    if (tone === "danger") {
        return {
            ring: "ring-rose-400/20 focus-within:ring-rose-400/35",
            bg: "bg-black/25",
            glow: "bg-[radial-gradient(280px_160px_at_15%_20%,rgba(244,63,94,0.14),transparent_65%)]",
            text: "text-white/90 placeholder:text-white/35",
        };
    }

    if (tone === "success") {
        return {
            ring: "ring-emerald-400/18 focus-within:ring-emerald-400/32",
            bg: "bg-black/25",
            glow: "bg-[radial-gradient(280px_160px_at_15%_20%,rgba(16,185,129,0.12),transparent_65%)]",
            text: "text-white/90 placeholder:text-white/35",
        };
    }

    return {
        ring: "ring-white/10 focus-within:ring-white/20",
        bg: "bg-black/25",
        glow: "bg-[radial-gradient(280px_160px_at_15%_20%,rgba(255,255,255,0.10),transparent_70%)]",
        text: "text-white/90 placeholder:text-white/35",
    };
}

function useStableId(explicit?: string) {
    const reactId = React.useId();
    return explicit ?? `uifd_${reactId.replaceAll(":", "")}`;
}

function isValidYmd(s: string) {
    // On reste pragmatique: forme YYYY-MM-DD
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function formatYmdFromDate(d: Date) {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${y}-${m}-${day}`;
}

function parseYmdToDate(ymd: string): Date | null {
    if (!isValidYmd(ymd)) return null;
    const [y, m, d] = ymd.split("-").map((x) => Number.parseInt(x, 10));
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    // validation anti "2026-02-31"
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
}

export function UiFormDate(props: UiFormDateProps) {
    const {
        id,
        label,
        labelTooltip,
        placeholder,
        hint,
        error,
        success,
        right,
        required,
        disabled,
        readOnly,
        size = "md",
        tone = "theme",
        value,
        defaultValue,
        onChange,
        onBlur,
        onFocus,
        onKeyDown,
        name,
        autoComplete,
        min,
        max,
        leftIcon,
        rightIcon,
        clearable,
        onClear,
        openOnFocus = true,
        className,
        inputClassName,
    } = props;

    const inputId = useStableId(id);
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    const sizes = sizeMap[size];
    const toneCls = toneClasses(tone, hasError, hasSuccess);

    const isControlled = typeof value === "string";
    const currentValue = isControlled
        ? value
        : typeof defaultValue === "string"
          ? defaultValue
          : "";

    const canClear =
        !!clearable && !disabled && !readOnly && (isControlled ? value.length > 0 : false);

    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const openNativePicker = React.useCallback(() => {
        const el = inputRef.current as any;
        if (!el || disabled || readOnly) return;

        // Chrome/Edge support
        if (typeof el.showPicker === "function") {
            try {
                el.showPicker();
            } catch {
                // ignore
            }
        }
    }, [disabled, readOnly]);

    const onInternalChange = (next: string) => {
        // Le input type="date" renvoie "" ou "YYYY-MM-DD"
        onChange?.(next);
    };

    const showBottomHint = hasError || hasSuccess || !!hint;

    // Petit helper d’affichage (optionnel) si tu veux afficher une version “humaine”
    // Pour l’instant on garde natif et simple.
    const calendarFallbackLabel = React.useMemo(() => {
        // Affiche un petit texte si la valeur est invalide (rare)
        if (!currentValue) return null;
        if (isValidYmd(currentValue) && parseYmdToDate(currentValue)) return null;
        return "Date invalide (format attendu: YYYY-MM-DD)";
    }, [currentValue]);

    return (
        <div className={cn("w-full", className)} data-testid={props["data-testid"]}>
            {(label || right) && (
                <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {label ? (
                            <div className="flex items-center gap-2">
                                {labelTooltip ? (
                                    <UiTooltip content={labelTooltip}>
                                        <span className="text-xs tracking-[0.18em] text-white/55 uppercase">
                                            {label}
                                            {required ? (
                                                <span className="ml-1 text-rose-200/90">*</span>
                                            ) : null}
                                        </span>
                                    </UiTooltip>
                                ) : (
                                    <span className="text-xs tracking-[0.18em] text-white/55 uppercase">
                                        {label}
                                        {required ? (
                                            <span className="ml-1 text-rose-200/90">*</span>
                                        ) : null}
                                    </span>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {right ? <div className="shrink-0">{right}</div> : null}
                </div>
            )}

            <div
                className={cn(
                    "relative overflow-hidden ring-1 backdrop-blur-md",
                    sizes.radius,
                    toneCls.ring,
                    toneCls.bg,
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <div
                    className={cn("pointer-events-none absolute inset-0 opacity-70", toneCls.glow)}
                />

                <div className={cn("relative flex items-center gap-2", sizes.pad)}>
                    {leftIcon ? <div className="shrink-0">{leftIcon}</div> : null}

                    <div className="min-w-0 flex-1">
                        <input
                            ref={inputRef}
                            id={inputId}
                            name={name}
                            type="date"
                            placeholder={placeholder}
                            disabled={disabled}
                            readOnly={readOnly}
                            autoComplete={autoComplete}
                            value={value}
                            defaultValue={defaultValue}
                            min={min}
                            max={max}
                            onChange={(e) => onInternalChange(e.target.value)}
                            onBlur={onBlur as any}
                            onFocus={(e) => {
                                onFocus?.(e);
                                if (openOnFocus) openNativePicker();
                            }}
                            onClick={() => {
                                if (openOnFocus) openNativePicker();
                            }}
                            onKeyDown={onKeyDown as any}
                            className={cn(
                                "w-full bg-transparent outline-none",
                                sizes.text,
                                toneCls.text,
                                inputClassName
                            )}
                        />
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                        {rightIcon ? <div>{rightIcon}</div> : null}

                        {canClear ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onClear?.();
                                    onChange?.("");
                                }}
                                className={cn(
                                    "rounded-xl px-2 py-1 text-xs ring-1",
                                    "bg-white/5 text-white/65 ring-white/10 hover:bg-white/10"
                                )}
                                aria-label="Clear"
                            >
                                ✖
                            </button>
                        ) : null}

                        {/* Petit bouton calendrier (utile si le navigateur ne montre pas d’icône) */}
                        <button
                            type="button"
                            onClick={() => openNativePicker()}
                            disabled={disabled || readOnly}
                            className={cn(
                                "rounded-xl px-2 py-1 text-xs ring-1",
                                "bg-white/5 text-white/65 ring-white/10 hover:bg-white/10",
                                (disabled || readOnly) && "opacity-50 cursor-not-allowed"
                            )}
                            aria-label="Open date picker"
                            title="Choisir une date"
                        >
                            📅
                        </button>
                    </div>
                </div>
            </div>

            {calendarFallbackLabel ? (
                <div className="mt-2 text-xs text-rose-200/90">{calendarFallbackLabel}</div>
            ) : null}

            {showBottomHint ? (
                <div className="mt-2 flex items-start justify-between gap-3">
                    <div className="min-w-0 text-xs">
                        {hasError ? (
                            <div className="text-rose-200/90">{error}</div>
                        ) : hasSuccess ? (
                            <div className="text-emerald-200/85">{success}</div>
                        ) : hint ? (
                            <div className="text-white/45">{hint}</div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

/**
 * Helpers optionnels (si tu veux les utiliser ailleurs)
 * -----------------------------------------------------
 * - parseYmdToDate: convertit "YYYY-MM-DD" en Date (local), avec validation
 * - formatYmdFromDate: convertit Date -> "YYYY-MM-DD"
 */
export const UiFormDateHelpers = {
    isValidYmd,
    parseYmdToDate,
    formatYmdFromDate,
};
