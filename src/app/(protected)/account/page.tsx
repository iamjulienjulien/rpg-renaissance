"use client";

import React, { useEffect, useMemo, useState } from "react";
import RpgShell from "@/components/RpgShell";
import { Panel, Pill, ActionButton } from "@/components/RpgUi";
import { usePlayerStore } from "@/stores/playerStore";
import { useGameStore, type PatchMePayload } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { UserContextForm } from "@/components/account/UserContextForm";
import { ProfileDetailsForm } from "@/components/account/ProfileDetailsForm";
import { UiActionButton, UiCard, UiFormDate, UiFormText, UiPanel } from "@/components/ui";
import { usePlayerProfileDetails } from "@/hooks/usePlayerProfileDetails";
import { useProfileOptions } from "@/hooks/useProfileOptions";
import { UiFormSelect, type UiFormSelectOption } from "@/components/ui/UiFormSelect";
import { UserSessionsPanel } from "@/components/account/UserSessionsPanel";
import { ProfileForm } from "@/components/account/ProfileForm";
import PlayerAvatarModal from "@/components/modals/PlayerAvatarModal";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function AccountPage() {
    return (
        <RpgShell
            title="Atelier du Héros"
            subtitle="🛠️ Définis qui tu es, comment tu avances, et ce qui te met en mouvement 🏁"
        >
            <div className="flex gap-6">
                <div className="flex-1 flex flex-col gap-6">
                    <ProfileForm />
                    <UserSessionsPanel />
                </div>
                <div className="flex-1 flex flex-col gap-6">
                    <ProfileDetailsForm />
                    <UserContextForm hideActions footerActions />
                </div>
            </div>
            <PlayerAvatarModal />
        </RpgShell>
    );
}
