"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

type RoomTemplate = {
    id: string;
    code: string;
    title: string;
    icon: string | null;
    sort: number;
};

type AdventureRoom = {
    id: string;
    adventure_id: string;
    code: string;
    title: string;
    sort: number;
    source: "template" | "custom";
    template_id: string | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function slugify(input: string) {
    return input
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
}

function uniqueRoomCode(baseTitle: string, existingCodes: Set<string>) {
    const base = slugify(baseTitle);
    if (!base) return "";

    if (!existingCodes.has(base)) return base;

    let i = 2;
    while (existingCodes.has(`${base}-${i}`)) i += 1;
    return `${base}-${i}`;
}

export default function RoomsSelector(props: { adventureId: string; onChanged?: () => void }) {
    const { adventureId, onChanged } = props;

    const [loading, setLoading] = useState(true);
    const [busyCode, setBusyCode] = useState<string | null>(null);

    const [templates, setTemplates] = useState<RoomTemplate[]>([]);
    const [activeRooms, setActiveRooms] = useState<AdventureRoom[]>([]);

    const [customTitle, setCustomTitle] = useState("");

    const activeTemplateCodes = useMemo(() => {
        const set = new Set<string>();
        for (const r of activeRooms) {
            if (r.source === "template") set.add(r.code);
        }
        return set;
    }, [activeRooms]);

    const customRooms = useMemo(
        () => activeRooms.filter((r) => r.source === "custom"),
        [activeRooms]
    );

    const existingCodes = useMemo(() => {
        const set = new Set<string>();
        for (const r of activeRooms) set.add(r.code);
        return set;
    }, [activeRooms]);

    const reload = async () => {
        setLoading(true);
        try {
            const [tplRes, roomsRes] = await Promise.all([
                fetch("/api/room-templates", { cache: "no-store" }),
                fetch(`/api/adventure-rooms?adventureId=${encodeURIComponent(adventureId)}`, {
                    cache: "no-store",
                }),
            ]);

            const tplJson = await tplRes.json();
            const roomsJson = await roomsRes.json();

            if (!tplRes.ok) throw new Error(tplJson?.error ?? "Failed to load templates");
            if (!roomsRes.ok) throw new Error(roomsJson?.error ?? "Failed to load rooms");

            setTemplates((tplJson.templates ?? []) as RoomTemplate[]);
            setActiveRooms((roomsJson.rooms ?? []) as AdventureRoom[]);
        } catch (e) {
            console.error(e);
            setTemplates([]);
            setActiveRooms([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!adventureId) return;
        void reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adventureId]);

    const enableTemplate = async (code: string) => {
        setBusyCode(code);
        try {
            const res = await fetch("/api/adventure-rooms/from-template", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adventureId, templateCode: code }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? "Enable failed");

            const room = json.room as AdventureRoom;
            setActiveRooms((prev) => {
                const exists = prev.some((r) => r.id === room.id);
                return exists ? prev : [room, ...prev];
            });
            onChanged?.();
        } catch (e) {
            console.error(e);
        } finally {
            setBusyCode(null);
        }
    };

    const disableTemplate = async (code: string) => {
        setBusyCode(code);
        try {
            const res = await fetch(
                `/api/adventure-rooms/from-template/delete?adventureId=${encodeURIComponent(adventureId)}&templateCode=${encodeURIComponent(code)}`,
                { method: "DELETE" }
            );

            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? "Disable failed");

            setActiveRooms((prev) =>
                prev.filter((r) => !(r.source === "template" && r.code === code))
            );
            onChanged?.();
        } catch (e) {
            console.error(e);
        } finally {
            setBusyCode(null);
        }
    };

    const addCustomRoom = async () => {
        const title = customTitle.trim();
        if (!title) return;

        const code = uniqueRoomCode(title, existingCodes);
        if (!code) return;

        setBusyCode(code);

        try {
            const res = await fetch("/api/adventure-rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adventure_id: adventureId,
                    code,
                    title,
                    sort: 100,
                    source: "custom",
                    template_id: null,
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? "Create failed");

            setActiveRooms((prev) => [json.room as AdventureRoom, ...prev]);
            setCustomTitle("");
            onChanged?.();
        } catch (e) {
            console.error(e);
            alert("Impossible d’ajouter cette pièce (code déjà utilisé). Essaie un autre nom.");
        } finally {
            setBusyCode(null);
        }
    };

    const removeCustomRoom = async (roomId: string) => {
        setBusyCode(roomId);
        try {
            const res = await fetch(`/api/adventure-rooms?id=${encodeURIComponent(roomId)}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? "Delete failed");

            setActiveRooms((prev) => prev.filter((r) => r.id !== roomId));
            onChanged?.();
        } catch (e) {
            console.error(e);
        } finally {
            setBusyCode(null);
        }
    };

    return (
        <Panel
            title="Carte du foyer"
            emoji="🏠"
            subtitle="Choisis les pièces qui comptent. Les quêtes s’y accrocheront.."
            // right={<ActionButton onClick={() => void reload()}>🔄 Recharger</ActionButton>}
        >
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement des pièces…
                </div>
            ) : (
                <div className="grid gap-4">
                    {/* Templates */}
                    <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="flex items-center justify-between gap-3">
                            <div className="rpg-text-sm font-semibold text-white/85">
                                🧱 Pièces de base (bibliothèque)
                            </div>
                            <Pill>{templates.length} modèles</Pill>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            {templates.map((t) => {
                                const on = activeTemplateCodes.has(t.code);
                                const busy = busyCode === t.code;

                                return (
                                    <button
                                        key={t.id}
                                        onClick={() =>
                                            on
                                                ? void disableTemplate(t.code)
                                                : void enableTemplate(t.code)
                                        }
                                        className={cn(
                                            "rounded-full px-3 py-2 text-xs ring-1 transition",
                                            on
                                                ? "bg-white/10 text-white ring-white/15"
                                                : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10",
                                            busy && "opacity-60 pointer-events-none"
                                        )}
                                        title={
                                            on
                                                ? "Désactiver pour cette aventure"
                                                : "Activer pour cette aventure"
                                        }
                                    >
                                        {t.icon ? `${t.icon} ` : "🏷️ "}
                                        {t.title}
                                        <span className="ml-2 opacity-70">{on ? "✅" : "＋"}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-3 text-xs text-white/50">
                            Astuce: tu peux activer seulement les pièces utiles à cette aventure.
                            Les quêtes s’attachent aux pièces actives.
                        </div>
                    </div>

                    {/* Custom */}
                    <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                        <div className="flex items-center justify-between gap-3">
                            <div className="rpg-text-sm font-semibold text-white/85">
                                ✨ Pièces personnalisées (cette aventure)
                            </div>
                            <Pill>{customRooms.length} pièces</Pill>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                                placeholder="Ex: Chambre de Louise, Cellier, Balcon…"
                                className="h-11 w-full rounded-2xl bg-black/30 px-4 rpg-text-sm text-white/85 ring-1 ring-white/10 outline-none placeholder:text-white/35 focus:ring-white/20"
                            />
                            <button
                                onClick={() => void addCustomRoom()}
                                className={cn(
                                    "h-11 shrink-0 rounded-2xl bg-white/5 px-4 rpg-text-sm text-white/85 ring-1 ring-white/10 transition hover:bg-white/10",
                                    (!customTitle.trim() || busyCode === slugify(customTitle)) &&
                                        "opacity-60 pointer-events-none"
                                )}
                            >
                                ＋ Ajouter
                            </button>
                        </div>

                        {customRooms.length ? (
                            <div className="mt-3 space-y-2">
                                {customRooms
                                    .slice()
                                    .sort((a, b) => a.sort - b.sort)
                                    .map((r) => {
                                        const busy = busyCode === r.id;

                                        return (
                                            <div
                                                key={r.id}
                                                className={cn(
                                                    "flex items-center justify-between gap-3 rounded-2xl bg-black/30 p-3 ring-1 ring-white/10",
                                                    busy && "opacity-60"
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <div className="truncate rpg-text-sm text-white/85">
                                                        🧩 {r.title}
                                                    </div>
                                                    <div className="truncate text-xs text-white/45">
                                                        code: {r.code}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => void removeCustomRoom(r.id)}
                                                    className={cn(
                                                        "rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/80 ring-1 ring-white/10 transition hover:bg-white/10",
                                                        busy && "pointer-events-none"
                                                    )}
                                                >
                                                    🗑️ Supprimer
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="mt-3 rounded-2xl bg-black/30 p-4 rpg-text-sm text-white/60 ring-1 ring-white/10">
                                Aucune pièce personnalisée. Ajoute-en une si ton foyer a des zones
                                uniques 🗝️
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Panel>
    );
}
