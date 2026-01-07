// src/components/ui/UiFormSelect.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export type UiSelectValue = string | number;

export type UiFormSelectOption = {
    value: UiSelectValue;
    label: string;
    description?: string;
    emoji?: string;
    disabled?: boolean;
};

export type UiFormSelectGroup = {
    label?: string;
    options: UiFormSelectOption[];
};

export type UiFormSelectSize = "sm" | "md" | "lg";
export type UiFormSelectTone = "theme" | "neutral" | "danger";

export type UiFormSelectProps = {
    /** Identifiant html (input-like) */
    id?: string;

    /** Label au-dessus */
    label?: React.ReactNode;

    /** Placeholder quand aucun choix */
    placeholder?: string;

    /** Hint sous le champ */
    hint?: React.ReactNode;

    /** Message d'erreur (affiché sous le champ, prioritaire sur hint) */
    error?: React.ReactNode;

    /** Ton (influence ring / glow) */
    tone?: UiFormSelectTone;

    /** Taille */
    size?: UiFormSelectSize;

    /** Désactivé */
    disabled?: boolean;

    /** Chargement (désactive et affiche un état) */
    loading?: boolean;

    /** Clear possible (icône ✖) */
    clearable?: boolean;

    /** Multi-values */
    multiple?: boolean;

    /** Valeur contrôlée */
    value?: UiSelectValue | UiSelectValue[] | null;

    /** Valeur par défaut (non contrôlé) */
    defaultValue?: UiSelectValue | UiSelectValue[] | null;

    /** Callback */
    onChange?: (value: UiSelectValue | UiSelectValue[] | null) => void;

    /** Options simples */
    options?: UiFormSelectOption[];

    /** Options groupées (prioritaires si fournies) */
    groups?: UiFormSelectGroup[];

    /** Search interne */
    searchable?: boolean;

    /** Placeholder du search */
    searchPlaceholder?: string;

    /** Filtre custom (sinon filtre label/description) */
    filterOption?: (opt: UiFormSelectOption, query: string) => boolean;

    /** Libellé affiché dans le bouton Clear (tooltip simple via title) */
    clearTitle?: string;

    /** Texte "aucun résultat" */
    emptyText?: string;

    /** Text "loading" */
    loadingText?: string;

    /** Limite d'affichage des chips en multi (le reste => +N) */
    maxChips?: number;

    /** Rendu custom de la valeur dans le trigger */
    renderValue?: (args: {
        multiple: boolean;
        selected: UiFormSelectOption[];
        placeholder: string;
    }) => React.ReactNode;

    /** Rendu custom d'une option */
    renderOption?: (opt: UiFormSelectOption, state: { selected: boolean }) => React.ReactNode;

    /** Classes */
    className?: string;

    /** Classe du conteneur label/hint */
    fieldClassName?: string;

    /** Menu: largeur min / align */
    menuWidthClassName?: string;

    /** Callback ouverture */
    onOpenChange?: (open: boolean) => void;

    /** Contrôle d'ouverture */
    open?: boolean;

    /** Default open (non contrôlé) */
    defaultOpen?: boolean;
};

type FlatItem =
    | { kind: "group"; label: string | null }
    | { kind: "option"; groupLabel: string | null; opt: UiFormSelectOption };

function toArrayValue(v: UiFormSelectProps["value"]): UiSelectValue[] {
    if (Array.isArray(v)) return v.filter((x) => x !== null && x !== undefined) as UiSelectValue[];
    if (v === null || v === undefined) return [];
    return [v];
}

function sameValue(a: UiSelectValue, b: UiSelectValue) {
    return a === b;
}

function normalizeGroups(props: UiFormSelectProps): UiFormSelectGroup[] {
    if (Array.isArray(props.groups) && props.groups.length) {
        return props.groups.map((g) => ({
            label: typeof g.label === "string" ? g.label : (g.label ?? undefined),
            options: Array.isArray(g.options) ? g.options : [],
        }));
    }
    const opts = Array.isArray(props.options) ? props.options : [];
    return [{ label: undefined, options: opts }];
}

