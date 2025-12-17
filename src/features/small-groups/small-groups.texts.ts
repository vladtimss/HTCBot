/**
 * features/small-groups/small-groups.texts.ts
 * --------------------------
 * Тексты для раздела "Малые группы"
 */

import { fmt, bold } from "@grammyjs/parse-mode";
import { COMMON } from "../../services/texts";

export const SMALL_GROUPS_TEXTS = {
	title: "Раздел: Малые группы",
	descriptionForMembers: fmt`Здесь вы можете:

• 📅 Посмотреть группы по дням недели
• 📍 Найти группу рядом с вами (по району)
• ⏱️ Узнать ближайшую встречу ЛМГ
• 🗓️ Посмотреть все будущие встречи ЛМГ`,
	descriptionForOther: fmt`Здесь вы можете:

• 📅 Посмотреть группы по дням недели
• 📍 Найти группу рядом с вами (по району)`,

	// Промпты
	chooseDay: fmt`Выберите день:`,
	chooseDistrict: fmt`Выберите район:`,

	// Fallback-сообщения
	noNextLmg: fmt`😔 Ближайших встреч ЛМГ в этом сезоне не найдено.`,
	noFutureLmg: fmt`😔 В этом сезоне встреч ЛМГ больше нет.`,

	// Списки
	lmgSeasonList: fmt`📖 ${bold()}Список встреч ЛМГ до конца сезона:${bold()}`,
	lmgNotesIntro: fmt`Здесь вы можете найти полезные материалы для лидеров малых групп, а также найти конспекты для проведения МГ.

${COMMON.useButtonBelow}`,
};
