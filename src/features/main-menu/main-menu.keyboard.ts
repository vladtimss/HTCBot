/**
 * features/main-menu/main-menu.keyboard.ts
 * --------------------------
 * Клавиатуры для главного меню
 */

import { Keyboard } from "grammy";
import { MENU_LABELS } from "../../constants/button-lables"; // Глобальные константы главного меню
import { MyContext } from "../../types/grammy-context";

/**
 * Главное меню зависит от прав:
 * - у привилегированных пользователей есть кнопка "Церковный календарь"
 */
export function replyMainKeyboard(ctx: MyContext) {
	const kb = new Keyboard()
		.text(MENU_LABELS.MAIN_SUNDAY) // ⛪ Воскресное богослужение
		.text(MENU_LABELS.MAIN_SERMONS) // 🎧 Проповеди
		.row()
		.text(MENU_LABELS.MAIN_GROUPS); // 👥 Малые группы

	if (ctx.access.isPrivileged) {
		kb.text(MENU_LABELS.MAIN_CALENDAR); // 📅 Церковный календарь
	}

	kb.row().text(MENU_LABELS.MAIN_ABOUT).resized().persistent();
	return kb;
}
