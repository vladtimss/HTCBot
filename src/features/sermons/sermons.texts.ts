/**
 * features/sermons/sermons.texts.ts
 * --------------------------
 * Тексты для раздела "Проповеди"
 */

import { fmt, bold, link } from "@grammyjs/parse-mode";

export const SERMONS_TEXTS = {
	title: fmt`${bold()}Раздел: Проповеди${bold()}`,
	podcasts: (yandexUrl: string, podsterUrl: string) => {
		return fmt`🎧 ${bold()}Наши проповеди доступны в подкастах:${bold()}

\\- ${link(yandexUrl)}Яндекс.Музыка${link(yandexUrl)}
\\- ${link(podsterUrl)}Podster.fm${link(podsterUrl)}`;
	},
};
