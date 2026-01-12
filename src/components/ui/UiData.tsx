// src/components/ui/UiData.tsx
"use client";

import * as React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type UiDataScheme = "neutral" | "theme" | "violet" | "emerald" | "amber" | "rose" | "sky";
type UiDataSize = "sm" | "md" | "lg";

export type UiDataProps = {
    /** Objet (ou n'importe quelle valeur) à afficher */
    data: unknown;

    /** Titre optionnel */
    title?: React.ReactNode;

    /** Badge / meta à droite du header (ex: "player", "api", "store") */
    meta?: React.ReactNode;

    /** Affiche le header (auto si title/meta présent) */
    showHeader?: boolean;

    /** Schéma de couleur */
    scheme?: UiDataScheme;

    /** Taille globale */
    size?: UiDataSize;

    /** Code block scrollable */
    maxHeight?: number | string; // ex: 320, "40vh"

    /** Indentation JSON */
    indent?: number; // default 2

    /** Trie les clés des objets (stable) */
    sortKeys?: boolean;

    /** Coupe le texte très long (soft clamp via CSS, utile pour énormes JSON) */
    wrap?: boolean;

    /** Active un rendu “tree” : objets/arrays repliables */
    collapsible?: boolean;

    /** Profondeur ouverte par défaut (0 = tout replié, 1 = root ouvert, etc.) */
    defaultOpenDepth?: number;

    /** Affiche une toolbar (open/close + depth) quand collapsible=true */
    showToolbar?: boolean;

    /** Profondeur max pour “Tout ouvrir” (évite d’exploser le DOM) */
    maxOpenDepth?: number;

    /** Affiche/masque les guillemets dans le rendu (cosmétique) */
    showQuotes?: boolean;

    /** Affiche un bouton "Copy" */
    copyable?: boolean;

    /** Label du bouton copy */
    copyLabel?: string;

    /** Callback si copy ok */
    onCopied?: () => void;

    /** Par défaut, masque les clés sensibles (token, key, password...) */
    redact?: boolean;

    /** Liste de patterns (string ou regex) à masquer */
    redactKeys?: Array<string | RegExp>;

    /** Remplacement utilisé pour les champs masqués */
    redactReplacement?: string;

    /** Affiche l'erreur de stringify si elle survient */
    showError?: boolean;

    /** Classes supplémentaires */
    className?: string;
};

const schemeClasses: Record<
    UiDataScheme,
    { shell: string; header: string; badge: string; code: string; border: string; button: string }
> = {
    neutral: {
        shell: "bg-black/25 ring-white/10",
        header: "text-white/85",
        badge: "bg-white/5 text-white/70 ring-white/10",
        code: "bg-black/30 text-white/85",
        border: "ring-white/10",
        button: "bg-white/10 hover:bg-white/15 text-white/85 ring-white/15",
    },
    theme: {
        shell: "bg-[hsl(var(--accent)/0.06)] ring-[hsl(var(--accent)/0.18)]",
        header: "text-white/90",
        badge: "bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] ring-[hsl(var(--accent)/0.35)]",
        code: "bg-black/35 text-white/90",
        border: "ring-[hsl(var(--accent)/0.22)]",
        button: "bg-[hsl(var(--accent)/0.14)] hover:bg-[hsl(var(--accent)/0.18)] text-[hsl(var(--accent))] ring-[hsl(var(--accent)/0.35)]",
    },
    violet: {
        shell: "bg-violet-500/5 ring-violet-400/15",
        header: "text-white/90",
        badge: "bg-violet-400/10 text-violet-200 ring-violet-400/25",
        code: "bg-black/35 text-white/90",
        border: "ring-violet-400/15",
        button: "bg-violet-400/10 hover:bg-violet-400/15 text-violet-200 ring-violet-400/25",
    },
    emerald: {
        shell: "bg-emerald-500/5 ring-emerald-400/15",
        header: "text-white/90",
        badge: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/25",
        code: "bg-black/35 text-white/90",
        border: "ring-emerald-400/15",
        button: "bg-emerald-400/10 hover:bg-emerald-400/15 text-emerald-200 ring-emerald-400/25",
    },
    amber: {
        shell: "bg-amber-500/5 ring-amber-400/15",
        header: "text-white/90",
        badge: "bg-amber-400/10 text-amber-200 ring-amber-400/25",
        code: "bg-black/35 text-white/90",
        border: "ring-amber-400/15",
        button: "bg-amber-400/10 hover:bg-amber-400/15 text-amber-200 ring-amber-400/25",
    },
    rose: {
        shell: "bg-rose-500/5 ring-rose-400/15",
        header: "text-white/90",
        badge: "bg-rose-400/10 text-rose-200 ring-rose-400/25",
        code: "bg-black/35 text-white/90",
        border: "ring-rose-400/15",
        button: "bg-rose-400/10 hover:bg-rose-400/15 text-rose-200 ring-rose-400/25",
    },
    sky: {
        shell: "bg-sky-500/5 ring-sky-400/15",
        header: "text-white/90",
        badge: "bg-sky-400/10 text-sky-200 ring-sky-400/25",
        code: "bg-black/35 text-white/90",
        border: "ring-sky-400/15",
        button: "bg-sky-400/10 hover:bg-sky-400/15 text-sky-200 ring-sky-400/25",
    },
};

