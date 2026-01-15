// src/components/ui/UiFormText.tsx
"use client";

import * as React from "react";
import UiTooltip from "@/components/ui/UiTooltip";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiFormTextSize = "sm" | "md" | "lg";
export type UiFormTextTone = "theme" | "neutral" | "danger" | "success";

export type UiFormTextProps = {
    /** Identifiant HTML (sinon auto) */
    id?: string;

    /** Label affiché au-dessus */
    label?: React.ReactNode;

    /** Tooltip sur le label (utilise UiTooltip) */
    labelTooltip?: React.ReactNode;

    /** Placeholder */
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
    size?: UiFormTextSize;

    /** Ton visuel (neutral/theme/danger/success) */
    tone?: UiFormTextTone;

    /** Input ou Textarea */
    multiline?: boolean;

    /** Rows textarea (si multiline) */
    rows?: number;

    /** Auto-resize textarea (si multiline) */
    autoResize?: boolean;

    /** Min/Max pour autoResize (en rows) */
    autoResizeMinRows?: number;
    autoResizeMaxRows?: number;

    /** Valeur contrôlée */
    value?: string;

    /** Valeur non contrôlée */
    defaultValue?: string;

    /** Change */
    onChange?: (value: string) => void;

    /** Blur/Focus */
    onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    onFocus?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;

    /** KeyDown */
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;

    /** Nom HTML */
    name?: string;

    /** Autocomplete */
    autoComplete?: string;

    /** Type input (si !multiline) */
    type?: React.HTMLInputTypeAttribute;

    /** Icone/prefixe à gauche dans le champ */
    leftIcon?: React.ReactNode;

    /** Icone/suffixe à droite dans le champ */
    rightIcon?: React.ReactNode;

    /** Bouton clear (si clearable) */
    clearable?: boolean;

    /** Appelé quand clear est déclenché */
    onClear?: () => void;

    /** Limite de caractères (affiche compteur si set) */
    maxLength?: number;

    /** Afficher compteur (par défaut true si maxLength) */
    showCounter?: boolean;

    /** Classe wrapper */
    className?: string;

    /** Classe input/textarea */
    inputClassName?: string;

    /** Test id */
    "data-testid"?: string;
};

