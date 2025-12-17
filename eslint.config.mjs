import path from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

export default [
    // Config Next (équivalent à extends: ["next/core-web-vitals", "next/typescript"])
    ...compat.extends("next/core-web-vitals", "next/typescript"),

    // Désactive les règles ESLint qui entrent en conflit avec Prettier
    eslintConfigPrettier,

    // (Optionnel) petites règles de confort, safe en dev
    {
        rules: {
            // Exemple: tu peux activer/désactiver des règles ici si tu veux
            // "no-console": "off",
        },
    },
];
