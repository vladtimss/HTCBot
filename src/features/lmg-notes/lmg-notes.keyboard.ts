/**
 * features/lmg-notes/lmg-notes.keyboard.ts
 * --------------------------
 * Клавиатуры для раздела "Конспекты ЛМГ"
 */

import { Keyboard } from "grammy";
import { SMALL_GROUPS_BUTTON_LABELS } from "../small-groups/small-groups.constants";
import { NAVIGATION_LABELS } from "../../constants/navigation";

/**
 * Клавиатура для раздела "Конспекты ЛМГ"
 */
export function replyLmgNotesMenu() {
	return new Keyboard()
		.text(SMALL_GROUPS_BUTTON_LABELS.LMG_NOTES_PREV)
		.row()
		.text(NAVIGATION_LABELS.NAV_BACK)
		.resized();
}