const sizeClasses: Record<
    UiDataSize,
    { shell: string; title: string; meta: string; code: string }
> = {
    sm: {
        shell: "rounded-2xl p-3",
        title: "text-sm",
        meta: "text-xs",
        code: "text-xs p-3 rounded-2xl",
    },
    md: {
        shell: "rounded-3xl p-4",
        title: "text-base",
        meta: "text-xs",
        code: "text-xs p-4 rounded-2xl",
    },
    lg: {
        shell: "rounded-3xl p-5",
        title: "text-lg",
        meta: "text-sm",
        code: "text-sm p-5 rounded-2xl",
    },
};

function stableStringify(
    input: unknown,
    opts: {
        indent: number;
        sortKeys: boolean;
        redact: boolean;
        redactKeys: Array<string | RegExp>;
        redactReplacement: string;
    }
) {
    const seen = new WeakSet<object>();

    const shouldRedactKey = (k: string) => {
        const kk = k.toLowerCase();
        if (opts.redact) {
            // garde-fou default (même si redactKeys est vide)
            const defaults = [
                "token",
                "key",
                "secret",
                "password",
                "authorization",
                "cookie",
                "set-cookie",
                "apikey",
                "api_key",
            ];
            if (defaults.some((d) => kk.includes(d))) return true;
        }
        for (const p of opts.redactKeys) {
            if (typeof p === "string") {
                if (kk.includes(p.toLowerCase())) return true;
            } else {
                if (p.test(k)) return true;
            }
        }
        return false;
    };

    const replacer = (_key: string, value: any) => {
        if (value && typeof value === "object") {
            if (seen.has(value)) return "[Circular]";
            seen.add(value);
        }

        // Si c'est un objet, on peut trier les clés au niveau de l'objet
        if (value && typeof value === "object" && !Array.isArray(value)) {
            const obj = value as Record<string, any>;
            const keys = Object.keys(obj);

            const mapped: Record<string, any> = {};
            const ordered = opts.sortKeys ? [...keys].sort((a, b) => a.localeCompare(b)) : keys;

            for (const k of ordered) {
                if (shouldRedactKey(k)) mapped[k] = opts.redactReplacement;
                else mapped[k] = obj[k];
            }
            return mapped;
        }

        return value;
    };

    return JSON.stringify(input, replacer, opts.indent);
}

function dequoteCosmetic(json: string) {
    // Cosmétique only: enlève les guillemets autour des clés simples "foo": -> foo:
    // (Attention: ce n'est plus du JSON strict, juste un rendu)
    return json.replace(/"([A-Za-z0-9_]+)"\s*:/g, "$1:");
}

type JsonToken =
    | { t: "punct"; v: string }
    | { t: "space"; v: string }
    | { t: "string"; v: string }
    | { t: "number"; v: string }
    | { t: "bool"; v: string }
    | { t: "null"; v: string }
    | { t: "other"; v: string };

// Couleurs “lisibles” sur fond sombre, déclinées par scheme
const jsonPalette: Record<
    UiDataScheme,
    {
        key: string;
        string: string;
        number: string;
        bool: string;
        nullv: string;
        punct: string;
    }
