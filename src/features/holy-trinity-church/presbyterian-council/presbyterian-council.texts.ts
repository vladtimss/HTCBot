/**
 * features/presbyterian-council/presbyterian-council.texts.ts
 * --------------------------
 * Все пользовательские тексты раздела "Пресвитерский совет".
 */

import { fmt, bold } from "@grammyjs/parse-mode";
import { COMMON }    from "../../../services/texts";

export const PRESBYTERIAN_COUNCIL_TEXTS = {
	/** Корень раздела. */
	title: fmt`${bold()}Пресвитерский совет${bold()}${COMMON.useButtonBelow}`,
	/** Корень подраздела "Повестка на совет". */
	agendaTitle: fmt`${bold()}Повестка на совет${bold()}${COMMON.useButtonBelow}`,
	/** Загрузка ближайшей повестки: фаза поиска события в календаре. */
	agendaLoadingCalendar: "Уточняю дату ближайшего совета…",
	/** Загрузка ближайшей повестки: фаза поиска вопросов по найденной дате. */
	agendaLoadingDb: (date: string) => `Уточняю повестку на ${date}…`,
	/** Загрузка дерева "год -> месяц -> дата". */
	agendaDatesLoading: "Загружаю все вопросы по датам…",
	/** Заголовок шага выбора года. */
	agendaDatesChooseYear: fmt`${bold()}Выберите год${bold()}`,
	/** Заголовок шага выбора месяца. */
	agendaDatesChooseMonth: (year: number) => fmt`${bold()}Выберите месяц${bold()}

${year}`,
	/** Заголовок шага выбора конкретной даты. */
	agendaDatesChooseDate: (monthName: string, year: number) => fmt`${bold()}Выберите дату${bold()}

${monthName} ${year}`,
	/** Loader при сборке PDF по выбранной пользователем дате. */
	agendaDatePdfLoading: (date: string) => `Формирую PDF повестки на ${date}…`,
	/** Календарь не вернул ближайшее событие совета. */
	noCouncilEvent: "📭 Ближайшее заседание пресвитерского совета не найдено в календаре.",
	/** Для ближайшего совета нет активных вопросов со статусом "На повестку". */
	noAgendaItems: "📭 В базе нет вопросов повестки на ближайший совет.",
	/** В базе пока нет ни одной записи с датой обсуждения. */
	noAgendaHistory: "📭 В базе пока нет вопросов с датой обсуждения.",
	/** Для выбранного года не найдено ни одного месяца с вопросами. */
	noAgendaDatesForYear: "📭 Для выбранного года даты не найдены.",
	/** Для выбранного месяца не найдено ни одной даты с вопросами. */
	noAgendaDatesForMonth: "📭 Для выбранного месяца даты не найдены.",
	/** Для выбранной пользователем даты не найдено вопросов. */
	noAgendaItemsForDate: (date: string) => `📭 Для даты ${date} вопросы не найдены.`,
};