function flatten(groups: UiFormSelectGroup[]): FlatItem[] {
    const out: FlatItem[] = [];
    for (const g of groups) {
        const label = g.label ?? null;
        if (label) out.push({ kind: "group", label });
        for (const opt of g.options ?? []) out.push({ kind: "option", groupLabel: label, opt });
    }
    return out;
}

function defaultFilter(opt: UiFormSelectOption, q: string) {
    const query = q.trim().toLowerCase();
    if (!query) return true;
    const a = String(opt.label ?? "").toLowerCase();
    const b = String(opt.description ?? "").toLowerCase();
    const c = String(opt.value ?? "").toLowerCase();
    return a.includes(query) || b.includes(query) || c.includes(query);
}

const toneRing: Record<UiFormSelectTone, string> = {
    theme: "ring-[hsl(var(--accent)/0.35)]",
    neutral: "ring-white/10",
    danger: "ring-rose-400/25",
};

const toneGlow: Record<UiFormSelectTone, string> = {
    theme: "bg-[radial-gradient(240px_140px_at_18%_20%,hsl(var(--accent)/0.18),transparent_65%)]",
    neutral: "bg-[radial-gradient(280px_160px_at_15%_20%,rgba(255,255,255,0.10),transparent_70%)]",
    danger: "bg-[radial-gradient(240px_140px_at_18%_20%,rgba(244,63,94,0.18),transparent_65%)]",
};

const sizeTrigger: Record<UiFormSelectSize, string> = {
    sm: "h-10 px-3 text-sm rounded-2xl",
    md: "h-11 px-3.5 text-sm rounded-2xl",
    lg: "h-12 px-4 text-base rounded-3xl",
};

const sizeMenu: Record<UiFormSelectSize, string> = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
};

const sizeOption: Record<UiFormSelectSize, string> = {
    sm: "px-2.5 py-2 rounded-xl",
    md: "px-3 py-2.5 rounded-xl",
    lg: "px-3.5 py-3 rounded-2xl",
};

function useControllableState<T>(args: {
    value: T | undefined;
    defaultValue: T;
    onChange?: (v: T) => void;
}) {
    const [internal, setInternal] = React.useState<T>(args.defaultValue);
    const isControlled = args.value !== undefined;

    const v = isControlled ? (args.value as T) : internal;

    const set = React.useCallback(
        (next: T) => {
            if (!isControlled) setInternal(next);
            args.onChange?.(next);
        },
        [isControlled, args.onChange]
    );

    return [v, set] as const;
}

function useClickOutside(
    refs: Array<React.RefObject<HTMLElement>>,
    onOutside: () => void,
    enabled: boolean
) {
    React.useEffect(() => {
        if (!enabled) return;

        const onDown = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node | null;
            if (!target) return;

            const inside = refs.some((r) => {
                const el = r.current;
                return el ? el.contains(target) : false;
            });

            if (!inside) onOutside();
        };

        document.addEventListener("mousedown", onDown, true);
        document.addEventListener("touchstart", onDown, true);
        return () => {
            document.removeEventListener("mousedown", onDown, true);
            document.removeEventListener("touchstart", onDown, true);
        };
    }, [refs, onOutside, enabled]);
}

type MenuPos = { top: number; left: number; width: number };

