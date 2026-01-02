"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import PhotoUploader, { type UploadedPhotoPayload } from "@/components/PhotoUploader";

import { usePlantsList, usePlantPrefillFlow } from "@/hooks/inventory";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type Mode = "list" | "add" | "edit";

type DataCell = { type?: string; value?: any };
type DataMap = Record<string, DataCell>;

type EditTarget = {
    id: string;
    title: string | null;
    ai_description: string | null;
    cover_photo_url: string | null;
    data?: any;
} | null;

/* ============================================================================
DATA helpers
============================================================================ */

function isObject(x: any): x is Record<string, any> {
    return !!x && typeof x === "object" && !Array.isArray(x);
}

function normalizeDataMap(input: any): DataMap {
    if (!isObject(input)) return {};

    // déjà au format { key: { type, value } }
    const looksLikeTyped = Object.values(input).some(
        (v) => isObject(v) && ("value" in v || "type" in v)
    );
    if (looksLikeTyped) {
        const out: DataMap = {};
        for (const [k, v] of Object.entries(input)) {
            if (isObject(v))
                out[k] = { type: (v as any).type ?? "string", value: (v as any).value ?? null };
            else out[k] = { type: "string", value: v ?? null };
        }
        return out;
    }

    // format “plat” { key: "abc" } -> typed
    const out: DataMap = {};
    for (const [k, v] of Object.entries(input)) {
        const t = typeof v === "number" ? "number" : typeof v === "boolean" ? "boolean" : "string";
        out[k] = { type: t, value: v ?? null };
    }
    return out;
}

function setDataValue(prev: DataMap, key: string, nextValue: any, type?: string): DataMap {
    const next = { ...prev };
    const current = next[key] ?? {};
    next[key] = { type: type ?? current.type ?? "string", value: nextValue };
    return next;
}

function dataPreviewLine(data: any): string | null {
    const d = normalizeDataMap(data);
    const guess =
        d?.species_guess?.value ??
        d?.species?.value ??
        d?.common_name?.value ??
        d?.name?.value ??
        null;

    return typeof guess === "string" && guess.trim() ? guess.trim() : null;
}

/* ============================================================================
DATA editor UI (local component)
============================================================================ */

