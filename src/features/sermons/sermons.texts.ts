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

export const SERMONS_TEXTS = {
	title: fmt`${bold()}Раздел: Проповеди${bold()}`,
	podcasts: sermonsTextsPodcasts,
	noMediaFound: "❌ Проповеди с медиа не найдены.",
	notLoaded: "❌ Проповеди не загружены. Попробуйте выбрать раздел снова.",
	bookNotFound: "❌ Книга не найдена.",
	seriesNotFound: "❌ Серия не найдена.",
	selectBookTitle: "Выберите книгу Библии:",
	selectChapterTitle: (bookName: string) => `Выберите главу книги "${bookName}":`,
	selectSeriesTitle: "Выберите серию:",
	prepareBookList: "⏳ Готовлю список проповедей по выбранной книге…",
	progressFirst: "⏳ Загружаю проповеди…",
	progressSecond: "📊 Записей много, выгрузка продолжается. Пожалуйста, подождите еще немного...",
	notFoundInBook: "❌ Проповеди по этой книге не найдены.",
	noSeriesFound: "❌ Серии не найдены.",
	notFoundInSeries: "❌ Проповеди по этой серии не найдены.",
	errorPrefix: "❌ Ошибка при загрузке проповедей:",
	errorLoadingSermons: "❌ Ошибка при загрузке проповедей:",
	errorLoadingChapters: "❌ Ошибка при загрузке глав:",
	errorLoadingSeries: "❌ Ошибка при загрузке серий:",
	fields: {
		title: "📌 Название",
		chapter: "📄 Глава",
		date: "📅 Дата",
		preacher: "👤 Проповедник",
		series: "📚 Серия",
		text: "📝 Текст",
		platforms: "🔗 Платформы",
		defaultTitle: "Без названия",
	},
	platforms: {
		yandex: "Яндекс",
		youtube: "YouTube",
		vk: "VK",
		podster: "Podster.fm",
	},
};