export const UiFormTextPropsTable = [
    {
        name: "id",
        type: "string",
        description: "Identifiant HTML du champ (sinon généré automatiquement).",
        default: "—",
        required: false,
    },
    {
        name: "label",
        type: "React.ReactNode",
        description: "Label affiché au-dessus du champ.",
        default: "—",
        required: false,
    },
    {
        name: "labelTooltip",
        type: "React.ReactNode",
        description: "Tooltip optionnel sur le label (via UiTooltip).",
        default: "—",
        required: false,
    },
    {
        name: "placeholder",
        type: "string",
        description: "Placeholder affiché dans l’input/textarea.",
        default: "—",
        required: false,
    },
    {
        name: "hint",
        type: "React.ReactNode",
        description: "Texte d’aide léger affiché sous le champ (si pas d’erreur/succès).",
        default: "—",
        required: false,
    },
    {
        name: "error",
        type: "React.ReactNode",
        description: "Message d’erreur (prioritaire visuellement).",
        default: "—",
        required: false,
    },
    {
        name: "success",
        type: "React.ReactNode",
        description: "Message de succès (affiché uniquement si pas d’erreur).",
        default: "—",
        required: false,
    },
    {
        name: "right",
        type: "React.ReactNode",
        description: "Contenu affiché à droite du label (chip, compteur, bouton, etc.).",
        default: "—",
        required: false,
    },
    {
        name: "required",
        type: "boolean",
        description: "Affiche une étoile * à côté du label.",
        default: "false",
        required: false,
    },
    {
        name: "disabled",
        type: "boolean",
        description: "Désactive le champ (opacité réduite, interactions bloquées).",
        default: "false",
        required: false,
    },
    {
        name: "readOnly",
        type: "boolean",
        description: "Lecture seule (modifiable via sélection/copie, mais pas d’édition).",
        default: "false",
        required: false,
    },
    {
        name: "size",
        type: '"sm" | "md" | "lg"',
        description: "Taille visuelle (padding, taille de texte, radius).",
        default: '"md"',
        required: false,
    },
    {
        name: "tone",
        type: '"theme" | "neutral" | "danger" | "success"',
        description:
            "Ton visuel du champ (les états error/success prennent de toute façon la priorité).",
        default: '"theme"',
        required: false,
    },
    {
        name: "multiline",
        type: "boolean",
        description: "Si true, rend un textarea à la place d’un input.",
        default: "false",
        required: false,
    },
    {
        name: "rows",
        type: "number",
        description: "Nombre de lignes du textarea (si multiline et autoResize=false).",
        default: "4",
        required: false,
    },
    {
        name: "autoResize",
        type: "boolean",
        description: "Active l’auto-resize du textarea (si multiline).",
        default: "false",
        required: false,
    },
    {
        name: "autoResizeMinRows",
        type: "number",
        description: "Nombre de lignes minimum (si autoResize=true).",
        default: "2",
        required: false,
    },
    {
        name: "autoResizeMaxRows",
        type: "number",
        description: "Nombre de lignes maximum (si autoResize=true).",
        default: "10",
        required: false,
    },
    {
        name: "value",
        type: "string",
        description: "Valeur contrôlée (controlled input).",
        default: "—",
        required: false,
    },
    {
        name: "defaultValue",
        type: "string",
        description: "Valeur non contrôlée (uncontrolled input).",
        default: "—",
        required: false,
    },
    {
        name: "onChange",
        type: "(value: string) => void",
        description: "Callback appelé quand la valeur change.",
        default: "—",
        required: false,
    },
    {
        name: "onBlur",
        type: "React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>",
        description: "Handler blur (input/textarea).",
        default: "—",
        required: false,
    },
    {
        name: "onFocus",
        type: "React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>",
        description: "Handler focus (input/textarea).",
        default: "—",
        required: false,
    },
    {
        name: "onKeyDown",
        type: "React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>",
        description: "Handler keyDown (input/textarea).",
        default: "—",
        required: false,
    },
    {
        name: "name",
        type: "string",
        description: "Attribut HTML name du champ.",
        default: "—",
        required: false,
    },
    {
        name: "autoComplete",
        type: "string",
        description: "Attribut HTML autoComplete.",
        default: "—",
        required: false,
    },
    {
        name: "type",
        type: "React.HTMLInputTypeAttribute",
        description: "Type de l’input (uniquement si multiline=false).",
        default: '"text"',
        required: false,
    },
    {
        name: "leftIcon",
        type: "React.ReactNode",
        description: "Icône/prefixe à gauche dans le champ.",
        default: "—",
        required: false,
    },
    {
        name: "rightIcon",
        type: "React.ReactNode",
        description: "Icône/suffixe à droite dans le champ.",
        default: "—",
        required: false,
    },
    {
        name: "clearable",
        type: "boolean",
        description:
            "Affiche un bouton clear (uniquement en mode contrôlé, si value.length > 0, et pas disabled/readOnly).",
        default: "false",
        required: false,
    },
    {
        name: "onClear",
        type: "() => void",
        description:
            "Callback appelé quand le clear est déclenché (le composant appelle aussi onChange('') en controlled).",
        default: "—",
        required: false,
    },
    {
        name: "maxLength",
        type: "number",
        description: "Limite de caractères (active un compteur si showCounter=true).",
        default: "—",
        required: false,
    },
    {
        name: "showCounter",
        type: "boolean",
        description: "Affiche le compteur de caractères (par défaut true si maxLength est défini).",
        default: "true",
        required: false,
    },
    {
        name: "className",
        type: "string",
        description: "Classes CSS supplémentaires appliquées au wrapper externe.",
        default: "—",
        required: false,
    },
    {
        name: "inputClassName",
        type: "string",
        description: "Classes CSS supplémentaires appliquées à l’input/textarea.",
        default: "—",
        required: false,
    },
    {
        name: "data-testid",
        type: "string",
        description: "Identifiant de test (utilisé pour les tests automatisés).",
        default: "—",
        required: false,
    },
];

const sizeMap: Record<UiFormTextSize, { pad: string; text: string; radius: string }> = {
    sm: { pad: "px-3 py-2", text: "text-sm", radius: "rounded-2xl" },
    md: { pad: "px-3.5 py-2.5", text: "text-sm", radius: "rounded-[18px]" },
    lg: { pad: "px-4 py-3", text: "text-base", radius: "rounded-[20px]" },
};

function toneClasses(tone: UiFormTextTone, hasError: boolean, hasSuccess: boolean) {
    // priorité: error > success > tone
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

    // neutral
    return {
        ring: "ring-white/10 focus-within:ring-white/20",
        bg: "bg-black/25",
        glow: "bg-[radial-gradient(280px_160px_at_15%_20%,rgba(255,255,255,0.10),transparent_70%)]",
        text: "text-white/90 placeholder:text-white/35",
    };
}

