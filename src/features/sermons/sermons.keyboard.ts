/**
 * Клавиатуры для раздела «Проповеди».
 * - replySermonsMenu — основное меню раздела
 * - inlineBibleBooksMenu — inline-список книг Библии
 * - inlineChaptersMenu — inline-список глав выбранной книги
 * - inlineSeriesMenu — inline-список серий проповедей
 */
import { InlineKeyboard, Keyboard } from "grammy";
import { SERMONS_BUTTON_LABELS } from "./sermons.constants";
import { NAVIGATION_LABELS } from "../../constants/navigation";

/** Reply-клавиатура раздела «Проповеди». */
export const replySermonsMenu = new Keyboard()
	.text(SERMONS_BUTTON_LABELS.SERMONS_BY_BOOK)
	.row()
	.text(SERMONS_BUTTON_LABELS.SERMONS_BY_SERIES)
	.row()
	.text(SERMONS_BUTTON_LABELS.SERMONS_PODCASTS)
	.row()
	.text(NAVIGATION_LABELS.NAV_BACK)
	.resized();

/**
 * Строит inline-клавиатуру с книгами Библии.
 * Книги раскладываются по 3 в ряд, каждая ведёт к callback `sermons:book:{index}`.
 */
export function inlineBibleBooksMenu(books: string[]): InlineKeyboard {
	const keyboard = new InlineKeyboard();

	for (let i = 0; i < books.length; i += 3) {
		const booksInRow = books.slice(i, i + 3);
		for (let j = 0; j < booksInRow.length; j++) {
			const bookIndex = i + j;
			keyboard.text(booksInRow[j], `sermons:book:${bookIndex}`);
		}
		keyboard.row();
	}

	return keyboard;
}

/**
 * Строит inline-клавиатуру с главами выбранной книги.
 * Главы раскладываются по 4 в ряд, каждая ведёт к callback `sermons:book:{bookIndex}:chapter:{chapterNumber}`.
 * Также добавляет кнопку "Назад к книгам" с callback `sermons:books`.
 */
export function inlineChaptersMenu(chapters: number[], bookIndex: number): InlineKeyboard {
	const keyboard = new InlineKeyboard();

	// Сортируем главы по возрастанию
	const sortedChapters = [...chapters].sort((a, b) => a - b);

	// Раскладываем главы по 4 в ряд
	for (let i = 0; i < sortedChapters.length; i += 4) {
		const chaptersInRow = sortedChapters.slice(i, i + 4);
		for (const chapter of chaptersInRow) {
			keyboard.text(`${chapter}`, `sermons:book:${bookIndex}:chapter:${chapter}`);
		}
		keyboard.row();
	}

	// Добавляем кнопку "Назад к книгам"
	keyboard.text(NAVIGATION_LABELS.NAV_BACK, "sermons:books");

	return keyboard;
}

/**
 * Строит inline-клавиатуру с сериями проповедей.
 * Серии раскладываются в одну колонку (по одной на строку),
 * каждая ведёт к callback `sermons:series:{index}`.
 */
export function inlineSeriesMenu(series: string[]): InlineKeyboard {
	const keyboard = new InlineKeyboard();

	// Каждая серия в отдельной строке (одна колонка)
	for (let i = 0; i < series.length; i++) {
		keyboard.text(series[i], `sermons:series:${i}`).row();
	}

	return keyboard;
}

/**
 * Строит inline-клавиатуру с кнопкой "Назад к сериям".
 * Используется когда показываем список проповедей конкретной серии.
 */
export function inlineSeriesBackMenu(): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	keyboard.text(NAVIGATION_LABELS.NAV_BACK, "sermons:series:back");
	return keyboard;
}

/**
 * Строит inline-клавиатуру с кнопкой "Назад к книгам".
 * Используется когда показываем список проповедей книги без глав.
 */
export function inlineBooksBackMenu(): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	keyboard.text(NAVIGATION_LABELS.NAV_BACK, "sermons:books");
	return keyboard;
}

/**
 * Строит inline-клавиатуру с кнопкой "Назад к главам".
 * Используется когда показываем список проповедей конкретной главы книги.
 * Кнопка возвращает к списку глав выбранной книги.
 */
export function inlineChaptersBackMenu(chapters: number[], bookIndex: number): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	keyboard.text(NAVIGATION_LABELS.NAV_BACK, `sermons:book:${bookIndex}`);
	return keyboard;
}
