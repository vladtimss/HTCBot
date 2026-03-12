/**
 * features/lmg-notes/lmg-notes.keyboard.ts
 * --------------------------
 * Клавиатуры для раздела "Конспекты ЛМГ"
 */

import { InlineKeyboard, Keyboard } from "grammy";
import { SMALL_GROUPS_BUTTON_LABELS } from "../small-groups/small-groups.constants";
import { NAVIGATION_LABELS } from "../../constants/navigation";

/**
 * Клавиатура для раздела "Конспекты ЛМГ"
 */
export function replyLmgNotesMenu() {
	return new Keyboard()
		.text(SMALL_GROUPS_BUTTON_LABELS.LMG_NOTES_PREV)
		.row()
		.text(SMALL_GROUPS_BUTTON_LABELS.LMG_NOTES_BY_BOOK)
		.row()
		.text(NAVIGATION_LABELS.NAV_BACK)
		.resized();
}

/**
 * Inline-клавиатура со списком книг Библии для конспектов ЛМГ.
 * Книги раскладываются по 3 в ряд.
 */
export function inlineLmgBibleBooksMenu(books: string[]): InlineKeyboard {
	const keyboard = new InlineKeyboard();

	for (let i = 0; i < books.length; i += 3) {
		const booksInRow = books.slice(i, i + 3);
		for (let j = 0; j < booksInRow.length; j++) {
			const bookIndex = i + j;
			keyboard.text(booksInRow[j], `lmg:book:${bookIndex}`);
		}
		keyboard.row();
	}

	return keyboard;
}

/**
 * Inline-клавиатура со списком глав выбранной книги для конспектов ЛМГ.
 * Главы по 4 в ряд.
 */
export function inlineLmgChaptersMenu(chapters: number[], bookIndex: number): InlineKeyboard {
	const keyboard = new InlineKeyboard();

	const sorted = [...chapters].sort((a, b) => a - b);
	for (let i = 0; i < sorted.length; i += 4) {
		const row = sorted.slice(i, i + 4);
		for (const ch of row) {
			keyboard.text(`${ch}`, `lmg:book:${bookIndex}:chapter:${ch}`);
		}
		keyboard.row();
	}

	keyboard.text(NAVIGATION_LABELS.NAV_BACK, "lmg:books");

	return keyboard;
}

/**
 * Inline-клавиатура для одного конспекта ЛМГ с кнопкой "ПОЛУЧИТЬ КОНСПЕКТ".
 */
export function inlineLmgNoteDownloadMenu(noteId: string, backAction?: string): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	if (backAction) {
		keyboard.text(NAVIGATION_LABELS.NAV_BACK, backAction);
	}
	keyboard.text("📄 КОНСПЕКТ", `lmg:note:${noteId}`);
	return keyboard;
}
