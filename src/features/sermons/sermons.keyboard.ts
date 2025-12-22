/**
 * features/sermons/sermons.keyboard.ts
 * --------------------------
 * Клавиатуры для раздела "Проповеди"
 */

import { Keyboard } from "grammy";
import { SERMONS_BUTTON_LABELS } from "./sermons.constants";
import { NAVIGATION_LABELS } from "../../constants/navigation";

export const replySermonsMenu = new Keyboard()
	.text(SERMONS_BUTTON_LABELS.SERMONS_PODCASTS)
	.row()
	.text(NAVIGATION_LABELS.NAV_BACK)
	.resized();
