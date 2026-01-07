"use client";

import React, { useEffect, useState } from "react";
import { UiActionButton, UiPanel } from "../ui";
import { useProfileOptions } from "@/hooks/useProfileOptions";
import { UiFormSelect, type UiFormSelectOption } from "@/components/ui/UiFormSelect";
import { useGameStore, type PatchMePayload } from "@/stores/gameStore";
import { usePlayerProfileDetails } from "@/hooks/usePlayerProfileDetails";
import { usePlayerStore } from "@/stores/playerStore";

export function UserSessionsPanel() {
    const { session, loading } = usePlayerStore();

    return (
        <UiPanel title="Session" emoji="🎮" subtitle="Une seule partie active à la fois.">
            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                {loading ? (
                    <div className="text-sm text-white/60">⏳ Chargement…</div>
                ) : session ? (
                    <div className="space-y-2">
                        <div className="text-sm font-semibold text-white/90">{session.title}</div>
                        <div className="text-xs text-white/60">
                            Status: {session.status} • Active: {String(session.is_active)}
                        </div>
                        <div className="text-xs text-white/50">
                            id: <span className="text-white/65">{session.id}</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-white/60">
                        Aucune session active. (Elle sera créée automatiquement au besoin.)
                    </div>
                )}
            </div>
        </UiPanel>
    );
}
