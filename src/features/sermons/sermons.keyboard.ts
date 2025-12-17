/**
 * features/sermons/sermons.keyboard.ts
 * --------------------------
 * Клавиатуры для раздела "Проповеди"
 */

import { Keyboard } from "grammy";
import { CALENDAR_BUTTON_LABELS } from "../church-calendar/church-calendar.constants"; // SERMONS_PODCASTS находится там
import { NAVIGATION_LABELS } from "../../constants/navigation";

export const replySermonsMenu = new Keyboard()
	.text(CALENDAR_BUTTON_LABELS.SERMONS_PODCASTS)
	.row()
	.text(NAVIGATION_LABELS.NAV_BACK)
	.resized();
