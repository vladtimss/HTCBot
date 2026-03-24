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
 */
export const replyPresbyterianCouncilMenu = new Keyboard()
	.text(PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA)
	.row()
	.text(NAVIGATION_LABELS.NAV_MAIN)
	.resized()
	.persistent();

/**
 * Меню подраздела "Повестка на совет"
 */
export const replyPCAgendaMenu = new Keyboard()
	.text(PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA_NEXT)
	.row()
	.text(NAVIGATION_LABELS.NAV_MAIN)
	.resized()
	.persistent();
