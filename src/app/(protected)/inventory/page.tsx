"use client";

import RpgShell from "@/components/RpgShell";
import { ActionButton, Panel, Pill } from "@/components/RpgUi";

export default function InventoryPage() {
    return (
        <RpgShell
            title="Inventaire"
            subtitle="Ressources, objets symboliques, et petites victoires conservées."
            rightSlot={
                <div className="flex items-center gap-2">
                    <Pill>⌨️ I</Pill>
                    <Pill>🎒 0 objets</Pill>
                </div>
            }
        >
            <div className="grid gap-4 lg:grid-cols-3">
                <Panel
                    title="Reliques"
                    emoji="🏵️"
                    subtitle="Ce que tu gagnes en avançant."
                    right={
                        <ActionButton onClick={() => console.log("🎁 ADD_RELIC")}>
                            🎁 Ajouter
                        </ActionButton>
                    }
                >
                    <div className="rpg-text-sm text-white/70">Vide pour l’instant.</div>
                    <div className="mt-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                        <div className="text-xs text-white/60">💡 Idée</div>
                        <div className="mt-1 rpg-text-sm text-white/70">
                            Une relique peut être symbolique (“Clé du matin”), pas forcément “loot”.
                        </div>
                    </div>
                </Panel>

                <Panel
                    title="Ressources"
                    emoji="🧰"
                    subtitle="Ton carburant: temps, énergie, focus."
                    right={<Pill>0</Pill>}
                >
                    <div className="grid gap-2">
                        {["⏳ Temps", "🧠 Focus", "💤 Repos"].map((t) => (
                            <div
                                key={t}
                                className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10"
                            >
                                <div className="text-xs text-white/60">{t}</div>
                                <div className="mt-1 text-white/80">Non suivi</div>
                            </div>
                        ))}
                    </div>
                </Panel>

                <Panel
                    title="Outils"
                    emoji="🔧"
                    subtitle="Raccourcis et artefacts utiles."
                    right={
                        <ActionButton onClick={() => console.log("➕ ADD_TOOL")} variant="solid">
                            ➕ Ajouter
                        </ActionButton>
                    }
                >
                    <div className="rpg-text-sm text-white/70">Aucun outil enregistré.</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Pill>🗺️ Carte</Pill>
                        <Pill>🎧 Playlist</Pill>
                        <Pill>📝 Notes</Pill>
                    </div>
                </Panel>
            </div>
        </RpgShell>
    );
}
