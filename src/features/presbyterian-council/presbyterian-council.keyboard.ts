/**
 * features/presbyterian-council/presbyterian-council.keyboard.ts
 * --------------------------
 * Клавиатуры раздела "Пресвитерский совет"
 */

import { Keyboard } from "grammy";
import { PRESBYTERIAN_COUNCIL_BUTTON_LABELS } from "./presbyterian-council.constants";
import { NAVIGATION_LABELS } from "../../constants/navigation";

/**
 * Главное меню раздела "Пресвитерский совет"
 * Кнопка «Назад» возвращает в главное меню (menuStack: ["main"] → ["presbyterian-council"])
 */
export const replyPresbyterianCouncilMenu = new Keyboard()
	.text(PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA)
	.row()
	.text(NAVIGATION_LABELS.NAV_BACK)
	.resized()
	.persistent();

/**
 * Меню подраздела "Повестка на совет"
 * Кнопка «Назад» возвращает в корень раздела "Пресвитерский совет"
 */
export const replyPCAgendaMenu = new Keyboard()
	.text(PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA_NEXT)
	.row()
	.text(NAVIGATION_LABELS.NAV_BACK)
	.resized()
	.persistent();