> = {
    neutral: {
        key: "text-white/85",
        string: "text-emerald-200/90",
        number: "text-amber-200/90",
        bool: "text-sky-200/90",
        nullv: "text-white/50",
        punct: "text-white/45",
    },
    theme: {
        key: "text-white/90",
        string: "text-[hsl(var(--accent))] drop-shadow-[0_0_10px_hsl(var(--accent)/0.25)]",
        number: "text-amber-200/90",
        bool: "text-sky-200/90",
        nullv: "text-white/55",
        punct: "text-white/45",
    },
    violet: {
        key: "text-violet-100",
        string: "text-violet-200/90",
        number: "text-amber-200/90",
        bool: "text-sky-200/90",
        nullv: "text-white/55",
        punct: "text-white/45",
    },
    emerald: {
        key: "text-emerald-100",
        string: "text-emerald-200/90",
        number: "text-amber-200/90",
        bool: "text-sky-200/90",
        nullv: "text-white/55",
        punct: "text-white/45",
    },
    amber: {
        key: "text-amber-100",
        string: "text-emerald-200/90",
        number: "text-amber-200/95",
        bool: "text-sky-200/90",
        nullv: "text-white/55",
        punct: "text-white/45",
    },
    rose: {
        key: "text-rose-100",
        string: "text-rose-200/90",
        number: "text-amber-200/90",
        bool: "text-sky-200/90",
        nullv: "text-white/55",
        punct: "text-white/45",
    },
    sky: {
        key: "text-sky-100",
        string: "text-sky-200/90",
        number: "text-amber-200/90",
        bool: "text-sky-200/90",
        nullv: "text-white/55",
        punct: "text-white/45",
    },
};

// Tokenizer JSON “suffisant” pour debug (pas un parseur complet)
function tokenizeJson(text: string): JsonToken[] {
    const out: JsonToken[] = [];
    let i = 0;

    const isDigit = (c: string) => c >= "0" && c <= "9";

    while (i < text.length) {
        const c = text[i];

        // whitespace
        if (c === " " || c === "\n" || c === "\t" || c === "\r") {
            let j = i + 1;
            while (
                j < text.length &&
                (text[j] === " " || text[j] === "\n" || text[j] === "\t" || text[j] === "\r")
            )
                j++;
            out.push({ t: "space", v: text.slice(i, j) });
            i = j;
            continue;
        }

        // punctuation
        if (c === "{" || c === "}" || c === "[" || c === "]" || c === ":" || c === ",") {
            out.push({ t: "punct", v: c });
            i++;
            continue;
        }

        // strings
        if (c === '"') {
            let j = i + 1;
            let escaped = false;
            while (j < text.length) {
                const cj = text[j];
                if (escaped) {
                    escaped = false;
                    j++;
                    continue;
                }
                if (cj === "\\") {
                    escaped = true;
                    j++;
                    continue;
                }
                if (cj === '"') {
                    j++;
                    break;
                }
                j++;
            }
            out.push({ t: "string", v: text.slice(i, j) });
            i = j;
            continue;
        }

        // numbers (approx)
        if (c === "-" || isDigit(c)) {
            let j = i + 1;
            while (j < text.length) {
                const cj = text[j];
                if (
                    isDigit(cj) ||
                    cj === "." ||
                    cj === "e" ||
                    cj === "E" ||
                    cj === "+" ||
                    cj === "-"
                )
                    j++;
                else break;
            }
            out.push({ t: "number", v: text.slice(i, j) });
            i = j;
            continue;
        }

        // literals: true/false/null
        if (text.startsWith("true", i)) {
            out.push({ t: "bool", v: "true" });
            i += 4;
            continue;
        }
        if (text.startsWith("false", i)) {
            out.push({ t: "bool", v: "false" });
            i += 5;
            continue;
        }
        if (text.startsWith("null", i)) {
            out.push({ t: "null", v: "null" });
            i += 4;
            continue;
        }

        // fallback
        out.push({ t: "other", v: c });
        i++;
    }

    return out;
}

// Heuristique “key”: string suivie (après espaces) de ":"
function markJsonKeys(tokens: JsonToken[]) {
    const isSpace = (t: JsonToken) => t.t === "space";
    const isPunct = (t: JsonToken, v: string) => t.t === "punct" && t.v === v;

    return tokens.map((tok, idx) => {
        if (tok.t !== "string") return { ...tok, key: false };

        let j = idx + 1;
        while (j < tokens.length && isSpace(tokens[j]!)) j++;
        const isKey = j < tokens.length && isPunct(tokens[j]!, ":");
        return { ...tok, key: isKey };
    });
}

function renderJsonTokens(text: string, scheme: UiDataScheme) {
    const P = jsonPalette[scheme];
    const tokens = markJsonKeys(tokenizeJson(text));

    return tokens.map((tok, idx) => {
        if (tok.t === "space") return <React.Fragment key={idx}>{tok.v}</React.Fragment>;

        if (tok.t === "punct")
            return (
                <span key={idx} className={P.punct}>
                    {tok.v}
                </span>
            );

        if (tok.t === "string") {
            const cls = (tok as any).key ? P.key : P.string;
            return (
                <span key={idx} className={cls}>
                    {tok.v}
                </span>
            );
        }

        if (tok.t === "number")
            return (
                <span key={idx} className={P.number}>
                    {tok.v}
                </span>
            );
        if (tok.t === "bool")
            return (
                <span key={idx} className={P.bool}>
                    {tok.v}
                </span>
            );
        if (tok.t === "null")
            return (
                <span key={idx} className={P.nullv}>
                    {tok.v}
                </span>
            );

        return (
            <span key={idx} className="text-white/60">
                {tok.v}
            </span>
        );
    });
}

