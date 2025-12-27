// src/app/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import RenaissanceLandingPublic from "@/components/RenaissanceLandingPublic";
import RenaissanceHome from "@/components/RenaissanceHome";

export default async function HomePage() {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.getUser();

    // ✅ visiteur (non connecté) -> landing publique
    if (error || !data.user) {
        return <RenaissanceLandingPublic />;
    }

    // ✅ connecté -> vérifier player_profiles
    const { data: profile, error: profErr } = await supabase
        .from("player_profiles")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

    // Si erreur base: on évite de boucler, mais on ne bloque pas l'accès
    // (à toi de choisir: ici je renvoie Home, sinon tu peux redirect vers /auth/signin?error=...)
    if (profErr) {
        return <RenaissanceHome />;
    }

    // ✅ pas encore onboardé -> onboarding
    if (!profile) {
        redirect("/onboarding");
    }

    // ✅ profil ok -> home privée
    return <RenaissanceHome />;
}
