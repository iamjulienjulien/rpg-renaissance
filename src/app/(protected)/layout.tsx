// src/app/(protected)/layout.tsx
import React from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const supabase = await supabaseServer(); // ✅ important
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        redirect("/login");
    }

    return <>{children}</>;
}
