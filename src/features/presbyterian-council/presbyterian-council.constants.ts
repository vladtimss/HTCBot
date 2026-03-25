/**
 * features/presbyterian-council/presbyterian-council.constants.ts
 * --------------------------
 * Константы кнопок раздела "Пресвитерский совет"
 */

export const PRESBYTERIAN_COUNCIL_BUTTON_LABELS = {
	/** Подраздел "Повестка на совет" */
	PC_AGENDA: "📋 Повестка на совет",
	/** Ближайшая повестка */
	PC_AGENDA_NEXT: "📅 Ближайшая повестка",
} as const;

/** ID базы данных повестки пресвитерского совета в Buildin */
export const PC_AGENDA_DATABASE_ID = "43cbf7d2-b859-4314-8e19-7c391406fa7f";

/** Названия событий пасторского календаря, которые относятся к повестке совета */
export const PC_CALENDAR_EVENT_TITLES = [
	"Пресвитерский | ЦСТ",
	"Пасторский совет | ЦСТ",
] as const;

/** Статус вопроса, который попадает в повестку */
export const PC_AGENDA_STATUS = "На повестку";