function DataEditor(props: {
    value: DataMap;
    onChange: (next: DataMap) => void;

    // optionnel: liste de champs à prioriser (affichés en premier)
    priorityKeys?: string[];
    readonly?: boolean;
}) {
    const {
        value,
        onChange,
        priorityKeys = [
            "name",
            "common_name",
            "species",
            "species_guess",
            "location",
            "light",
            "watering",
            "health",
            "notes",
        ],
        readonly,
    } = props;

    const entries = useMemo(() => {
        const map = value ?? {};
        const keys = Object.keys(map);

        // tri: priorityKeys d’abord, puis alpha
        const prio = priorityKeys.filter((k) => keys.includes(k));
        const rest = keys.filter((k) => !prio.includes(k)).sort((a, b) => a.localeCompare(b, "fr"));
        const ordered = [...prio, ...rest];

        return ordered.map((k) => [k, map[k]] as const);
    }, [value, priorityKeys]);

    const updateKey = (key: string, next: any, type?: string) => {
        onChange(setDataValue(value, key, next, type));
    };

    const addField = () => {
        const k = `field_${Math.floor(Math.random() * 9999)}`;
        onChange(setDataValue(value, k, "", "string"));
    };

    const removeField = (key: string) => {
        const next = { ...(value ?? {}) };
        delete next[key];
        onChange(next);
    };

    const FieldInput = (key: string, cell: DataCell) => {
        const t = (cell?.type ?? "string").toString();
        const v = cell?.value ?? null;

        // petits enums “connus” (tu peux étendre)
        const isLight = key === "light";
        const isWatering = key === "watering";
        const isHealth = key === "health";

        if (isLight || isWatering || isHealth) {
            const options =
                key === "health"
                    ? (["poor", "ok", "good"] as const)
                    : (["low", "medium", "high"] as const);

            return (
                <select
                    value={v ?? ""}
                    disabled={readonly}
                    onChange={(e) => updateKey(key, e.target.value || null, "string")}
                    className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                >
                    <option value="">—</option>
                    {options.map((o) => (
                        <option key={o} value={o}>
                            {o}
                        </option>
                    ))}
                </select>
            );
        }

        if (t === "number") {
            return (
                <input
                    value={v ?? ""}
                    disabled={readonly}
                    inputMode="numeric"
                    onChange={(e) => {
                        const raw = e.target.value.trim();
                        const n = raw === "" ? null : Number(raw);
                        updateKey(key, Number.isFinite(n as any) ? n : null, "number");
                    }}
                    className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                    placeholder="Nombre"
                />
            );
        }

        if (t === "boolean") {
            return (
                <select
                    value={v === true ? "true" : v === false ? "false" : ""}
                    disabled={readonly}
                    onChange={(e) => {
                        const raw = e.target.value;
                        updateKey(key, raw === "" ? null : raw === "true", "boolean");
                    }}
                    className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/25"
                >
                    <option value="">—</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            );
        }

        // string default
        return (
            <input
                value={typeof v === "string" ? v : v == null ? "" : String(v)}
                disabled={readonly}
                onChange={(e) => updateKey(key, e.target.value, "string")}
                className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
                placeholder={key}
            />
        );
    };

    return (
        <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs tracking-[0.22em] text-white/55 uppercase">Métadonnées</div>

                {!readonly ? (
                    <ActionButton onClick={addField} variant="soft">
                        ➕ Champ
                    </ActionButton>
                ) : null}
            </div>

            {entries.length === 0 ? (
                <div className="mt-2 text-sm text-white/50">Aucune donnée structurée.</div>
            ) : (
                <div className="mt-3 grid gap-2">
                    {entries.map(([key, cell]) => (
                        <div
                            key={key}
                            className="grid gap-2 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10 sm:grid-cols-[180px_1fr_auto]"
                        >
                            <div className="text-sm text-white/70 break-all">{key}</div>

                            <div>{FieldInput(key, cell)}</div>

                            {!readonly ? (
                                <ActionButton
                                    // variant="ghost"
                                    onClick={() => removeField(key)}
                                    // title="Supprimer"
                                >
                                    🗑️
                                </ActionButton>
                            ) : (
                                <div />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ============================================================================
PAGE
============================================================================ */

export default function InventoryPlantsPage() {
    const router = useRouter();

    const { plants, loading, error, refresh, hasItems } = usePlantsList({ auto: true });
    const flow = usePlantPrefillFlow();

    const [mode, setMode] = useState<Mode>("list");
    const [editTarget, setEditTarget] = useState<EditTarget>(null);

    const plantsCountLabel = useMemo(() => {
        const n = plants.length;
        return n <= 1 ? `${n} plante` : `${n} plantes`;
    }, [plants.length]);

    const goList = async () => {
        flow.clear();
        setEditTarget(null);
        setMode("list");
    };

    const goAdd = () => {
        flow.clear();
        setEditTarget(null);
        setMode("add");
    };

    const goEdit = (p: any) => {
        flow.clear();
        setEditTarget({
            id: p.id,
            title: p.title ?? null,
            ai_description: p.ai_description ?? null,
            cover_photo_url: p.cover_photo_url ?? null,
            data: p.data ?? null,
        });
        setMode("edit");
    };

    const onUploaded = (payload: UploadedPhotoPayload) => {
        flow.setPhotoInput({
            id: payload.photo.id,
            signed_url: payload.signed_url ?? "",
        });
    };

    /* ========================= EDIT STATE (incl. data) ========================= */

    const [editBusy, setEditBusy] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editAiDesc, setEditAiDesc] = useState("");
    const [editData, setEditData] = useState<DataMap>({});

    React.useEffect(() => {
        if (mode !== "edit" || !editTarget) return;
        setEditTitle(editTarget.title ?? "");
        setEditAiDesc(editTarget.ai_description ?? "");
        setEditData(normalizeDataMap(editTarget.data));
    }, [mode, editTarget]);

    const submitEdit = async () => {
        if (!editTarget?.id) return;
        const title = editTitle.trim();
        if (!title) return;

        setEditBusy(true);
        try {
            const res = await fetch("/api/inventory/items", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editTarget.id,
                    title,
                    ai_description: editAiDesc.trim() || null,
                    data: editData, // ✅ now
                }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                console.error(json?.error ?? "Update failed");
                return;
            }

            await refresh();
            await goList();
        } finally {
            setEditBusy(false);
        }
    };

    return (
        <RpgShell
            title="Mes plantes"
            subtitle="🌿 Inventaire vivant: consulte, ajoute, ajuste."
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill onClick={() => router.push("/inventory")} title="Retour inventaire">
                        ↩️ Inventaire
                    </Pill>
                    <Pill>🌱 {plantsCountLabel}</Pill>
                </div>
            }
        >
            <div className="grid gap-4">
                <Panel
                    title="Plantes"
                    emoji="🌿"
                    subtitle="Chaque item = une plante. Photos + description + données structurées."
                    right={
                        mode === "list" ? (
                            <ActionButton variant="solid" onClick={goAdd}>
                                ➕ Ajouter
                            </ActionButton>
                        ) : (
                            <ActionButton onClick={() => void goList()}>↩️ Retour</ActionButton>
                        )
                    }
                >
                    {/* Errors */}
                    {error ? (
                        <div className="mb-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-400/20">
                            ⚠️ {error}
                        </div>
                    ) : null}

                    {flow.error ? (
                        <div className="mb-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-400/20">
                            ⚠️ {flow.error}
                        </div>
                    ) : null}

                    {/* ========================= LIST ========================= */}
                    {mode === "list" ? (
                        <>
                            {loading ? (
                                <div className="rpg-text-sm text-white/60">⏳ Chargement…</div>
                            ) : !hasItems ? (
                                <div className="rpg-text-sm text-white/60">
                                    Aucune plante inventoriée pour l’instant.
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    {plants.map((p: any) => {
                                        const meta = dataPreviewLine(p.data);

                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => goEdit(p)}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-2xl bg-black/30 p-3 ring-1 ring-white/10",
                                                    "text-left hover:bg-white/5 transition"
                                                )}
                                            >
                                                <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                                                    {p.cover_photo_url ? (
                                                        <img
                                                            src={p.cover_photo_url}
                                                            alt={p.title ?? "Plante"}
                                                            className="h-full w-full object-cover"
                                                            draggable={false}
                                                        />
                                                    ) : (
                                                        <div className="grid h-full w-full place-items-center text-xl">
                                                            🌱
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate font-semibold text-white/85">
                                                        {p.title ?? "Plante sans nom"}
                                                    </div>

                                                    {meta ? (
                                                        <div className="text-xs text-white/60">
                                                            {meta}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-white/40">
                                                            Métadonnées vides
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-xs text-white/45">✍️</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {hasItems ? (
                                <div className="mt-3 flex justify-end">
                                    <ActionButton onClick={() => void refresh()}>
                                        🔄 Rafraîchir
                                    </ActionButton>
                                </div>
                            ) : null}
                        </>
                    ) : null}

                    {/* ========================= ADD ========================= */}
                    {mode === "add" ? (
                        <div className="space-y-4">
                            <div className="text-xs tracking-[0.18em] text-white/50">
                                {flow.step === "idle" && "📸 Photo"}
                                {flow.step === "prefilling" && "🧠 Analyse"}
                                {flow.step === "editing" && "✍️ Vérification"}
                                {flow.step === "creating" && "🌱 Création"}
                            </div>

                            {!flow.photo ? (
                                <PhotoUploader
                                    title="Photo de la plante"
                                    subtitle="Prends une photo nette (feuilles + port). L’IA préremplira les champs."
                                    category="other"
                                    autoUpload
                                    maxSizeMb={12}
                                    onUploaded={onUploaded}
                                />
                            ) : (
                                <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                                            {flow.photo.signed_url ? (
                                                <img
                                                    src={flow.photo.signed_url}
                                                    alt="Photo plante"
                                                    className="h-full w-full object-cover"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="grid h-full w-full place-items-center text-xl">
                                                    📷
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs tracking-[0.18em] text-white/55">
                                                📌 PHOTO PRÊTE
                                            </div>
                                            <div className="mt-1 rpg-text-sm text-white/70">
                                                L’IA peut analyser cette image.
                                            </div>
                                        </div>

                                        <ActionButton
                                            onClick={() => flow.clear()}
                                            disabled={flow.prefillLoading || flow.saving}
                                        >
                                            🧹 Reset
                                        </ActionButton>
                                    </div>
                                </div>
                            )}

                            {flow.photo && !flow.draft ? (
                                <ActionButton
                                    variant="solid"
                                    onClick={() => void flow.runPrefill()}
                                    disabled={flow.prefillLoading || flow.saving}
                                >
                                    {flow.prefillLoading ? "⏳ Analyse…" : "🧠 Analyser la plante"}
                                </ActionButton>
                            ) : null}

                            {flow.draft ? (
                                <div className="space-y-3">
                                    <label className="grid gap-2">
                                        <div className="text-xs tracking-[0.18em] text-white/55">
                                            🏷️ TITRE
                                        </div>
                                        <input
                                            value={flow.draft.title ?? ""}
                                            onChange={(e) => flow.updateTitle(e.target.value)}
                                            placeholder="Ex: Pachira"
                                            className={cn(
                                                "w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                                                "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                                "focus:ring-2 focus:ring-white/20"
                                            )}
                                        />
                                    </label>

                                    <label className="grid gap-2">
                                        <div className="text-xs tracking-[0.18em] text-white/55">
                                            🧠 DESCRIPTION IA
                                        </div>
                                        <textarea
                                            value={flow.draft.ai_description ?? ""}
                                            onChange={(e) =>
                                                flow.updateAiDescription(e.target.value)
                                            }
                                            placeholder="Indices visibles, état, contexte…"
                                            className={cn(
                                                "w-full min-h-[120px] rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                                                "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                                "focus:ring-2 focus:ring-white/20"
                                            )}
                                        />
                                    </label>

                                    {/* ✅ DATA METADATA (edit draft) */}
                                    <DataEditor
                                        value={normalizeDataMap(flow.draft.data)}
                                        onChange={(next) => flow.patchDraft({ data: next } as any)}
                                    />

                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                        <ActionButton
                                            onClick={() => void goList()}
                                            disabled={flow.prefillLoading || flow.saving}
                                        >
                                            ↩️ Annuler
                                        </ActionButton>

                                        <ActionButton
                                            variant="master"
                                            onClick={async () => {
                                                await flow.create();
                                                await refresh();
                                                await goList();
                                            }}
                                            disabled={flow.prefillLoading || flow.saving}
                                        >
                                            {flow.saving
                                                ? "⏳ Création…"
                                                : "🌱 Ajouter à l’inventaire"}
                                        </ActionButton>
                                    </div>
                                </div>
                            ) : (
                                <ActionButton
                                    onClick={() => void goList()}
                                    disabled={flow.prefillLoading || flow.saving}
                                >
                                    ↩️ Annuler
                                </ActionButton>
                            )}
                        </div>
                    ) : null}

                    {/* ========================= EDIT ========================= */}
                    {mode === "edit" && editTarget ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                                        {editTarget.cover_photo_url ? (
                                            <img
                                                src={editTarget.cover_photo_url}
                                                alt={editTarget.title ?? "Plante"}
                                                className="h-full w-full object-cover"
                                                draggable={false}
                                            />
                                        ) : (
                                            <div className="grid h-full w-full place-items-center text-xl">
                                                🌱
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs tracking-[0.18em] text-white/55">
                                            ✍️ ÉDITION
                                        </div>
                                        <div className="mt-1 rpg-text-sm text-white/70">
                                            Ajuste les infos, puis sauvegarde.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <label className="grid gap-2">
                                <div className="text-xs tracking-[0.18em] text-white/55">
                                    🏷️ TITRE
                                </div>
                                <input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className={cn(
                                        "w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                                        "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                        "focus:ring-2 focus:ring-white/20"
                                    )}
                                />
                            </label>

                            <label className="grid gap-2">
                                <div className="text-xs tracking-[0.18em] text-white/55">
                                    🧠 DESCRIPTION
                                </div>
                                <textarea
                                    value={editAiDesc}
                                    onChange={(e) => setEditAiDesc(e.target.value)}
                                    className={cn(
                                        "w-full min-h-[140px] rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                                        "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                        "focus:ring-2 focus:ring-white/20"
                                    )}
                                />
                            </label>

                            {/* ✅ DATA METADATA (edit item) */}
                            <DataEditor value={editData} onChange={setEditData} />

                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <ActionButton onClick={() => void goList()} disabled={editBusy}>
                                    ↩️ Annuler
                                </ActionButton>

                                <ActionButton
                                    variant="solid"
                                    onClick={() => void submitEdit()}
                                    disabled={editBusy || !editTitle.trim()}
                                >
                                    {editBusy ? "⏳ Sauvegarde…" : "✅ Sauvegarder"}
                                </ActionButton>
                            </div>
                        </div>
                    ) : null}
                </Panel>
            </div>
        </RpgShell>
    );
}
