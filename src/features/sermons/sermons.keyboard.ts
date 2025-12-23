import { InlineKeyboard, Keyboard } from "grammy";
import { SERMONS_BUTTON_LABELS, SERMONS_INLINE_LABELS } from "./sermons.constants";
import { NAVIGATION_LABELS } from "../../constants/navigation";

export const replySermonsMenu = new Keyboard()
	.text(SERMONS_BUTTON_LABELS.SERMONS_PODCASTS)
	.row()
	.text(SERMONS_BUTTON_LABELS.SERMONS_BY_BOOK)
	.row()
	.text(NAVIGATION_LABELS.NAV_BACK)
	.resized();

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
