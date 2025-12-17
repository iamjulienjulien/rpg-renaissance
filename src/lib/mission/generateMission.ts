import { supabaseServer } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

export type MissionCacheRow = {
    chapter_quest_id: string;
    mission_json: any;
    mission_md: string;
    model: string;
    updated_at: string;
};

export async function generateMissionForChapterQuest(
    chapterQuestId: string,
    force: boolean = false
) {
    const supabase = supabaseServer();

    // 1) Cache (si pas force)
    if (!force) {
        const { data: existing } = await supabase
            .from("quest_mission_orders")
            .select("chapter_quest_id, mission_json, mission_md, model, updated_at")
            .eq("chapter_quest_id", chapterQuestId)
            .maybeSingle();

        if (existing) return { mission: existing as MissionCacheRow, cached: true };
    }

    // 2) Charger la quête (titre, room_code, etc.)
    const { data: cq, error: cqErr } = await supabase
        .from("chapter_quests")
        .select(
            `
            id,
            status,
            adventure_quests!chapter_quests_adventure_quest_id_fkey (
                title,
                description,
                room_code,
                difficulty,
                estimate_min
            )
        `
        )
        .eq("id", chapterQuestId)
        .maybeSingle();

    if (cqErr) throw new Error(cqErr.message);
    if (!cq || !cq.adventure_quests) throw new Error("Quest not found");

    const q = Array.isArray(cq.adventure_quests) ? cq.adventure_quests[0] : cq.adventure_quests;

    const context = {
        title: q.title,
        description: q.description ?? "",
        room_code: q.room_code ?? "",
        difficulty: q.difficulty ?? 2,
        estimate_min: q.estimate_min ?? null,
        status: cq.status,
    };

    // 3) Génération OpenAI
    const model = "gpt-4.1";

    const response = await openai.responses.create({
        model,
        input: [
            {
                role: "system",
                content: [
                    {
                        type: "input_text",
                        text: "Tu es le Maître du Jeu de Renaissance. Tu produis un ordre de mission court, motivant, très concret, style RPG, emojis sobres. Pas de blabla.",
                    },
                ],
            },
            {
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text:
                            `Contexte quête:\n${JSON.stringify(context, null, 2)}\n\n` +
                            "Génère un ordre de mission structuré + une version markdown prête à afficher.",
                    },
                ],
            },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "mission_order",
                schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        title: { type: "string" },
                        intro: { type: "string" },
                        objectives: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 3,
                            maxItems: 7,
                        },
                        steps: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 3,
                            maxItems: 9,
                        },
                        success_criteria: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 2,
                            maxItems: 5,
                        },
                        difficulty_note: { type: "string" },
                        estimated_time: { type: "string" },
                    },
                    required: [
                        "title",
                        "intro",
                        "objectives",
                        "steps",
                        "success_criteria",
                        "difficulty_note",
                        "estimated_time",
                    ],
                },
            },
        },
    });

    const missionJson = JSON.parse(response.output_text);

    const md = [
        `## 🧾 Ordre de mission`,
        `### ${missionJson.title}`,
        ``,
        `${missionJson.intro}`,
        ``,
        `**🎯 Objectifs**`,
        ...missionJson.objectives.map((x: string) => `- ${x}`),
        ``,
        `**🪜 Étapes**`,
        ...missionJson.steps.map((x: string, i: number) => `${i + 1}. ${x}`),
        ``,
        `**✅ Réussite si…**`,
        ...missionJson.success_criteria.map((x: string) => `- ${x}`),
        ``,
        `**${missionJson.estimated_time}**`,
        ``,
        `_${missionJson.difficulty_note}_`,
    ].join("\n");

    // 4) Upsert cache
    const { data: saved, error: saveErr } = await supabase
        .from("quest_mission_orders")
        .upsert(
            {
                chapter_quest_id: chapterQuestId,
                mission_json: missionJson,
                mission_md: md,
                model,
            },
            { onConflict: "chapter_quest_id" }
        )
        .select("chapter_quest_id, mission_json, mission_md, model, updated_at")
        .single();

    if (saveErr) throw new Error(saveErr.message);

    return { mission: saved as MissionCacheRow, cached: false };
}
