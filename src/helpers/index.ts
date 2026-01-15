import { QuestPriorityPill, QuestPriorityChip } from "./questPriority";
import { QuestDifficultyPill, QuestDifficultyChip } from "./questDifficulty";
import { QuestRoomPill, QuestRoomChip } from "./questRoom";
import { CurrentCharacterChip, CurrentCharacterPill } from "./adventure";
import { ChapterPacePill, ChapterPaceyChip } from "./chapterPace";

const Helpers = {
    Pill: {
        priority: QuestPriorityPill,
        difficulty: QuestDifficultyPill,
        room: QuestRoomPill,
        chapterPace: ChapterPacePill,
    },
    Chip: {
        priority: QuestPriorityChip,
        difficulty: QuestDifficultyChip,
        room: QuestRoomChip,
        chapterPace: ChapterPaceyChip,
    },
    Adventure: {
        Character: {
            Pill: CurrentCharacterPill,
            Chip: CurrentCharacterChip,
        },
    },
};

export default Helpers;
