/**
 * features/small-groups/small-groups.texts.ts
 * --------------------------
 * Тексты для раздела "Малые группы"
 */

import { fmt, bold } from "@grammyjs/parse-mode";
import { COMMON } from "../../services/texts";

// ============================================================================
// Block тексты (большие многострочные)
// ============================================================================

const smallGroupsTextsDescriptionForMembers = fmt`Здесь вы можете:

• 📅 Посмотреть группы по дням недели
• 📍 Найти группу рядом с вами (по району)
• ⏱️ Узнать ближайшую встречу ЛМГ
• 🗓️ Посмотреть все будущие встречи ЛМГ`;

const smallGroupsTextsDescriptionForOther = fmt`Здесь вы можете:

• 📅 Посмотреть группы по дням недели
• 📍 Найти группу рядом с вами (по району)`;

const smallGroupsTextsLmgNotesIntro = fmt`Здесь вы можете найти полезные материалы для лидеров малых групп, а также найти конспекты для проведения МГ.${COMMON.useButtonBelow}`;

// ============================================================================
// Основной объект (inline тексты)
// ============================================================================

export const SMALL_GROUPS_TEXTS = {
	title: "Раздел: Малые группы",
	descriptionForMembers: smallGroupsTextsDescriptionForMembers,
	descriptionForOther: smallGroupsTextsDescriptionForOther,

	// Промпты
	chooseDay: fmt`Выберите день:`,
	chooseDistrict: fmt`Выберите район:`,

	// Fallback-сообщения
	noNextLmg: fmt`😔 Ближайших встреч ЛМГ в этом сезоне не найдено.`,
	noFutureLmg: fmt`😔 В этом сезоне встреч ЛМГ больше нет.`,

	// Списки
	lmgSeasonList: fmt`📖 ${bold()}Список встреч ЛМГ до конца сезона:${bold()}`,
	lmgNotesIntro: smallGroupsTextsLmgNotesIntro,
};
