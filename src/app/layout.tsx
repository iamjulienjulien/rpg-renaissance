import type { Metadata } from "next";

import ThemeHydrator from "@/components/ThemeHydrator";
import AppHotkeys from "@/components/AppHotKeys";
import CommandPalette from "@/components/CommandPalette";
import Toasts from "@/components/toasts/Toasts";
import DevHud from "@/components/DevHud";
import SettingsApplier from "@/components/SettingsApplier";
import { UiMotionConfig } from "@/components/motion/UiMotion";

import "./globals.css";
import ToastEngine from "@/components/toasts/ToastEngine";

export const metadata = {
    title: "RPG Renaissance — Le jeu dont tu es le héros",
    description:
        "Chaque action compte. Chaque pièce est un champ de bataille. RPG Renaissance transforme ton quotidien en aventure et t’aide à avancer, une victoire après l’autre.",
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon-32x32.png",
        apple: "/apple-touch-icon.png",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr">
            <body>
                <ThemeHydrator />
                <SettingsApplier />
                <AppHotkeys />
                <CommandPalette />
                <ToastEngine />
                <Toasts />
                <DevHud />
                <UiMotionConfig>{children}</UiMotionConfig>
            </body>
        </html>
    );
}
