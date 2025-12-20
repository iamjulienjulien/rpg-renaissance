import type { Metadata } from "next";

import AppHotkeys from "@/components/AppHotKeys";
import CommandPalette from "@/components/CommandPalette";
import Toasts from "@/components/Toasts";
import DevHud from "@/components/DevHud";
import SettingsApplier from "@/components/ui/SettingsApplier";

import "./globals.css";

export const metadata: Metadata = {
    title: "RPG Renaissance",
    description: "🛡️ Ton RPG du quotidien, à la lame douce 🗡️",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr">
            <body>
                <SettingsApplier />
                <AppHotkeys />
                <CommandPalette />
                <Toasts />
                <DevHud />
                {children}
            </body>
        </html>
    );
}
