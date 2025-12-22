/**
 * features/small-groups/small-groups.util.ts
 * --------------------------
 * Утилиты для форматирования и работы с малыми группами
 */

import { SmallGroup, WEEKDAY_TITLE } from "../../data/small-groups";
import { escapeMdV2, escapeUrlV2 } from "../../utils/text";

/**
 * Форматирует информацию об одной малой группе в виде «карточки» (MarkdownV2).
 */
export function formatGroup(g: SmallGroup): string {
	// Экранируем внешние данные для MarkdownV2
	const escapedTitle = escapeMdV2(g.title);
	const escapedWeekday = escapeMdV2(WEEKDAY_TITLE[g.weekday]);
	const escapedTime = escapeMdV2(g.time);

	const leaders = g.leaders
		.map((l) => {
			const escapedFirstName = escapeMdV2(l.firstName);
			if (l.tgUserName) {
				// В MarkdownV2 ссылки: [текст](url), текст внутри ссылки экранируем, URL тоже
				const escapedUrl = escapeUrlV2(`https://t.me/${l.tgUserName}`);
				return `👤 [${escapedFirstName}](${escapedUrl})`;
			}
			if (l.tgId) {
				const escapedUrl = escapeUrlV2(`tg://user?id=${l.tgId}`);
				return `👤 [${escapedFirstName}](${escapedUrl})`;
			}
			return `👤 ${escapedFirstName}`;
		})
		.join("\n");

	const addresses = g.addresses
		.map((a) => {
			const escapedAddress = escapeMdV2(a.address);
			// Экранируем URL для MarkdownV2 (только ) и \)
			const escapedUrl = escapeUrlV2(a.mapUrl);
			return `📍 [${escapedAddress}](${escapedUrl})`;
		})
		.join("\n");

	return [
		`*✨ ${escapedTitle}*`,
		"",
		`🗓 _${escapedWeekday}, начало в ${escapedTime}_`,
		"",
		addresses,
		"",
		"_\\(Напишите ведущим, если хотите что\\-то уточнить \\- нажмите на имя 👇\\)_\n",
		leaders,
	].join("\n");
}
