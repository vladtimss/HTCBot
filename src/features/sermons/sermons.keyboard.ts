/**
 * Клавиатуры для раздела «Проповеди».
 * - replySermonsMenu — основное меню раздела
 * - inlineBibleBooksMenu — inline-список книг Библии
 */
import { InlineKeyboard, Keyboard } from "grammy";
import { SERMONS_BUTTON_LABELS, SERMONS_INLINE_LABELS } from "./sermons.constants";
import { NAVIGATION_LABELS } from "../../constants/navigation";

/** Reply-клавиатура раздела «Проповеди». */
export const replySermonsMenu = new Keyboard()
	.text(SERMONS_BUTTON_LABELS.SERMONS_PODCASTS)
	.row()
	.text(SERMONS_BUTTON_LABELS.SERMONS_BY_BOOK)
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
