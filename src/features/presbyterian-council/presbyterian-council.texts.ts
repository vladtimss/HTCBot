/**
 * features/presbyterian-council/presbyterian-council.texts.ts
 * --------------------------
 * Тексты раздела "Пресвитерский совет"
 */

import { fmt, bold } from "@grammyjs/parse-mode";
import { COMMON } from "../../services/texts";

export const PRESBYTERIAN_COUNCIL_TEXTS = {
	title: fmt`${bold()}Пресвитерский совет${bold()}${COMMON.useButtonBelow}`,
	agendaTitle: fmt`${bold()}Повестка на совет${bold()}${COMMON.useButtonBelow}`,
	agendaLoadingCalendar: "Уточняю дату ближайшего совета…",
	agendaLoadingDb: (date: string) => `Уточняю повестку на ${date}…`,
	noCouncilEvent: "📭 Ближайшее заседание пресвитерского совета не найдено в календаре.",
	noAgendaItems: "📭 В базе нет вопросов повестки на ближайший совет.",
};
