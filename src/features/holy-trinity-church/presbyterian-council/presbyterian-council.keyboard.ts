/**
 * features/presbyterian-council/presbyterian-council.keyboard.ts
 * --------------------------
 * Reply- и inline-клавиатуры раздела "Пресвитерский совет".
 */

import { InlineKeyboard, Keyboard }                                from "grammy";
import { PRESBYTERIAN_COUNCIL_BUTTON_LABELS }                      from "./presbyterian-council.constants";
import { NAVIGATION_LABELS }                                       from "../../../constants/navigation";
import { PresbyterianCouncilAgendaDateNode, getPCAgendaMonthName } from "./presbyterian-council.state";

/**
 * Главное меню раздела "Пресвитерский совет"
 * Кнопка «Назад» возвращает в раздел «Церковь Святой Троицы» (стек: ["holy-trinity-church", "presbyterian-council"])
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
	.text(PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA_ALL_DATES)
	.row()
	.text(NAVIGATION_LABELS.NAV_BACK)
	.text(NAVIGATION_LABELS.NAV_MAIN)
	.resized()
	.persistent();

/** Inline-список доступных лет с вопросами повестки. */
export function inlinePCAgendaYearsMenu(years: number[]): InlineKeyboard {
	const keyboard = new InlineKeyboard();

	for (let i = 0; i < years.length; i += 3) {
		const row = years.slice(i, i + 3);
		for (const year of row) {
			keyboard.text(String(year), `pc:agenda:dates:year:${year}`);
		}
		keyboard.row();
	}

	return keyboard;
}

/** Inline-список месяцев внутри выбранного года. */
export function inlinePCAgendaMonthsMenu(year: number, months: number[]): InlineKeyboard {
	const keyboard = new InlineKeyboard();

	for (let i = 0; i < months.length; i += 3) {
		const row = months.slice(i, i + 3);
		for (const month of row) {
			keyboard.text(getPCAgendaMonthName(month), `pc:agenda:dates:year:${year}:month:${month}`);
		}
		keyboard.row();
	}

	keyboard.text(NAVIGATION_LABELS.NAV_BACK, "pc:agenda:dates:years");
	return keyboard;
}

/** Inline-список дат внутри выбранного месяца. */
export function inlinePCAgendaDatesMenu(
	year: number,
	dates: PresbyterianCouncilAgendaDateNode[]
): InlineKeyboard {
	const keyboard = new InlineKeyboard();

	for (let i = 0; i < dates.length; i += 2) {
		const row = dates.slice(i, i + 2);
		for (const date of row) {
			keyboard.text(date.buttonLabel, `pc:agenda:dates:date:${date.key}`);
		}
		keyboard.row();
	}

	keyboard.text(NAVIGATION_LABELS.NAV_BACK, `pc:agenda:dates:year:${year}`);
	return keyboard;
}
