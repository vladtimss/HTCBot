/**
 * features/small-groups/small-groups.keyboard.ts
 * --------------------------
 * Клавиатуры для раздела "Малые группы"
 */

import { InlineKeyboard, Keyboard } from "grammy";
import { SMALL_GROUPS_BUTTON_LABELS } from "./small-groups.constants";
import { NAVIGATION_LABELS } from "../../constants/navigation";
import { MyContext } from "../../types/grammy-context";
import { WEEKDAYS_PRESENT, WEEKDAY_TITLE, DISTRICTS, DISTRICT_MAP } from "../../data/small-groups";

/**
 * Клавиатура для раздела малых групп
 */
export function replyGroupsMenu(ctx: MyContext) {
	const kb = new Keyboard();

	if (ctx.access.isPrivileged && ctx.access.isLmgLeader) {
		kb.text(SMALL_GROUPS_BUTTON_LABELS.LMG_NOTES).row(); // 📝 Конспекты ЛМГ — первая строка на всю ширину
	}

	kb.text(SMALL_GROUPS_BUTTON_LABELS.LMG_GROUPS_BY_DAY) // 📅 По дням
		.text(SMALL_GROUPS_BUTTON_LABELS.LMG_GROUPS_BY_DISTRICT) // 📍 По районам
		.row();

	if (ctx.access.isPrivileged) {
		kb.text(SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_NEXT) // ⏱️ Следующая встреча ЛМГ
			.text(SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_ALL) // 🗓️ Все встречи ЛМГ
			.row();

		kb.text(SMALL_GROUPS_BUTTON_LABELS.LMG_CAL_TRIP) // 🚌 Выезд ЛМГ
			.row();
	}

	kb.text(NAVIGATION_LABELS.NAV_BACK).resized();
	return kb;
}

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

/**
 * Inline-меню для выезда ЛМГ
 */
export const inlineLmgTrip = new InlineKeyboard().text("📅 Даты выезда", "lmg_trip_dates");

/**
 * Генерация inline-клавиатуры для выбора дня недели
 */
export function makeWeekdaysKeyboard() {
	const kb = new InlineKeyboard();
	WEEKDAYS_PRESENT.forEach((d) => kb.text(WEEKDAY_TITLE[d], `groups:day:${d}`).row());
	return kb;
}

/**
 * Генерация inline-клавиатуры для выбора района
 */
export function makeDistrictsKeyboard() {
	const kb = new InlineKeyboard();
	DISTRICTS.forEach((districtKey) => {
		const districtName = DISTRICT_MAP[districtKey] ?? districtKey;
		kb.text(districtName, `groups:district:${districtKey}`).row();
	});
	return kb;
}
