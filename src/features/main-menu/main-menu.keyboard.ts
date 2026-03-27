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
 * - «Церковь Святой Троицы» — только isPrivileged (пасторы продублированы в AUTHORIZED).
 * Пресвитерский совет — только внутри раздела «Церковь», см. holy-trinity-church.keyboard.
 */
export function replyMainKeyboard(ctx: MyContext) {
	const kb = new Keyboard();

	if (ctx.access.isPrivileged) {
		kb.text(MENU_LABELS.MAIN_HOLY_TRINITY_CHURCH).row(); // ⛪ Церковь Святой Троицы — первая строка на всю ширину
	}

	kb.text(MENU_LABELS.MAIN_SUNDAY) // ⛪ Воскресное богослужение
		.text(MENU_LABELS.MAIN_SERMONS) // 🎙️ Проповеди
		.row()
		.text(MENU_LABELS.MAIN_GROUPS) // 👥 Малые группы
		.text(MENU_LABELS.MAIN_ABOUT); // ℹ️ О нас

	kb.resized().persistent();
	return kb;
}