const indentPx = (n: number) => n * 14;

function stripQuotes(s: string) {
    return s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
}

function jsType(v: any) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    return typeof v;
}

function renderPrimitive(v: any, scheme: UiDataScheme) {
    const P = jsonPalette[scheme];

    if (v === null) return <span className={P.nullv}>null</span>;
    if (typeof v === "boolean") return <span className={P.bool}>{String(v)}</span>;
    if (typeof v === "number") return <span className={P.number}>{String(v)}</span>;
    if (typeof v === "string") return <span className={P.string}>"{v.replace(/"/g, '\\"')}"</span>;

    return <span className="text-white/60">{String(v)}</span>;
}

function renderTreeValue(args: {
    value: any;
    scheme: UiDataScheme;
    depth: number;
    defaultOpenDepth: number;
    sortKeys: boolean;
}) {
    const { value, scheme, depth, defaultOpenDepth, sortKeys } = args;
    const P = jsonPalette[scheme];

    const t = jsType(value);

    if (t !== "object" && t !== "array") {
        return renderPrimitive(value, scheme);
    }

    const isOpen = depth < defaultOpenDepth;

    if (t === "array") {
        const arr: any[] = value ?? [];
        const count = arr.length;

        return (
            <details open={isOpen} className="group">
                <summary className="cursor-pointer select-none list-none inline-flex items-center gap-2">
                    <span className={P.punct}>[</span>
                    <span className="text-white/55 text-[11px]">{count} items</span>
                    <span className={P.punct}>]</span>
                    <span className="ml-2 opacity-0 group-hover:opacity-100 text-white/40 text-[11px] transition">
                        ⏷
                    </span>
                </summary>

                <div className="mt-1">
                    {arr.map((it, idx) => (
                        <div key={idx} style={{ paddingLeft: indentPx(depth + 1) }}>
                            <span className={P.punct}>{idx}</span>
                            <span className={P.punct}>:</span>{" "}
                            {renderTreeValue({
                                value: it,
                                scheme,
                                depth: depth + 1,
                                defaultOpenDepth,
                                sortKeys,
                            })}
                        </div>
                    ))}
                </div>
            </details>
        );
    }

    // object
    const obj: Record<string, any> = value ?? {};
    const keys = Object.keys(obj);
    const ordered = sortKeys ? [...keys].sort((a, b) => a.localeCompare(b)) : keys;

    return (
        <details open={isOpen} className="group">
            <summary className="cursor-pointer select-none list-none inline-flex items-center gap-2">
                <span className={P.punct}>{"{"}</span>
                <span className="text-white/55 text-[11px]">{ordered.length} keys</span>
                <span className={P.punct}>{"}"}</span>
                <span className="ml-2 opacity-0 group-hover:opacity-100 text-white/40 text-[11px] transition">
                    ⏷
                </span>
            </summary>

            <div className="mt-1">
                {ordered.map((k) => (
                    <div key={k} style={{ paddingLeft: indentPx(depth + 1) }}>
                        <span className={P.key}>"{k}"</span>
                        <span className={P.punct}>:</span>{" "}
                        {renderTreeValue({
                            value: obj[k],
                            scheme,
                            depth: depth + 1,
                            defaultOpenDepth,
                            sortKeys,
                        })}
                    </div>
                ))}
            </div>
        </details>
    );
}

