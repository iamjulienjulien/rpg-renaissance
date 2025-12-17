"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";
import RoomsSelector from "@/components/RoomsSelector";

import type { Adventure, AdventureRoom, AdventureQuest } from "@/features/adventures/types";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function HomeRealignmentSetupPage() {
    const router = useRouter();

    const [adventure, setAdventure] = useState<Adventure | null>(null);
    const [rooms, setRooms] = useState<AdventureRoom[]>([]);
    const [backlog, setBacklog] = useState<AdventureQuest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Backlog UI
    const [roomCode, setRoomCode] = useState<string>("");
    const [questTitle, setQuestTitle] = useState("");
    const [creatingQuest, setCreatingQuest] = useState(false);

    // AI
    const [generating, setGenerating] = useState(false);
    const [aiCount, setAiCount] = useState<5 | 8 | 12>(5);

    const loadAll = async () => {
        setLoading(true);
        try {
            const advRes = await fetch("/api/adventures/by-code?code=home_realignment", {
                cache: "no-store",
            });

            const advJson = await advRes.json();
            const adv = advJson.adventure ?? null;
            setAdventure(adv);

            if (!adv) return;

            const [roomsRes, qRes] = await Promise.all([
                fetch(`/api/adventure-rooms?adventureId=${encodeURIComponent(adv.id)}`, {
                    cache: "no-store",
                }),
                fetch(`/api/adventure-quests?adventureId=${encodeURIComponent(adv.id)}`, {
                    cache: "no-store",
                }),
            ]);

            const roomsJson = await roomsRes.json();
            const qJson = await qRes.json();

            setRooms(roomsJson.rooms ?? []);
            setBacklog(qJson.quests ?? []);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        if (!adventure) return;

        setRefreshing(true);
        try {
            const [roomsRes, qRes] = await Promise.all([
                fetch(`/api/adventure-rooms?adventureId=${encodeURIComponent(adventure.id)}`, {
                    cache: "no-store",
                }),
                fetch(`/api/adventure-quests?adventureId=${encodeURIComponent(adventure.id)}`, {
                    cache: "no-store",
                }),
            ]);

            const roomsJson = await roomsRes.json();
            const qJson = await qRes.json();

            if (roomsRes.ok) setRooms(roomsJson.rooms ?? []);
            if (qRes.ok) setBacklog(qJson.quests ?? []);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void loadAll();
    }, []);

    useEffect(() => {
        if (!roomCode) return;
        const stillExists = rooms.some((r) => r.code === roomCode);
        if (!stillExists) setRoomCode("");
    }, [rooms, roomCode]);

    const generateBacklogWithAi = async () => {
        if (!adventure) return;
        if (rooms.length === 0) {
            alert("Ajoute/active au moins une pièce avant de générer des quêtes 🏠");
            return;
        }

        setGenerating(true);
        try {
            const res = await fetch("/api/ai/backlog/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adventureId: adventure.id,
                    perRoomCount: aiCount,
                    allowGlobal: false,
                    rooms: rooms.map((r) => ({ code: r.code, title: r.title })),
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                console.error(json?.error ?? "AI generation failed", json);
                alert(`IA: échec génération ❌\n${json?.error ?? "unknown error"}`);
                return;
            }

            // On peut soit push localement, soit refresh depuis DB.
            // Refresh = source of truth et évite les soucis de tri.
            await refreshData();

            alert(`🎲 ${json?.generated ?? 0} quêtes ajoutées au backlog ✅`);
        } finally {
            setGenerating(false);
        }
    };

    const addBacklogQuest = async () => {
        if (!adventure) return;

        const t = questTitle.trim();
        if (!t) return;

        setCreatingQuest(true);
        try {
            const res = await fetch("/api/adventure-quests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adventure_id: adventure.id,
                    room_code: roomCode || null,
                    title: t,
                    difficulty: 2,
                    estimate_min: null,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                console.error(json?.error ?? "Add quest failed");
                return;
            }

            setBacklog((prev) => [json.quest as AdventureQuest, ...prev]);
            setQuestTitle("");
        } finally {
            setCreatingQuest(false);
        }
    };

    const launchAdventure = async () => {
        if (!adventure) return;

        // On force un minimum UX: pas lancer si backlog vide
        if (backlog.length === 0) {
            alert("Ajoute au moins une quête au backlog avant de lancer l’aventure 📜");
            return;
        }

        const res = await fetch("/api/chapters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                adventure_id: adventure.id,
                title: "Chapitre 1",
                pace: "standard",
            }),
        });

        const json = await res.json();
        if (!res.ok) {
            console.error(json?.error ?? "Launch failed");
            alert(json?.error ?? "Launch failed");
            return;
        }

        router.push(
            `/adventure/home-realignment/chapter?chapterId=${encodeURIComponent(json.chapter.id)}`
        );
    };

    return (
        <RpgShell
            title="Préparation d’aventure"
            subtitle="Réalignement du foyer • Pièces + Backlog → Lancer"
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>🏠 home_realignment</Pill>

                    <ActionButton onClick={refreshData}>
                        {refreshing ? "⏳" : "🔄 Recharger"}
                    </ActionButton>

                    <ActionButton
                        variant="solid"
                        onClick={launchAdventure}
                        disabled={!adventure || backlog.length === 0}
                    >
                        🚀 Lancer l’aventure
                    </ActionButton>

                    <Pill>⌘K</Pill>
                </div>
            }
        >
            {loading ? (
                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                    ⏳ Chargement…
                </div>
            ) : !adventure ? (
                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                    Aventure introuvable. Vérifie le seed `home_realignment` dans Supabase.
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* ✅ Pièces: templates + custom */}
                    <RoomsSelector adventureId={adventure.id} onChanged={refreshData} />

                    {/* ✅ Backlog */}
                    <Panel
                        title="Backlog de quêtes"
                        emoji="📜"
                        subtitle="Définis les missions avant de jouer. L’IA viendra booster ça."
                        right={<Pill>{backlog.length} quêtes</Pill>}
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <select
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value)}
                                className="rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/80 ring-1 ring-white/10 outline-none"
                            >
                                <option value="">🗺️ Toutes pièces</option>
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.code}>
                                        🚪 {r.title}
                                    </option>
                                ))}
                            </select>

                            <input
                                value={questTitle}
                                onChange={(e) => setQuestTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") void addBacklogQuest();
                                }}
                                placeholder="Ex: Vider le plan de travail (10 min)…"
                                className={cn(
                                    "w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white/90",
                                    "ring-1 ring-white/10 outline-none placeholder:text-white/40",
                                    "focus:ring-2 focus:ring-white/25"
                                )}
                            />

                            <ActionButton onClick={addBacklogQuest} variant="solid">
                                {creatingQuest ? "⏳ Ajout…" : "➕ Ajouter"}
                            </ActionButton>
                        </div>

                        <div className="mt-4 space-y-2">
                            {backlog.length === 0 ? (
                                <div className="rounded-2xl bg-black/30 p-4 text-sm text-white/60 ring-1 ring-white/10">
                                    Aucun backlog. Ajoute quelques quêtes ou attends l’IA 🎲
                                </div>
                            ) : (
                                backlog.map((q) => {
                                    const roomLabel = q.room_code
                                        ? (rooms.find((r) => r.code === q.room_code)?.title ??
                                          q.room_code)
                                        : null;

                                    return (
                                        <div
                                            key={q.id}
                                            className="w-full rounded-2xl bg-black/25 p-4 text-left ring-1 ring-white/10"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="text-white/90">📌 {q.title}</div>
                                                <div className="flex items-center gap-2">
                                                    {roomLabel ? (
                                                        <Pill>🚪 {roomLabel}</Pill>
                                                    ) : (
                                                        <Pill>🗺️ sans pièce</Pill>
                                                    )}
                                                    <Pill>🎚️ {q.difficulty}</Pill>
                                                </div>
                                            </div>

                                            {q.description ? (
                                                <div className="mt-2 text-sm text-white/60">
                                                    {q.description}
                                                </div>
                                            ) : (
                                                <div className="mt-2 text-sm text-white/45">
                                                    📝 Pas de description (ok pour l’instant).
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="mt-4 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 text-sm text-white/70">
                            💡 Astuce: vise 8–15 quêtes réparties sur les pièces. Ensuite: 🚀 Lancer
                            l’aventure.
                        </div>
                    </Panel>

                    <Panel
                        title="IA"
                        emoji="🧠"
                        subtitle="Génère un backlog propre, pièce par pièce."
                        right={
                            <div className="flex items-center gap-2">
                                <Pill>🎲 {aiCount}/pièce</Pill>
                                <ActionButton
                                    variant="solid"
                                    onClick={generateBacklogWithAi}
                                    disabled={!adventure || rooms.length === 0 || generating}
                                >
                                    {generating ? "⏳ Génération…" : "🎲 Générer"}
                                </ActionButton>
                            </div>
                        }
                    >
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 text-sm text-white/70">
                            L’IA propose des quêtes concrètes et courtes pour chaque pièce active.
                            Aucun stress: tu pourras supprimer/ajouter ensuite.
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <ActionButton
                                variant={aiCount === 5 ? "solid" : "soft"}
                                onClick={() => setAiCount(5)}
                            >
                                5
                            </ActionButton>
                            <ActionButton
                                variant={aiCount === 8 ? "solid" : "soft"}
                                onClick={() => setAiCount(8)}
                            >
                                8
                            </ActionButton>
                            <ActionButton
                                variant={aiCount === 12 ? "solid" : "soft"}
                                onClick={() => setAiCount(12)}
                            >
                                12
                            </ActionButton>

                            <Pill>💡 Conseil: commence par 5</Pill>
                            <Pill>🧼 Ciblé, pas parfait</Pill>
                        </div>

                        <div className="mt-3 text-xs text-white/55">
                            (DEV) On filtre déjà les doublons par pièce. On améliorera ensuite:
                            génération guidée, variantes, suppression en batch.
                        </div>
                    </Panel>
                </div>
            )}
        </RpgShell>
    );
}