function useStableId(explicit?: string) {
    const reactId = React.useId();
    return explicit ?? `uift_${reactId.replaceAll(":", "")}`;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function useAutosizeTextarea(
    ref: React.RefObject<HTMLTextAreaElement | null>,
    value: string | undefined,
    enabled: boolean,
    minRows: number,
    maxRows: number
) {
    React.useLayoutEffect(() => {
        const el = ref.current;
        if (!el || !enabled) return;

        // reset height to measure scrollHeight correctly
        el.style.height = "auto";

        const styles = window.getComputedStyle(el);
        const lineHeight = Number.parseFloat(styles.lineHeight || "0") || 20;
        const paddingTop = Number.parseFloat(styles.paddingTop || "0") || 0;
        const paddingBottom = Number.parseFloat(styles.paddingBottom || "0") || 0;

        const minH = minRows * lineHeight + paddingTop + paddingBottom;
        const maxH = maxRows * lineHeight + paddingTop + paddingBottom;

        const next = clamp(el.scrollHeight, minH, maxH);
        el.style.height = `${next}px`;
    }, [ref, value, enabled, minRows, maxRows]);
}

export function UiFormText(props: UiFormTextProps) {
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
        multiline,
        rows = 4,
        autoResize,
        autoResizeMinRows = 2,
        autoResizeMaxRows = 10,
        value,
        defaultValue,
        onChange,
        onBlur,
        onFocus,
        onKeyDown,
        name,
        autoComplete,
        type = "text",
        leftIcon,
        rightIcon,
        clearable,
        onClear,
        maxLength,
        showCounter = true,
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

    const taRef = React.useRef<HTMLTextAreaElement | null>(null);
    useAutosizeTextarea(
        taRef,
        value,
        !!multiline && !!autoResize,
        autoResizeMinRows,
        autoResizeMaxRows
    );

    const onInternalChange = (next: string) => {
        onChange?.(next);
    };

    const showBottomHint = hasError || hasSuccess || !!hint || (showCounter && !!maxLength);

    const counter =
        showCounter && typeof maxLength === "number"
            ? `${(value ?? "").length}/${maxLength}`
            : null;

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

                <div
                    className={cn(
                        "relative flex items-stretch gap-2",
                        sizes.pad,
                        // si multiline: aligne en haut
                        multiline ? "items-start" : "items-center"
                    )}
                >
                    {leftIcon ? (
                        <div className={cn("shrink-0", multiline ? "mt-0.5" : "")}>{leftIcon}</div>
                    ) : null}

                    <div className="min-w-0 flex-1">
                        {multiline ? (
                            <textarea
                                ref={taRef}
                                id={inputId}
                                name={name}
                                placeholder={placeholder}
                                disabled={disabled}
                                readOnly={readOnly}
                                rows={autoResize ? autoResizeMinRows : rows}
                                value={value}
                                defaultValue={defaultValue}
                                maxLength={maxLength}
                                onChange={(e) => onInternalChange(e.target.value)}
                                onBlur={onBlur as any}
                                onFocus={onFocus as any}
                                onKeyDown={onKeyDown as any}
                                className={cn(
                                    "w-full bg-transparent outline-none resize-none",
                                    sizes.text,
                                    toneCls.text,
                                    "leading-relaxed",
                                    inputClassName
                                )}
                            />
                        ) : (
                            <input
                                id={inputId}
                                name={name}
                                type={type}
                                placeholder={placeholder}
                                disabled={disabled}
                                readOnly={readOnly}
                                autoComplete={autoComplete}
                                value={value}
                                defaultValue={defaultValue}
                                maxLength={maxLength}
                                onChange={(e) => onInternalChange(e.target.value)}
                                onBlur={onBlur as any}
                                onFocus={onFocus as any}
                                onKeyDown={onKeyDown as any}
                                className={cn(
                                    "w-full bg-transparent outline-none",
                                    sizes.text,
                                    toneCls.text,
                                    inputClassName
                                )}
                            />
                        )}
                    </div>

                    {/* Right side actions */}
                    <div className={cn("shrink-0 flex items-center gap-2", multiline && "mt-0.5")}>
                        {rightIcon ? <div>{rightIcon}</div> : null}

                        {canClear ? (
                            <button
                                type="button"
                                onClick={() => {
                                    onClear?.();
                                    // clear côté parent (composant contrôlé)
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
                    </div>
                </div>
            </div>

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

                    {counter ? (
                        <div className="shrink-0 text-xs text-white/35">{counter}</div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