export function UiData({
    data,
    title,
    meta,
    showHeader,
    scheme = "neutral",
    size = "md",
    maxHeight = 360,
    indent = 2,
    sortKeys = true,
    wrap = false,
    collapsible = false,
    defaultOpenDepth = 1,
    showToolbar = true,
    maxOpenDepth = 12,
    showQuotes = true,
    copyable = true,
    copyLabel = "Copier",
    onCopied,
    redact = true,
    redactKeys = [],
    redactReplacement = "[REDACTED]",
    showError = true,
    className,
}: UiDataProps) {
    const headerWanted = (showHeader ?? !!title) || !!meta || copyable;

    const [copied, setCopied] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);

    const [openDepth, setOpenDepth] = React.useState(defaultOpenDepth);

    React.useEffect(() => {
        setOpenDepth(defaultOpenDepth);
    }, [defaultOpenDepth]);

    const jsonText = React.useMemo(() => {
        setErr(null);
        try {
            const raw = stableStringify(data, {
                indent,
                sortKeys,
                redact,
                redactKeys,
                redactReplacement,
            });
            return showQuotes ? raw : dequoteCosmetic(raw);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Stringify error";
            setErr(msg);
            return "{}";
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, indent, sortKeys, redact, redactReplacement, showQuotes, JSON.stringify(redactKeys)]);

    const safeDataForTree = React.useMemo(() => {
        try {
            // On reprend exactement la même logique (redact + sort), mais on reparle en objet
            // (utile pour le rendu tree / collapsible)
            const raw = stableStringify(data, {
                indent,
                sortKeys,
                redact,
                redactKeys,
                redactReplacement,
            });
            return JSON.parse(raw);
        } catch {
            return null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, indent, sortKeys, redact, redactReplacement, JSON.stringify(redactKeys)]);

    const doCopy = async () => {
        try {
            await navigator.clipboard.writeText(jsonText);
            setCopied(true);
            onCopied?.();
            window.setTimeout(() => setCopied(false), 1200);
        } catch (e) {
            // pas bloquant
        }
    };

    const S = schemeClasses[scheme];
    const Z = sizeClasses[size];

    return (
        <section className={cn("ring-1", S.shell, Z.shell, className)}>
            {headerWanted ? (
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {title ? (
                            <div
                                className={cn(
                                    "font-uiserif font-semibold tracking-tight",
                                    S.header,
                                    Z.title
                                )}
                            >
                                {title}
                            </div>
                        ) : null}
                        {meta ? (
                            <div className={cn("mt-1 text-white/55", Z.meta)}>{meta}</div>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                        {copyable ? (
                            <button
                                type="button"
                                onClick={doCopy}
                                className={cn(
                                    "shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 transition",
                                    S.button
                                )}
                            >
                                {copied ? "✅ Copié" : `📋 ${copyLabel}`}
                            </button>
                        ) : null}
                        {!title && meta ? (
                            <span
                                className={cn(
                                    "shrink-0 rounded-full px-3 py-1 text-xs ring-1",
                                    S.badge
                                )}
                            >
                                debug
                            </span>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div
                className={cn("mt-3 ring-1", S.border, S.code, Z.code)}
                style={{
                    maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
                    overflow: "auto",
                }}
            >
                {collapsible && showToolbar ? (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setOpenDepth(0)}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 transition",
                                    S.button
                                )}
                            >
                                🙈 Tout fermer
                            </button>

                            <button
                                type="button"
                                onClick={() => setOpenDepth(maxOpenDepth)}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 transition",
                                    S.button
                                )}
                            >
                                🦅 Tout ouvrir
                            </button>
                        </div>

                        <div className="inline-flex items-center gap-2">
                            <span className="text-[11px] text-white/55">Profondeur</span>

                            <button
                                type="button"
                                onClick={() => setOpenDepth((d) => Math.max(0, d - 1))}
                                className={cn(
                                    "inline-flex items-center justify-center rounded-full w-8 h-8 text-sm ring-1 transition",
                                    S.button
                                )}
                                aria-label="Diminuer la profondeur"
                            >
                                −
                            </button>

                            <span className="min-w-[2ch] text-center text-[11px] text-white/70 tabular-nums">
                                {openDepth}
                            </span>

                            <button
                                type="button"
                                onClick={() => setOpenDepth((d) => Math.min(maxOpenDepth, d + 1))}
                                className={cn(
                                    "inline-flex items-center justify-center rounded-full w-8 h-8 text-sm ring-1 transition",
                                    S.button
                                )}
                                aria-label="Augmenter la profondeur"
                            >
                                +
                            </button>
                        </div>
                    </div>
                ) : null}
                <pre
                    className={cn(
                        "font-mono leading-relaxed",
                        wrap ? "whitespace-pre-wrap wrap-break-word" : "whitespace-pre"
                    )}
                >
                    {collapsible ? (
                        safeDataForTree ? (
                            renderTreeValue({
                                value: safeDataForTree,
                                scheme,
                                depth: 0,
                                defaultOpenDepth: openDepth,
                                sortKeys,
                            })
                        ) : (
                            <span className="text-rose-200">
                                ⚠️ Impossible de parser les données
                            </span>
                        )
                    ) : (
                        renderJsonTokens(jsonText, scheme)
                    )}
                </pre>

                {showError && err ? (
                    <div className="mt-3 text-[11px] text-rose-200 bg-rose-500/10 ring-1 ring-rose-500/20 rounded-2xl px-3 py-2">
                        ⚠️ {err}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
