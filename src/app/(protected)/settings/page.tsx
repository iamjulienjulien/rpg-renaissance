"use client";

// React
import React, { useMemo, useState } from "react";

// Components
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

// Stores
import { useToastStore } from "@/stores/toastStore";
import { useDevStore } from "@/stores/devStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { usePlayerStore } from "@/stores/playerStore";
import { useUiSettingsStore } from "@/stores/uiSettingsStore";
import { useUiStore } from "@/stores/uiStore";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function SettingRow(props: {
    emoji: string;
    title: string;
    description?: string;
    value?: string;
    right?: React.ReactNode;
    tone?: "default" | "danger";
    faded?: boolean; // ✅ v0.1.1
}) {
    const tone = props.tone ?? "default";

    return (
        <div
            className={cn(
                "rounded-2xl p-4 ring-1",
                tone === "danger" ? "bg-red-500/10 ring-red-500/20" : "bg-black/30 ring-white/10",
                props.faded ? "opacity-45" : null
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="text-base" aria-hidden>
                            {props.emoji}
                        </div>
                        <div className="rpg-text-sm font-semibold text-white/90">{props.title}</div>
                    </div>

                    {props.description ? (
                        <div className="mt-1 rpg-text-sm text-white/60">{props.description}</div>
                    ) : null}

                    {props.value ? (
                        <div className="mt-2 text-xs text-white/55">
                            Valeur:{" "}
                            <span className="text-white/80 font-semibold">{props.value}</span>
                        </div>
                    ) : null}
                </div>

                {props.right ? <div className="shrink-0">{props.right}</div> : null}
            </div>
        </div>
    );
}

function ThemeSwitchRow() {
    const theme = useUiSettingsStore((s) => s.theme);
    const setTheme = useUiSettingsStore((s) => s.setTheme);

    const THEMES = [
        {
            key: "classic" as const,
            label: "Classic",
            emoji: "📜",
            description: "Grimoire feutré, parchemins et or patiné. L’ADN originel de Renaissance.",
        },
        {
            key: "cyber-ritual" as const,
            label: "Cyber Ritual",
            emoji: "🟦",
            description:
                "Néons occultes, glyphes digitaux et rituels synthétiques. Le futur ésotérique.",
        },
        {
            key: "forest-sigil" as const,
            label: "Forest Sigil",
            emoji: "🌲",
            description: "Symboles sylvestres, runes anciennes et souffle de la forêt vivante.",
        },
        {
            key: "ashen-codex" as const,
            label: "Ashen Codex",
            emoji: "🔥",
            description: "Cendres sacrées, pierre noire et savoir gravé dans les ruines du monde.",
        },
    ] satisfies Array<{
        key: string;
        label: string;
        emoji: string;
        description: string;
    }>;

    const current = THEMES.find((t) => t.key === theme) ?? THEMES[0];

    return (
        <SettingRow
            emoji={current.emoji}
            title="Skin UI"
            description={current.description}
            value={current.label}
            right={
                <div className="flex items-center gap-2">
                    {THEMES.map((t) => {
                        const active = theme === t.key;
                        return (
                            <ActionButton
                                key={t.key}
                                variant={active ? "solid" : "soft"}
                                onClick={() => setTheme(t.key)}
                                // title={t.label}
                            >
                                {t.emoji}
                            </ActionButton>
                        );
                    })}
                </div>
            }
        />
    );
}

export default function SettingsPage() {
    // (placeholders)
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [microFeedback, setMicroFeedback] = useState(true);
    const [contrast, setContrast] = useState<"balanced" | "high">("balanced");

    const [aiTone, setAiTone] = useState<"calm" | "coach" | "strict">("calm");
    const [aiVerbosity, setAiVerbosity] = useState<"short" | "normal" | "rich">("normal");
    const [aiAutoBrief, setAiAutoBrief] = useState(true);

    // Accessibilité (store)
    const textSize = useSettingsStore((s) => s.textSize);
    const setTextSize = useSettingsStore((s) => s.setTextSize);

    // ✅ v0.1.1 reduce animations (uiStore)
    const reduceAnimations = useUiStore((s) => s.reduceAnimations);
    const toggleReduceAnimations = useUiStore((s) => s.toggleReduceAnimations);

    // DEV store
    const devEnabled = useDevStore((s) => s.enabled);
    const toggleDev = useDevStore((s) => s.toggleEnabled);

    const logsVerbose = useDevStore((s) => s.logsVerbose);
    const setLogsVerbose = useDevStore((s) => s.setLogsVerbose);

    const overlays = useDevStore((s) => s.overlays);
    const setOverlays = useDevStore((s) => s.setOverlays);

    const apiLatencyMs = useDevStore((s) => s.apiLatencyMs);
    const setApiLatencyMs = useDevStore((s) => s.setApiLatencyMs);

    // ❌ v0.1.1: supprimé
    // const resetDevSettings = useDevStore((s) => s.resetDevSettings);

    const [resetting, setResetting] = useState(false);

    const logout = usePlayerStore((s) => s.logout);

    const toastSuccess = useToastStore((s) => s.success);
    const toastError = useToastStore((s) => s.error);
    const toastInfo = useToastStore((s) => s.info);

    const resetGame = async () => {
        const token = process.env.NEXT_PUBLIC_DEV_RESET_TOKEN ?? "";

        if (!token) {
            toastError("Reset impossible", "NEXT_PUBLIC_DEV_RESET_TOKEN manquant.");
            return;
        }

        setResetting(true);
        toastInfo("Reset en cours…", "On efface les traces du royaume 🧹");

        try {
            const res = await fetch("/api/dev/reset", {
                method: "POST",
                headers: { "x-dev-reset-token": token },
            });

            const json = await res.json().catch(() => null);

            if (!res.ok) {
                toastError("Reset échoué", json?.error ?? "unknown error");
                return;
            }

            toastSuccess("Reset OK ✅", "Tout est remis à zéro. Déconnexion…");
            await logout();
            return;
        } catch (e) {
            console.error(e);
            toastError("Reset échoué", "Erreur réseau ou serveur.");
        } finally {
            setResetting(false);
        }
    };

    const devActions = useMemo(() => {
        return [
            {
                key: "seed",
                emoji: "🌱",
                title: "Seed de démo",
                description: "Recrée une aventure + pièces + backlog (pour tests rapides).",
                value: "Placeholder",
                action: () => alert("TODO: seed demo"),
                cta: "🌱 Seed",
            },
            {
                key: "snap",
                emoji: "📸",
                title: "Snapshot UI",
                description: "Capture/trace l’état UI pour débugger plus tard.",
                value: "Placeholder",
                action: () => alert("TODO: snapshot"),
                cta: "📸 Capturer",
            },
        ];
    }, []);

    // Panels “à venir” = moins visibles
    const fadedPanel = "opacity-45";

    return (
        <RpgShell
            title="Réglages"
            subtitle="Ambiance, accessibilité, préférences du Maître du Jeu, et outils DEV."
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>⌨️ S</Pill>
                    <Pill>⚙️ Settings</Pill>
                    <Pill>🧪 Dev</Pill>
                </div>
            }
        >
            <div className="grid gap-4 lg:grid-cols-2">
                {/* ✅ INTERFACE (bien visible) */}
                <Panel title="Interface" emoji="🖼️" subtitle="Look & feel de Renaissance.">
                    <div className="grid gap-2">
                        <ThemeSwitchRow />

                        <SettingRow
                            emoji="🌀"
                            title="Réduire les animations"
                            description="Désactive les transitions Framer Motion (utile en dev / perf)."
                            value={reduceAnimations ? "Oui" : "Non"}
                            right={
                                <ActionButton variant="soft" onClick={toggleReduceAnimations}>
                                    {reduceAnimations ? "✅ On" : "🌀 Off"}
                                </ActionButton>
                            }
                        />

                        <SettingRow
                            emoji="🧼"
                            title="Nettoyer l’interface"
                            description="Plus tard: masquer labels DEV, hints, badges."
                            value="À venir"
                            right={<Pill>à venir</Pill>}
                            faded
                        />
                    </div>
                </Panel>

                {/* ✅ ACCESSIBILITÉ (bien visible car Taille du texte) */}
                <Panel title="Accessibilité" emoji="🧑‍🦯" subtitle="Lisibilité et confort.">
                    <div className="grid gap-2">
                        <SettingRow
                            emoji="🔎"
                            title="Taille du texte"
                            description="Ajuste la taille globale (UI + briefs)."
                            value={
                                textSize === "sm"
                                    ? "Petit"
                                    : textSize === "md"
                                      ? "Standard"
                                      : textSize === "lg"
                                        ? "Grand"
                                        : "Très grand"
                            }
                            right={
                                <div className="flex items-center gap-2">
                                    <ActionButton
                                        variant={textSize === "sm" ? "solid" : "soft"}
                                        onClick={() => setTextSize("sm")}
                                    >
                                        A-
                                    </ActionButton>
                                    <ActionButton
                                        variant={textSize === "md" ? "solid" : "soft"}
                                        onClick={() => setTextSize("md")}
                                    >
                                        A
                                    </ActionButton>
                                    <ActionButton
                                        variant={textSize === "lg" ? "solid" : "soft"}
                                        onClick={() => setTextSize("lg")}
                                    >
                                        A+
                                    </ActionButton>
                                    <ActionButton
                                        variant={textSize === "xl" ? "solid" : "soft"}
                                        onClick={() => setTextSize("xl")}
                                    >
                                        A++
                                    </ActionButton>
                                </div>
                            }
                        />

                        <SettingRow
                            emoji="🌓"
                            title="Contraste"
                            description="High: plus lisible. Balanced: plus doux."
                            value={contrast === "high" ? "Élevé" : "Équilibré"}
                            right={
                                <ActionButton
                                    variant="soft"
                                    onClick={() =>
                                        setContrast((v) => (v === "high" ? "balanced" : "high"))
                                    }
                                >
                                    {contrast === "high" ? "🌓 Balanced" : "🌗 High"}
                                </ActionButton>
                            }
                            faded
                        />

                        <SettingRow
                            emoji="🎯"
                            title="Focus visible"
                            description="Plus tard: anneau de focus renforcé pour navigation clavier."
                            value="À venir"
                            right={<Pill>à venir</Pill>}
                            faded
                        />
                    </div>
                </Panel>

                {/* 🔻 AMBIANCE (moins visible) */}
                <Panel
                    title="Ambiance"
                    emoji="🎧"
                    subtitle="Sons, feedback, atmosphère."
                    right={
                        <ActionButton onClick={() => alert("TODO: play UI sound")} variant="solid">
                            🔊 Tester
                        </ActionButton>
                    }
                >
                    <div className={cn("grid gap-2", fadedPanel)}>
                        <SettingRow
                            emoji={audioEnabled ? "🔊" : "🔇"}
                            title="Son"
                            description="Activer/désactiver les sons d’interface et l’ambiance."
                            value={audioEnabled ? "Activé" : "Désactivé"}
                            right={
                                <ActionButton
                                    variant="soft"
                                    onClick={() => setAudioEnabled((v) => !v)}
                                >
                                    {audioEnabled ? "🔇 Couper" : "🔊 Activer"}
                                </ActionButton>
                            }
                        />

                        <SettingRow
                            emoji="✨"
                            title="Micro-feedback"
                            description="Hover/click/validation: petits signaux qui rendent le jeu “vivant”."
                            value={microFeedback ? "On" : "Off"}
                            right={
                                <ActionButton
                                    variant="soft"
                                    onClick={() => setMicroFeedback((v) => !v)}
                                >
                                    {microFeedback ? "🧊 Calmer" : "✨ Activer"}
                                </ActionButton>
                            }
                        />

                        <SettingRow
                            emoji="🎚️"
                            title="Niveau d’ambiance"
                            description="Plus tard: intensité, musique, ambiance par chapitre."
                            value="À venir"
                            right={<Pill>à venir</Pill>}
                        />
                    </div>
                </Panel>

                {/* 🔻 MAÎTRE DU JEU (moins visible) */}
                <Panel
                    title="Maître du Jeu"
                    emoji="🧙"
                    subtitle="Le ton de l’IA, sa façon de te guider."
                >
                    <div className={cn("grid gap-2", fadedPanel)}>
                        <SettingRow
                            emoji="🗣️"
                            title="Ton du MJ"
                            description="Calme: doux. Coach: motivant. Strict: cadré."
                            value={
                                aiTone === "calm"
                                    ? "Calme"
                                    : aiTone === "coach"
                                      ? "Coach"
                                      : "Strict"
                            }
                            right={
                                <div className="flex items-center gap-2">
                                    <ActionButton
                                        variant={aiTone === "calm" ? "solid" : "soft"}
                                        onClick={() => setAiTone("calm")}
                                    >
                                        🌿
                                    </ActionButton>
                                    <ActionButton
                                        variant={aiTone === "coach" ? "solid" : "soft"}
                                        onClick={() => setAiTone("coach")}
                                    >
                                        🥊
                                    </ActionButton>
                                    <ActionButton
                                        variant={aiTone === "strict" ? "solid" : "soft"}
                                        onClick={() => setAiTone("strict")}
                                    >
                                        📏
                                    </ActionButton>
                                </div>
                            }
                        />

                        <SettingRow
                            emoji="📜"
                            title="Densité des réponses"
                            description="Short: direct. Normal: équilibré. Rich: narratif."
                            value={
                                aiVerbosity === "short"
                                    ? "Short"
                                    : aiVerbosity === "normal"
                                      ? "Normal"
                                      : "Rich"
                            }
                            right={
                                <div className="flex items-center gap-2">
                                    <ActionButton
                                        variant={aiVerbosity === "short" ? "solid" : "soft"}
                                        onClick={() => setAiVerbosity("short")}
                                    >
                                        ⚡
                                    </ActionButton>
                                    <ActionButton
                                        variant={aiVerbosity === "normal" ? "solid" : "soft"}
                                        onClick={() => setAiVerbosity("normal")}
                                    >
                                        🧭
                                    </ActionButton>
                                    <ActionButton
                                        variant={aiVerbosity === "rich" ? "solid" : "soft"}
                                        onClick={() => setAiVerbosity("rich")}
                                    >
                                        ✒️
                                    </ActionButton>
                                </div>
                            }
                        />

                        <SettingRow
                            emoji="🪧"
                            title="Brief automatique des missions"
                            description="Génère automatiquement l’ordre de mission à la création."
                            value={aiAutoBrief ? "Activé" : "Désactivé"}
                            right={
                                <ActionButton
                                    variant="soft"
                                    onClick={() => setAiAutoBrief((v) => !v)}
                                >
                                    {aiAutoBrief ? "✅ On" : "🪧 Off"}
                                </ActionButton>
                            }
                        />
                    </div>
                </Panel>

                {/* 🔻 CLAVIER (moins visible) */}
                <Panel title="Clavier" emoji="⌨️" subtitle="Raccourcis et navigation.">
                    <div className={cn("grid gap-2", fadedPanel)}>
                        <SettingRow
                            emoji="🧭"
                            title="Navigation clavier"
                            description="⬆️⬇️ pour naviguer, ⏎ pour valider, Esc pour fermer."
                            value="Actif (placeholder)"
                            right={<Pill>OK</Pill>}
                        />

                        <SettingRow
                            emoji="⌘K"
                            title="Command Palette"
                            description="Plus tard: commandes globales (Go to, actions, debug)."
                            value="À venir"
                            right={<Pill>à venir</Pill>}
                        />

                        <SettingRow
                            emoji="🧩"
                            title="Remap touches"
                            description="Plus tard: personnaliser H/J/K/L, Enter, etc."
                            value="À venir"
                            right={<Pill>à venir</Pill>}
                        />
                    </div>
                </Panel>

                {/* 🔻 DONNÉES (moins visible) */}
                <Panel title="Données" emoji="🗄️" subtitle="Sauvegarde et confidentialité.">
                    <div className={cn("grid gap-2", fadedPanel)}>
                        <SettingRow
                            emoji="☁️"
                            title="Synchronisation"
                            description="Plus tard: auto-sync Supabase, offline-first."
                            value="À venir"
                            right={<Pill>à venir</Pill>}
                        />

                        <SettingRow
                            emoji="🧾"
                            title="Exporter"
                            description="Export JSON du journal, quêtes, chapitres (pour backup)."
                            value="À venir"
                            right={
                                <ActionButton variant="soft" onClick={() => alert("TODO: export")}>
                                    📤 Export
                                </ActionButton>
                            }
                        />

                        <SettingRow
                            emoji="🧽"
                            title="Effacer cache local"
                            description="LocalStorage / IndexedDB (si utilisé plus tard)."
                            value="À venir"
                            right={
                                <ActionButton
                                    variant="soft"
                                    onClick={() => alert("TODO: clear cache")}
                                >
                                    🧽 Nettoyer
                                </ActionButton>
                            }
                        />
                    </div>
                </Panel>

                {/* ✅ DEV (bien visible car Overlays + Danger Zone) */}
                <Panel
                    title="Développement"
                    emoji="🧪"
                    subtitle="Outils temporaires pour itérer vite."
                    right={
                        <div className="flex items-center gap-2">
                            <Pill>{devEnabled ? "🧪 DEV ON" : "🧪 DEV OFF"}</Pill>
                            <ActionButton variant="solid" onClick={toggleDev}>
                                {devEnabled ? "✅ Activé" : "⛔ Désactivé"}
                            </ActionButton>
                        </div>
                    }
                >
                    <div className="grid gap-2">
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="rpg-text-sm font-semibold text-white/85">
                                        🪵 Logs détaillés
                                    </div>
                                    <div className="mt-1 rpg-text-sm text-white/60">
                                        Afficher logs UI + requêtes réseau.
                                    </div>
                                    <div className="mt-2 text-xs text-white/50">
                                        Valeur:{" "}
                                        <span className="text-white/70">
                                            {logsVerbose ? "On" : "Off"}
                                        </span>
                                    </div>
                                </div>
                                <ActionButton
                                    variant="soft"
                                    disabled={!devEnabled}
                                    onClick={() => setLogsVerbose(!logsVerbose)}
                                >
                                    {logsVerbose ? "🟢 On" : "⚫ Off"}
                                </ActionButton>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="rpg-text-sm font-semibold text-white/85">
                                        🦖 Simuler latence API
                                    </div>
                                    <div className="mt-1 rpg-text-sm text-white/60">
                                        Pour tester loaders, états vides, et transitions.
                                    </div>
                                    <div className="mt-2 text-xs text-white/50">
                                        Valeur:{" "}
                                        <span className="text-white/70">
                                            {apiLatencyMs === 0 ? "Off" : `${apiLatencyMs}ms`}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <ActionButton
                                        variant="soft"
                                        disabled={!devEnabled}
                                        onClick={() =>
                                            setApiLatencyMs(apiLatencyMs === 0 ? 250 : 0)
                                        }
                                    >
                                        {apiLatencyMs === 0 ? "⚫ Off" : "⚡ On"}
                                    </ActionButton>
                                    <ActionButton
                                        variant="soft"
                                        disabled={!devEnabled}
                                        onClick={() => setApiLatencyMs(250)}
                                    >
                                        250
                                    </ActionButton>
                                    <ActionButton
                                        variant="soft"
                                        disabled={!devEnabled}
                                        onClick={() => setApiLatencyMs(750)}
                                    >
                                        750
                                    </ActionButton>
                                </div>
                            </div>
                        </div>

                        {/* ✅ Overlays DEV (bien visible) */}
                        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="rpg-text-sm font-semibold text-white/85">
                                        🧷 Overlays DEV
                                    </div>
                                    <div className="mt-1 rpg-text-sm text-white/60">
                                        Afficher ids, room_code, états, etc.
                                    </div>
                                    <div className="mt-2 text-xs text-white/50">
                                        Valeur:{" "}
                                        <span className="text-white/70">
                                            {overlays ? "On" : "Off"}
                                        </span>
                                    </div>
                                </div>
                                <ActionButton
                                    variant="soft"
                                    disabled={!devEnabled}
                                    onClick={() => setOverlays(!overlays)}
                                >
                                    {overlays ? "🟢 On" : "⚫ Off"}
                                </ActionButton>
                            </div>
                        </div>

                        <div className="mt-2 grid gap-2 opacity-45">
                            {devActions.map((a) => (
                                <SettingRow
                                    key={a.key}
                                    emoji={a.emoji}
                                    title={a.title}
                                    description={a.description}
                                    value={a.value}
                                    right={
                                        <ActionButton variant="soft" onClick={a.action}>
                                            {a.cta}
                                        </ActionButton>
                                    }
                                />
                            ))}
                        </div>

                        {/* ✅ Danger Zone (bien visible) */}
                        <div className="rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-500/20">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="rpg-text-sm font-semibold text-white/85">
                                        ☠️ Danger zone
                                    </div>
                                    <div className="mt-1 rpg-text-sm text-white/60">
                                        Actions destructives. Uniquement en DEV.
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {/* ❌ v0.1.1: supprimé */}
                                    {/* <ActionButton variant="soft" disabled={!devEnabled} onClick={resetDevSettings}>
                                        🧽 Reset DEV settings
                                    </ActionButton> */}

                                    <ActionButton
                                        variant="solid"
                                        disabled={!devEnabled || resetting}
                                        onClick={() => void resetGame()}
                                    >
                                        {resetting ? "⏳ Reset…" : "💥 Reset (DEV)"}
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>
        </RpgShell>
    );
}
