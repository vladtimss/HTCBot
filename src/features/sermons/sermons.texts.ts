/**
 * features/sermons/sermons.texts.ts
 * --------------------------
 * Тексты для раздела "Проповеди"
 */

import { fmt, bold, link } from "@grammyjs/parse-mode";

// ============================================================================
// Динамические тексты (функции)
// ============================================================================

/**
 * Строит текст о подкастах с проповедями.
 */
function sermonsTextsPodcasts(yandexUrl: string, podsterUrl: string) {
	return fmt`🎧 ${bold()}Наши проповеди доступны в подкастах:${bold()}
- ${link(yandexUrl)}Яндекс.Музыка${link(yandexUrl)}
- ${link(podsterUrl)}Podster.fm${link(podsterUrl)}`;
}

// ============================================================================
// Основной объект (inline тексты)
// ============================================================================

/**
 * Строит текст выбора главы книги с форматированием.
 */
function selectChapterTitleText(bookName: string) {
	return fmt`Выберите главу книги ${bold()}${bookName}${bold()}:`;
}

export const SERMONS_TEXTS = {
	title: fmt`${bold()}Раздел: Проповеди${bold()}`,
	podcasts: sermonsTextsPodcasts,
	noMediaFound: "❌ Проповеди с медиа не найдены.",
	bookNotFound: "❌ Книга не найдена.",
	seriesNotFound: "❌ Серия не найдена.",
	selectBookTitle: "Выберите книгу Библии:",
	selectChapterTitle: selectChapterTitleText,
	selectSeriesTitle: "Выберите серию:",
	prepareBookList: "⏳ Готовлю список проповедей по выбранной книге…",
	progressFirst: "⏳ Загружаю проповеди…",
	progressSecond: "📊 Записей много, выгрузка продолжается. Пожалуйста, подождите еще немного...",
	notFoundInBook: "❌ Проповеди по этой книге не найдены.",
	noSeriesFound: "❌ Серии не найдены.",
	notFoundInSeries: "❌ Проповеди по этой серии не найдены.",
	errorLoadingSermons: "❌ Ошибка при загрузке проповедей:",
	errorLoadingChapters: "❌ Ошибка при загрузке глав:",
	errorLoadingSeries: "❌ Ошибка при загрузке серий:",
	fields: {
		defaultTitle: "Без названия",
	},
};
