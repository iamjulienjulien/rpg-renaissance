import { create } from "zustand";
import { supabaseBrowser } from "@/lib/supabase/client";

type AuthStore = {
    loading: boolean;
    error: string | null;

    clearError: () => void;

    signInWithPassword: (input: { email: string; password: string }) => Promise<boolean>;

    signUpWithPassword: (input: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        emailRedirectTo?: string;
    }) => Promise<{ needsEmailConfirmation: boolean } | null>;

    signOut: () => Promise<boolean>;
};

function normalizeEmail(email: string) {
    return (email ?? "").trim().toLowerCase();
}

export const useAuthStore = create<AuthStore>((set) => ({
    loading: false,
    error: null,

    clearError: () => set({ error: null }),

    signInWithPassword: async ({ email, password }) => {
        const supabase = supabaseBrowser();
        set({ loading: true, error: null });

        try {
            const e = normalizeEmail(email);
            const p = password ?? "";

            if (!e) {
                set({ error: "Email manquant." });
                return false;
            }
            if (!p) {
                set({ error: "Mot de passe manquant." });
                return false;
            }

            const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });

            if (error) {
                set({ error: error.message });
                return false;
            }

            return true;
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Erreur réseau" });
            return false;
        } finally {
            set({ loading: false });
        }
    },

    signUpWithPassword: async ({ email, password, first_name, last_name, emailRedirectTo }) => {
        const supabase = supabaseBrowser();
        set({ loading: true, error: null });

        try {
            const e = normalizeEmail(email);
            const p = password ?? "";

            if (!e) {
                set({ error: "Email manquant." });
                return null;
            }
            if (!first_name.trim() || !last_name.trim()) {
                set({ error: "Prénom et nom requis." });
                return null;
            }
            if (!p || p.length < 8) {
                set({ error: "Le mot de passe doit faire au moins 8 caractères." });
                return null;
            }

            const { data, error } = await supabase.auth.signUp({
                email: e,
                password: p,
                options: {
                    emailRedirectTo,
                    data: {
                        first_name: first_name.trim(),
                        last_name: last_name.trim(),
                    },
                },
            });

            if (error) {
                set({ error: error.message });
                return null;
            }

            const needsEmailConfirmation = !data?.user;

            return { needsEmailConfirmation };
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Erreur réseau" });
            return null;
        } finally {
            set({ loading: false });
        }
    },

    signOut: async () => {
        const supabase = supabaseBrowser();
        set({ loading: true, error: null });

        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                set({ error: error.message });
                return false;
            }
            window.location.href = "/";
            return true;
        } catch (err) {
            set({ error: err instanceof Error ? err.message : "Erreur réseau" });
            return false;
        } finally {
            set({ loading: false });
        }
    },
}));
