// src/app/(onboarding)/layout.tsx
import React from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        redirect("/auth/signin");
    }

    const { data: profile, error: profileErr } = await supabase
        .from("player_profiles")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (profileErr) {
        redirect("/auth/signin?error=profile_load_failed");
    }

    // Déjà onboardé -> pas besoin d’être ici
    if (profile) {
        redirect("/");
    }

    return <>{children}</>;
}
