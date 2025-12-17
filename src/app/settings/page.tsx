"use client";

import React, { useMemo, useState } from "react";
import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

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
}) {
    const tone = props.tone ?? "default";

    return (
        <div
            className={cn(
                "rounded-2xl p-4 ring-1",
                tone === "danger" ? "bg-red-500/10 ring-red-500/20" : "bg-black/30 ring-white/10"
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="text-base" aria-hidden>
                            {props.emoji}
                        </div>
                        <div className="text-sm font-semibold text-white/90">{props.title}</div>
                    </div>

                    {props.description ? (
                        <div className="mt-1 text-sm text-white/60">{props.description}</div>
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

export default function SettingsPage() {
    // UI placeholders (on branchera ensuite à localStorage / DB / profile)
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [microFeedback, setMicroFeedback] = useState(true);
    const [uiMode, setUiMode] = useState<"cinematic" | "minimal">("cinematic");
    const [textSize, setTextSize] = useState<"sm" | "md" | "lg">("md");
    const [contrast, setContrast] = useState<"balanced" | "high">("balanced");
    const [reduceMotion, setReduceMotion] = useState(false);

    const [aiTone, setAiTone] = useState<"calm" | "coach" | "strict">("calm");
    const [aiVerbosity, setAiVerbosity] = useState<"short" | "normal" | "rich">("normal");
    const [aiAutoBrief, setAiAutoBrief] = useState(true);

    const [devLogs, setDevLogs] = useState(false);
    const [devLatency, setDevLatency] = useState<"off" | "250" | "750">("off");
    const [devOverlays, setDevOverlays] = useState(false);

    const resetGame = async () => {
        const token = process.env.NEXT_PUBLIC_DEV_RESET_TOKEN ?? "";

        const res = await fetch("/api/dev/reset", {
            method: "POST",
            headers: {
                "x-dev-reset-token": token,
            },
        });

        const json = await res.json();

        if (!res.ok) {
            console.error(json?.error ?? "Reset failed");
            alert(`Reset échoué: ${json?.error ?? "unknown error"}`);
            return;
        }

        alert("✅ Reset OK. Tout est remis à zéro.");
        window.location.href = "/";
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
                {/* AMBIANCE */}
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
                    <div className="grid gap-2">
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
                            value="Placeholder"
                            right={<Pill>à venir</Pill>}
                        />
                    </div>
                </Panel>

                {/* INTERFACE */}
                <Panel title="Interface" emoji="🖼️" subtitle="Look & feel de Renaissance.">
                    <div className="grid gap-2">
                        <SettingRow
                            emoji="🌌"
                            title="Style"
                            description="Cinematic: plus de matière. Minimal: plus d’efficacité."
                            value={uiMode === "cinematic" ? "Cinematic" : "Minimal"}
                            right={
                                <div className="flex items-center gap-2">
                                    <ActionButton
                                        variant={uiMode === "cinematic" ? "solid" : "soft"}
                                        onClick={() => setUiMode("cinematic")}
                                    >
                                        🌌
                                    </ActionButton>
                                    <ActionButton
                                        variant={uiMode === "minimal" ? "solid" : "soft"}
                                        onClick={() => setUiMode("minimal")}
                                    >
                                        🧾
                                    </ActionButton>
                                </div>
                            }
                        />

                        <SettingRow
                            emoji="🌀"
                            title="Réduire les animations"
                            description="Utile sur machines modestes, ou en phase dev."
                            value={reduceMotion ? "Oui" : "Non"}
                            right={
                                <ActionButton
                                    variant="soft"
                                    onClick={() => setReduceMotion((v) => !v)}
                                >
                                    {reduceMotion ? "✅ On" : "🌀 Off"}
                                </ActionButton>
                            }
                        />

                        <SettingRow
                            emoji="🧼"
                            title="Nettoyer l’interface"
                            description="Plus tard: masquer labels DEV, hints, badges."
                            value="Placeholder"
                            right={<Pill>à venir</Pill>}
                        />
                    </div>
                </Panel>

                {/* MAÎTRE DU JEU (IA) */}
                <Panel
                    title="Maître du Jeu"
                    emoji="🧙"
                    subtitle="Le ton de l’IA, sa façon de te guider."
                >
                    <div className="grid gap-2">
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

                {/* ACCESSIBILITÉ */}
                <Panel title="Accessibilité" emoji="🧑‍🦯" subtitle="Lisibilité et confort.">
                    <div className="grid gap-2">
                        <SettingRow
                            emoji="🔎"
                            title="Taille du texte"
                            description="Plus tard: impact global UI + briefs."
                            value={
                                textSize === "sm"
                                    ? "Petit"
                                    : textSize === "md"
                                      ? "Standard"
                                      : "Grand"
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
                        />

                        <SettingRow
                            emoji="🎯"
                            title="Focus visible"
                            description="Plus tard: anneau de focus renforcé pour navigation clavier."
                            value="Placeholder"
                            right={<Pill>à venir</Pill>}
                        />
                    </div>
                </Panel>

                {/* CLAVIER */}
                <Panel title="Clavier" emoji="⌨️" subtitle="Raccourcis et navigation.">
                    <div className="grid gap-2">
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
                            value="Placeholder"
                            right={<Pill>à venir</Pill>}
                        />

                        <SettingRow
                            emoji="🧩"
                            title="Remap touches"
                            description="Plus tard: personnaliser H/J/K/L, Enter, etc."
                            value="Placeholder"
                            right={<Pill>à venir</Pill>}
                        />
                    </div>
                </Panel>

                {/* DONNÉES */}
                <Panel title="Données" emoji="🗄️" subtitle="Sauvegarde et confidentialité.">
                    <div className="grid gap-2">
                        <SettingRow
                            emoji="☁️"
                            title="Synchronisation"
                            description="Plus tard: auto-sync Supabase, offline-first."
                            value="Placeholder"
                            right={<Pill>à venir</Pill>}
                        />

                        <SettingRow
                            emoji="🧾"
                            title="Exporter"
                            description="Export JSON du journal, quêtes, chapitres (pour backup)."
                            value="Placeholder"
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
                            value="Placeholder"
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

                {/* DEV */}
                <Panel
                    title="Développement"
                    emoji="🧪"
                    subtitle="Outils temporaires pour itérer vite."
                    right={
                        <ActionButton variant="solid" onClick={() => void resetGame()}>
                            💥 Reset (DEV)
                        </ActionButton>
                    }
                >
                    <div className="grid gap-2">
                        <SettingRow
                            emoji="🪵"
                            title="Logs détaillés"
                            description="Plus tard: afficher logs UI + requêtes réseau."
                            value={devLogs ? "On" : "Off"}
                            right={
                                <ActionButton variant="soft" onClick={() => setDevLogs((v) => !v)}>
                                    {devLogs ? "✅ On" : "🪵 Off"}
                                </ActionButton>
                            }
                        />

                        <SettingRow
                            emoji="🐢"
                            title="Simuler latence API"
                            description="Pour tester les loaders et états vides."
                            value={devLatency === "off" ? "Off" : `${devLatency}ms`}
                            right={
                                <div className="flex items-center gap-2">
                                    <ActionButton
                                        variant={devLatency === "off" ? "solid" : "soft"}
                                        onClick={() => setDevLatency("off")}
                                    >
                                        ⚡
                                    </ActionButton>
                                    <ActionButton
                                        variant={devLatency === "250" ? "solid" : "soft"}
                                        onClick={() => setDevLatency("250")}
                                    >
                                        250
                                    </ActionButton>
                                    <ActionButton
                                        variant={devLatency === "750" ? "solid" : "soft"}
                                        onClick={() => setDevLatency("750")}
                                    >
                                        750
                                    </ActionButton>
                                </div>
                            }
                        />

                        <SettingRow
                            emoji="🧭"
                            title="Overlays DEV"
                            description="Plus tard: afficher id, room_code, états, etc."
                            value={devOverlays ? "On" : "Off"}
                            right={
                                <ActionButton
                                    variant="soft"
                                    onClick={() => setDevOverlays((v) => !v)}
                                >
                                    {devOverlays ? "✅ On" : "🧭 Off"}
                                </ActionButton>
                            }
                        />

                        <div className="mt-2 grid gap-2">
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

                        <SettingRow
                            tone="danger"
                            emoji="☠️"
                            title="Danger zone"
                            description="Actions destructives. À utiliser uniquement en DEV."
                            value="—"
                            right={
                                <ActionButton variant="solid" onClick={() => void resetGame()}>
                                    💥 Reset total
                                </ActionButton>
                            }
                        />
                    </div>
                </Panel>
            </div>
        </RpgShell>
    );
}