export function UiFormSelect({
    id,
    label,
    placeholder = "Sélectionner…",
    hint,
    error,
    tone = "neutral",
    size = "md",
    disabled,
    loading,
    clearable,
    multiple,
    value,
    defaultValue,
    onChange,
    options,
    groups,
    searchable = true,
    searchPlaceholder = "Rechercher…",
    filterOption,
    clearTitle = "Effacer",
    emptyText = "Aucun résultat",
    loadingText = "Chargement…",
    maxChips = 2,
    renderValue,
    renderOption,
    className,
    fieldClassName,
    menuWidthClassName,
    onOpenChange,
    open: openProp,
    defaultOpen = false,
}: UiFormSelectProps) {
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const searchRef = React.useRef<HTMLInputElement | null>(null);

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const [menuPos, setMenuPos] = React.useState<MenuPos>({ top: 0, left: 0, width: 0 });

    const allGroups = React.useMemo(
        () => normalizeGroups({ options, groups } as any),
        [options, groups]
    );
    const flat = React.useMemo(() => flatten(allGroups), [allGroups]);

    const [open, setOpen] = useControllableState<boolean>({
        value: openProp,
        defaultValue: defaultOpen,
        onChange: (v) => onOpenChange?.(v),
    });

    const [query, setQuery] = React.useState("");
    const [activeIndex, setActiveIndex] = React.useState<number>(-1);

    const isDisabled = !!disabled || !!loading;

    const isControlledValue = value !== undefined;
    const [internalValue, setInternalValue] = React.useState<UiSelectValue[]>(
        toArrayValue(defaultValue ?? null)
    );

    const selectedValues = isControlledValue ? toArrayValue(value) : internalValue;

    const allOptions = React.useMemo(() => {
        const items: UiFormSelectOption[] = [];
        for (const it of flat) if (it.kind === "option") items.push(it.opt);
        return items;
    }, [flat]);

    const selectedOptions = React.useMemo(() => {
        const sel: UiFormSelectOption[] = [];
        for (const v of selectedValues) {
            const found = allOptions.find((o) => sameValue(o.value, v));
            if (found) sel.push(found);
        }
        return sel;
    }, [selectedValues, allOptions]);

    const canClear = !!clearable && selectedValues.length > 0 && !isDisabled;

    const filteredFlat = React.useMemo(() => {
        const f = filterOption ?? defaultFilter;
        const q = query.trim();

        if (!searchable || !q) return flat;

        const out: FlatItem[] = [];
        let currentGroup: string | null = null;
        let groupBuffer: FlatItem[] = [];
        let groupHasAny = false;

        const flushGroup = () => {
            if (!groupBuffer.length) return;
            if (groupHasAny) out.push(...groupBuffer);
            groupBuffer = [];
            groupHasAny = false;
        };

        for (const it of flat) {
            if (it.kind === "group") {
                flushGroup();
                currentGroup = it.label ?? null;
                groupBuffer.push(it);
                continue;
            }

            const ok = f(it.opt, q);
            if (!currentGroup) {
                if (ok) out.push(it);
            } else {
                if (ok) groupHasAny = true;
                if (ok) groupBuffer.push(it);
            }
        }

        flushGroup();
        return out;
    }, [flat, query, searchable, filterOption]);

    const filteredOptionsOnly = React.useMemo(() => {
        return filteredFlat.filter((x) => x.kind === "option") as Array<
            Extract<FlatItem, { kind: "option" }>
        >;
    }, [filteredFlat]);

    // click outside -> close
    useClickOutside([triggerRef as any, menuRef as any], () => setOpen(false), open);

    // focus search on open
    React.useEffect(() => {
        if (!open) return;
        setActiveIndex(-1);

        if (searchable) {
            const raf = requestAnimationFrame(() => searchRef.current?.focus());
            return () => cancelAnimationFrame(raf);
        }
    }, [open, searchable]);

    // reset query on close
    React.useEffect(() => {
        if (!open) setQuery("");
    }, [open]);

    // compute menu position (Portal)
    const computeMenuPos = React.useCallback(() => {
        const t = triggerRef.current;
        if (!t) return;

        const r = t.getBoundingClientRect();
        const offset = 8; // mt-2
        const top = r.bottom + offset;
        const left = r.left;
        const width = r.width;

        setMenuPos({ top, left, width });
    }, []);

    React.useEffect(() => {
        if (!open) return;

        // 2 passes (fonts/layout settle)
        const raf1 = requestAnimationFrame(() => {
            computeMenuPos();
            const raf2 = requestAnimationFrame(() => computeMenuPos());
            return () => cancelAnimationFrame(raf2);
        });

        return () => cancelAnimationFrame(raf1);
    }, [open, computeMenuPos]);

    React.useEffect(() => {
        if (!open) return;

        const onMove = () => computeMenuPos();
        window.addEventListener("scroll", onMove, true);
        window.addEventListener("resize", onMove);
        return () => {
            window.removeEventListener("scroll", onMove, true);
            window.removeEventListener("resize", onMove);
        };
    }, [open, computeMenuPos]);

    const emitChange = React.useCallback(
        (next: UiSelectValue[] | null) => {
            const v = next && next.length ? next : null;

            if (multiple) {
                const arr = (v ?? []) as UiSelectValue[];
                if (!isControlledValue) setInternalValue(arr);
                onChange?.(arr.length ? arr : null);
            } else {
                const one = (v ?? [])[0] ?? null;
                if (!isControlledValue) setInternalValue(one ? [one] : []);
                onChange?.(one);
            }
        },
        [multiple, isControlledValue, onChange]
    );

    const toggleValue = React.useCallback(
        (val: UiSelectValue) => {
            if (isDisabled) return;

            if (multiple) {
                const exists = selectedValues.some((x) => sameValue(x, val));
                const next = exists
                    ? selectedValues.filter((x) => !sameValue(x, val))
                    : [...selectedValues, val];
                emitChange(next);
            } else {
                emitChange([val]);
                setOpen(false);
                triggerRef.current?.focus();
            }
        },
        [multiple, selectedValues, emitChange, isDisabled, setOpen]
    );

    const clear = React.useCallback(() => {
        if (!canClear) return;
        emitChange(null);
        setQuery("");
        setActiveIndex(-1);
        triggerRef.current?.focus();
    }, [canClear, emitChange]);

    const onKeyDownTrigger = (e: React.KeyboardEvent) => {
        if (isDisabled) return;

        if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
            e.preventDefault();
            setOpen(true);
            return;
        }

        if (!open) return;

        if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
            return;
        }

        if (e.key === "Backspace" && canClear && !query) {
            e.preventDefault();
            clear();
            return;
        }

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const dir = e.key === "ArrowDown" ? 1 : -1;

            const n = filteredOptionsOnly.length;
            if (n === 0) return;

            let next = activeIndex;
            for (let i = 0; i < n + 1; i++) {
                next = (next + dir + n) % n;
                const opt = filteredOptionsOnly[next]?.opt;
                if (opt && !opt.disabled) break;
            }
            setActiveIndex(next);

            const el = menuRef.current?.querySelector(
                `[data-opt-index="${next}"]`
            ) as HTMLElement | null;
            el?.scrollIntoView?.({ block: "nearest" });
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex < 0) return;
            const opt = filteredOptionsOnly[activeIndex]?.opt;
            if (!opt || opt.disabled) return;
            toggleValue(opt.value);
            return;
        }
    };

    const computedValueNode = React.useMemo(() => {
        const args = { multiple: !!multiple, selected: selectedOptions, placeholder };
        if (renderValue) return renderValue(args);

        if (!selectedOptions.length) {
            return <span className="text-white/45">{placeholder}</span>;
        }

        if (!multiple) {
            const s = selectedOptions[0];
            return (
                <span className="flex min-w-0 items-center gap-2">
                    {s.emoji ? <span className="text-base leading-none">{s.emoji}</span> : null}
                    <span className="truncate text-white/90">{s.label}</span>
                </span>
            );
        }

        const chips = selectedOptions.slice(0, Math.max(0, maxChips));
        const rest = Math.max(0, selectedOptions.length - chips.length);

        return (
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                {chips.map((s) => (
                    <span
                        key={String(s.value)}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1",
                            "bg-white/5 text-white/80 ring-white/15"
                        )}
                    >
                        {s.emoji ? (
                            <span className="text-[1em] leading-none">{s.emoji}</span>
                        ) : null}
                        <span className="max-w-[140px] truncate">{s.label}</span>
                    </span>
                ))}
                {rest ? <span className="text-xs text-white/55">+{rest}</span> : null}
            </span>
        );
    }, [multiple, selectedOptions, placeholder, renderValue, maxChips]);

    const messageNode = error ? (
        <div className="mt-1.5 text-xs text-rose-200/90">{error}</div>
    ) : hint ? (
        <div className="mt-1.5 text-xs text-white/45">{hint}</div>
    ) : null;

    const ariaId = id ?? React.useId();

    const menuNode =
        open && mounted
            ? createPortal(
                  <div
                      ref={menuRef}
                      className={cn(
                          "fixed z-[250] overflow-hidden rounded-2xl ring-1",
                          "bg-black/80 ring-white/10 backdrop-blur-xl shadow-xl",
                          menuWidthClassName
                      )}
                      style={{
                          top: menuPos.top,
                          left: menuPos.left,
                          width: menuPos.width,
                      }}
                  >
                      <div className={cn("relative", sizeMenu[size])}>
                          <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(420px_200px_at_15%_20%,rgba(255,255,255,0.10),transparent_70%)]" />

                          <div className="relative">
                              {searchable ? (
                                  <div className="mb-2">
                                      <input
                                          ref={searchRef}
                                          value={query}
                                          onChange={(e) => setQuery(e.target.value)}
                                          placeholder={searchPlaceholder}
                                          className={cn(
                                              "w-full rounded-2xl px-3 py-2 text-sm",
                                              "bg-white/5 text-white/85 placeholder:text-white/35",
                                              "ring-1 ring-white/10 outline-none",
                                              "focus:ring-white/20"
                                          )}
                                          onKeyDown={(e) => {
                                              if (e.key === "Escape") {
                                                  e.preventDefault();
                                                  setOpen(false);
                                                  triggerRef.current?.focus();
                                              }
                                          }}
                                      />
                                  </div>
                              ) : null}

                              <div
                                  role="listbox"
                                  aria-multiselectable={!!multiple}
                                  className={cn(
                                      "max-h-[280px] overflow-auto",
                                      "scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                                  )}
                              >
                                  {filteredFlat.length === 0 || filteredOptionsOnly.length === 0 ? (
                                      <div className="px-3 py-3 text-sm text-white/55">
                                          {emptyText}
                                      </div>
                                  ) : (
                                      filteredFlat.map((it, i) => {
                                          if (it.kind === "group") {
                                              return (
                                                  <div
                                                      key={`g:${it.label}:${i}`}
                                                      className="px-3 pt-3 pb-2 text-[11px] tracking-[0.18em] text-white/40"
                                                  >
                                                      {it.label}
                                                  </div>
                                              );
                                          }

                                          const opt = it.opt;
                                          const selected = selectedValues.some((v) =>
                                              sameValue(v, opt.value)
                                          );
                                          const disabledOpt = !!opt.disabled;

                                          const optionIndex = filteredOptionsOnly.findIndex((x) =>
                                              sameValue(x.opt.value, opt.value)
                                          );
                                          const isActive = optionIndex === activeIndex;

                                          return (
                                              <button
                                                  key={`o:${String(opt.value)}:${i}`}
                                                  type="button"
                                                  role="option"
                                                  aria-selected={selected}
                                                  disabled={disabledOpt}
                                                  data-opt-index={optionIndex}
                                                  onMouseEnter={() => setActiveIndex(optionIndex)}
                                                  onClick={() => {
                                                      if (disabledOpt) return;
                                                      toggleValue(opt.value);
                                                  }}
                                                  className={cn(
                                                      "w-full text-left transition",
                                                      sizeOption[size],
                                                      "flex items-start justify-between gap-3",
                                                      disabledOpt &&
                                                          "opacity-40 cursor-not-allowed",
                                                      !disabledOpt && "hover:bg-white/5",
                                                      isActive && "bg-white/5 ring-1 ring-white/10",
                                                      selected && "bg-[hsl(var(--accent)/0.10)]"
                                                  )}
                                              >
                                                  {renderOption ? (
                                                      <div className="min-w-0">
                                                          {renderOption(opt, { selected })}
                                                      </div>
                                                  ) : (
                                                      <div className="min-w-0">
                                                          <div className="flex items-center gap-2">
                                                              {opt.emoji ? (
                                                                  <span className="text-base leading-none">
                                                                      {opt.emoji}
                                                                  </span>
                                                              ) : null}
                                                              <div className="truncate text-sm text-white/90">
                                                                  {opt.label}
                                                              </div>
                                                          </div>
                                                          {opt.description ? (
                                                              <div className="mt-0.5 text-xs text-white/55 line-clamp-2">
                                                                  {opt.description}
                                                              </div>
                                                          ) : null}
                                                      </div>
                                                  )}

                                                  <div className="shrink-0 pt-0.5">
                                                      {multiple ? (
                                                          <span
                                                              className={cn(
                                                                  "grid h-5 w-5 place-items-center rounded-md ring-1",
                                                                  selected
                                                                      ? "bg-[hsl(var(--accent)/0.18)] text-white ring-[hsl(var(--accent)/0.35)]"
                                                                      : "bg-white/5 text-white/40 ring-white/10"
                                                              )}
                                                              aria-hidden
                                                          >
                                                              {selected ? "✓" : ""}
                                                          </span>
                                                      ) : (
                                                          <span
                                                              className="text-white/40"
                                                              aria-hidden
                                                          >
                                                              {selected ? "✓" : ""}
                                                          </span>
                                                      )}
                                                  </div>
                                              </button>
                                          );
                                      })
                                  )}
                              </div>

                              {/* <div className="mt-2 flex items-center justify-between text-[11px] text-white/35">
                                  <span>
                                      {multiple ? "Multi" : "Single"}
                                      {clearable ? " • clearable" : ""}
                                      {searchable ? " • search" : ""}
                                  </span>
                                  <span className="opacity-80">Esc</span>
                              </div> */}
                          </div>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    return (
        <div className={cn("w-full", fieldClassName)}>
            {label ? (
                <label
                    htmlFor={ariaId}
                    className="mb-2 block text-[11px] tracking-[0.18em] text-white/55 uppercase"
                >
                    {label}
                </label>
            ) : null}

            <div className={cn("relative", className)}>
                <button
                    id={ariaId}
                    ref={triggerRef}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                        if (isDisabled) return;
                        setOpen(!open);
                    }}
                    onKeyDown={onKeyDownTrigger}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    className={cn(
                        "relative w-full overflow-hidden ring-1 backdrop-blur-md transition",
                        "bg-black/25 text-left",
                        sizeTrigger[size],
                        error ? "ring-rose-400/25" : toneRing[tone],
                        isDisabled && "opacity-50 cursor-not-allowed",
                        !isDisabled && "hover:bg-black/40"
                    )}
                >
                    <div
                        className={cn(
                            "pointer-events-none absolute inset-0 opacity-70",
                            toneGlow[error ? "danger" : tone]
                        )}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            {loading ? (
                                <span className="text-white/55">{loadingText}</span>
                            ) : (
                                computedValueNode
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {canClear ? (
                                <span
                                    title={clearTitle}
                                    role="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        clear();
                                    }}
                                    className={cn(
                                        "grid h-8 w-8 place-items-center rounded-xl ring-1",
                                        "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
                                    )}
                                >
                                    ✖
                                </span>
                            ) : null}

                            <span
                                className={cn(
                                    "grid h-8 w-8 place-items-center rounded-xl ring-1",
                                    "bg-white/5 text-white/70 ring-white/10"
                                )}
                                aria-hidden
                            >
                                {open ? "▴" : "▾"}
                            </span>
                        </div>
                    </div>
                </button>

                {/* Menu via Portal */}
                {menuNode}
            </div>

            {messageNode}
        </div>
    );
}
