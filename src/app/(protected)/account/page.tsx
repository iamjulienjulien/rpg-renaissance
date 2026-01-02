"use client";

import React, { useEffect, useMemo, useState } from "react";
import RpgShell from "@/components/RpgShell";
import { Panel, Pill, ActionButton } from "@/components/RpgUi";
import { usePlayerStore } from "@/stores/playerStore";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { UserContextForm } from "@/components/account/UserContextForm";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function AccountPage() {
    const { user, profile, session, loading, saving, error, bootstrap, updateDisplayName } =
        usePlayerStore();

    const { signOut } = useAuthStore();

    const charsBootstrap = useGameStore((s) => s.bootstrap);
    const characters = useGameStore((s) => s.characters);
    const selectedId = useGameStore((s) => s.selectedId);
    const activateCharacter = useGameStore((s) => s.activateCharacter);
    const charSaving = useGameStore((s) => s.saving);
    const charError = useGameStore((s) => s.error);

    const [nameDraft, setNameDraft] = useState("");

    useEffect(() => {
        void bootstrap();
        void charsBootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setNameDraft(profile?.display_name ?? "");
    }, [profile?.display_name]);

    const activeCharacterLabel = useMemo(() => {
        const c =
            characters.find((x) => x.id === (selectedId ?? profile?.character_id ?? "")) ?? null;
        return c ? `${c.emoji ?? "🧙"} ${c.name}` : "—";
    }, [characters, selectedId, profile?.character_id]);

    return (
        <RpgShell
            title="Compte"
            subtitle="Ton identité dans le royaume: profil, personnage, session."
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>👤 {profile?.display_name ?? "Sans nom"}</Pill>
                    <Pill>🔐 {user?.email ?? "…"}</Pill>
                </div>
            }
        >
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-4">
                    <Panel title="Profil" emoji="👤" subtitle="Ce que le jeu sait de toi.">
                        <div className="space-y-3">
                            {error || charError ? (
                                <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-white/80 ring-1 ring-red-500/20">
                                    {error ?? charError}
                                </div>
                            ) : null}

                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                <div className="text-xs text-white/55">Email</div>
                                <div className="mt-1 text-sm font-semibold text-white/90">
                                    {user?.email ?? "—"}
                                </div>
                            </div>

                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                <div className="text-xs text-white/55">Nom affiché</div>

                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        value={nameDraft}
                                        onChange={(e) => setNameDraft(e.target.value)}
                                        placeholder="Ton nom de joueur"
                                        className="w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/35 focus:ring-white/20"
                                    />
                                    <ActionButton
                                        variant="soft"
                                        disabled={saving || loading}
                                        onClick={() => void updateDisplayName(nameDraft)}
                                    >
                                        💾 Sauver
                                    </ActionButton>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                                <div className="text-xs text-white/55">Personnage</div>
                                <div className="mt-1 text-sm font-semibold text-white/90">
                                    {activeCharacterLabel}
                                </div>

                                <div className="mt-3 flex items-center gap-2">
                                    <select
                                        defaultValue={selectedId ?? profile?.character_id ?? ""}
                                        onChange={(e) => void activateCharacter(e.target.value)}
                                        className={cn(
                                            "w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-white/90 ring-1 ring-white/10 outline-none focus:ring-white/20",
                                            charSaving ? "opacity-70" : ""
                                        )}
                                    >
                                        <option value="">— Choisir —</option>
                                        {characters.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {(c.emoji ?? "🧙") + " " + c.name}
                                            </option>
                                        ))}
                                    </select>

                                    <Pill>{charSaving ? "⏳" : "OK"}</Pill>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <ActionButton
                                    variant="solid"
                                    disabled={saving}
                                    onClick={() => void signOut()}
                                >
                                    🚪 Se déconnecter
                                </ActionButton>
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Session" emoji="🎮" subtitle="Une seule partie active à la fois.">
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            {loading ? (
                                <div className="text-sm text-white/60">⏳ Chargement…</div>
                            ) : session ? (
                                <div className="space-y-2">
                                    <div className="text-sm font-semibold text-white/90">
                                        {session.title}
                                    </div>
                                    <div className="text-xs text-white/60">
                                        Status: {session.status} • Active:{" "}
                                        {String(session.is_active)}
                                    </div>
                                    <div className="text-xs text-white/50">
                                        id: <span className="text-white/65">{session.id}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-white/60">
                                    Aucune session active. (Elle sera créée automatiquement au
                                    besoin.)
                                </div>
                            )}
                        </div>
                    </Panel>
                </div>
                <div>
                    <UserContextForm />
                </div>
            </div>
        </RpgShell>
    );
}
