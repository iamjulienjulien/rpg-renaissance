import { QuestPriorityPill, QuestPriorityChip } from "./questPriority";
import { QuestDifficultyPill, QuestDifficultyChip } from "./questDifficulty";
import { QuestRoomPill, QuestRoomChip } from "./questRoom";
import { CurrentCharacterChip, CurrentCharacterPill } from "./adventure";

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
    Adventure: {
        Character: {
            Pill: CurrentCharacterPill,
            Chip: CurrentCharacterChip,
        },
    },
};

export default Helpers;
