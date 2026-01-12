import type { Config } from "tailwindcss";

export default {
    content: [
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/**/*.{js,ts,jsx,tsx,mdx}", // ✅ (important, voir point 2)
    ],

    // safelist: ["font-uiserif"],

    theme: {
        extend: {
            /*
             |--------------------------------------------------------------------------
             | TYPOGRAPHIE RPG (scalable via CSS variables)
             |--------------------------------------------------------------------------
             */

            fontSize: {
                "rpg-xs": "var(--rpg-text-xs)",
                "rpg-sm": "var(--rpg-text-sm)",
                "rpg-base": "var(--rpg-text-base)",
                "rpg-lg": "var(--rpg-text-lg)",
                "rpg-xl": "var(--rpg-text-xl)",
                "rpg-2xl": "var(--rpg-text-2xl)",
            },

            lineHeight: {
                "rpg-tight": "var(--rpg-leading-tight)",
                "rpg-normal": "var(--rpg-leading-normal)",
                "rpg-relaxed": "var(--rpg-leading-relaxed)",
            },

            fontFamily: {
                uiserif: ["var(--font-fraunces)", "ui-serif", "serif"],
            },

            /*
             |--------------------------------------------------------------------------
             | COULEURS / UI (préparation future)
             |--------------------------------------------------------------------------
             */

            colors: {
                rpg: {
                    bg: "rgb(0 0 0 / 0.6)",
                    panel: "rgb(0 0 0 / 0.4)",
                    border: "rgb(255 255 255 / 0.12)",
                    accent: "rgb(168 85 247 / 0.9)", // violet IA
                },
                proof: "#ff00ff",
            },

            /*
             |--------------------------------------------------------------------------
             | RAYONS & OMBRES (cohérence UI)
             |--------------------------------------------------------------------------
             */

            borderRadius: {
                rpg: "1.25rem",
                "rpg-lg": "1.75rem",
            },

            boxShadow: {
                rpg: "0 20px 60px rgba(0,0,0,0.55)",
                "rpg-soft": "0 10px 30px rgba(0,0,0,0.35)",
            },

            /*
             |--------------------------------------------------------------------------
             | ANIMATIONS (compatibles reduce-motion)
             |--------------------------------------------------------------------------
             */

            transitionTimingFunction: {
                rpg: "cubic-bezier(0.22, 1, 0.36, 1)",
            },

            transitionDuration: {
                rpg: "220ms",
            },
        },
    },

    plugins: [],
} satisfies Config;
