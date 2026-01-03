import { QuestPriorityPill, QuestPriorityChip } from "./questPriority";
import { QuestDifficultyPill, QuestDifficultyChip } from "./questDifficulty";
import { QuestRoomPill, QuestRoomChip } from "./questRoom";

const Helpers = {
    Pill: {
        priority: QuestPriorityPill,
        difficulty: QuestDifficultyPill,
        room: QuestRoomPill,
    },
    Chip: {
        priority: QuestPriorityChip,
        difficulty: QuestDifficultyChip,
        room: QuestRoomChip,
    },
};

export default Helpers;
