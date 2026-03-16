/**
 * features/lmg-notes/lmg-notes.util.ts
 * --------------------------
 * Утилиты для работы с конспектами ЛМГ
 */

import { InputFile }                        from "grammy";
import { getAllDatabaseRecords, getPage }   from "../../services/buildin";
import {
	BuildinDatabaseRecord,
	BuildinTitleProperty,
	BuildinDateProperty,
	BuildinFilesProperty,
	BuildinMultiSelectProperty,
	BuildinRichTextProperty,
	LmgNote,
	BuildinFile,
}                                           from "../../types/buildin";
import { BIBLE_BOOK_INDEXES, BOOK_ALIASES } from "../sermons/sermons.constants";
import { parseChapterAndVerseFromText }     from "../sermons/sermons.util";

/**
 * ID базы с конспектами ЛМГ
 * URL: https://buildin.ai/htchurch/d8ddec27-c395-4c7c-a229-850d579ef7b3
 */
export const LMG_NOTES_DATABASE_ID = "d8ddec27-c395-4c7c-a229-850d579ef7b3";

/**
 * Нормализация даты из формата Buildin
 */
export function normalizeDate(dateStr: string): string {
	if (!dateStr) return dateStr;
	// убираем время
	let clean = dateStr.split("T")[0];
	// бывают "2024/03-11" → заменяем второй разделитель на "/"
	clean = clean.replace(/(\d{4})[/-](\d{2})[-/](\d{2})/, "$1-$2-$3");
	return clean;
}

/**
 * Скачивание файла по URL и преобразование в InputFile для отправки в Telegram
 */
export async function fetchFileAsInput(url: string, fileName: string): Promise<InputFile> {
	try {
		const res = await fetch(url);
		if (!res.ok) {
			console.error("[lmg-notes] fetchFileAsInput non-OK response", {
				url,
				status: res.status,
				statusText: res.statusText,
			});
			throw new Error(`Не удалось скачать файл: ${res.status}`);
		}
		const buffer = Buffer.from(await res.arrayBuffer());
		return new InputFile(buffer, fileName);
	} catch (err) {
		console.error("[lmg-notes] fetchFileAsInput error", {
			url,
			error: err instanceof Error ? err.message : String(err),
		});
		throw err;
	}
}

/**
 * Нормализация названия книги для поиска в алиасах.
 */
function normalizeBookName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[\s.\-]/g, "")
		.replace(/ё/g, "е");
}

/**
 * Определение индекса книги по названию с учётом алиасов.
 */
function getBookIndex(bookName: string | undefined): number | undefined {
	if (!bookName) return undefined;
	const normalized = normalizeBookName(bookName);

	const aliasTarget = BOOK_ALIASES[normalized];
	if (aliasTarget && BIBLE_BOOK_INDEXES[aliasTarget]) {
		return BIBLE_BOOK_INDEXES[aliasTarget];
	}

	for (const canonical in BIBLE_BOOK_INDEXES) {
		if (normalizeBookName(canonical) === normalized) {
			return BIBLE_BOOK_INDEXES[canonical];
		}
	}

	return undefined;
}

/**
 * Краткие обозначения книг для отображения текста (Мф., Мк., Флп. и т.п.).
 */
const BOOK_SHORT_NAMES: Record<string, string> = {
	"От Матфея": "Мф.",
	"От Марка": "Мк.",
	"Евангелие от Марка": "Мк.",
	"Филиппийцам": "Флп.",
	"Филлипийцам": "Флп.",
};

export function getBookShortName(book?: string): string | undefined {
	if (!book) return undefined;
	return BOOK_SHORT_NAMES[book] ?? book;
}

/**
 * Нормализованная информация о книгах для конспектов ЛМГ.
 */
export type NormalizedLmgBook = {
	name: string;
	noteIds: string[];
	byChapter: Record<number, string[]>;
};

export type NormalizedLmgNotesState = {
	notes: {
		byId: Record<string, LmgNote>;
		allIds: string[];
	};
	books: {
		byIndex: Record<number, NormalizedLmgBook>;
		byName: Record<string, number>;
		allIndexes: number[];
		allNames: string[];
	};
};

/**
 * Извлекает один конспект ЛМГ из записи Buildin.
 */
function extractLmgNote(record: BuildinDatabaseRecord): LmgNote {
	const { properties } = record;

	const titleProp = properties["title"] as BuildinTitleProperty | undefined;
	const title = titleProp?.title?.[0]?.plain_text ?? "Без темы";

	const goalProp = properties["Цель на группу"] as BuildinRichTextProperty | undefined;
	const goalText = goalProp?.rich_text?.[0]?.plain_text;

	const bookProp = properties["Книга"] as BuildinMultiSelectProperty | undefined;
	const book = (bookProp?.multi_select?.[0]?.name ?? undefined) as string | undefined;

	const chapterProp = properties["Глава"] as BuildinMultiSelectProperty | undefined;
	const chapterName = chapterProp?.multi_select?.[0]?.name;
	const chapter = chapterName ? parseInt(chapterName, 10) || undefined : undefined;

	const textProp = properties["Текст"] as BuildinRichTextProperty | undefined;
	const text = textProp?.rich_text?.map((t) => t.plain_text).join("") ?? undefined;

	const dateProp = properties["Дата встречи"] as BuildinDateProperty | undefined;
	const rawDate = dateProp?.date?.start ?? "";
	const date = rawDate ? normalizeDate(rawDate) : undefined;

	const filesProp = properties["Конспект"] as BuildinFilesProperty | undefined;
	const file: BuildinFile | undefined = filesProp?.files?.[0];

	// Если главы нет, пробуем извлечь её из текста формата "4:1-5"
	let finalChapter = chapter;
	if (!finalChapter && text) {
		const parsed = parseChapterAndVerseFromText(text);
		if (parsed?.chapter) {
			finalChapter = parsed.chapter;
		}
	}

	return {
		id: record.id,
		title,
		book,
		chapter: finalChapter,
		text,
		groupGoal: goalText || undefined,
		date,
		file,
	};
}

/**
 * Получает все конспекты ЛМГ из базы.
 */
export async function getAllLmgNotes(): Promise<LmgNote[]> {
	const records = await getAllDatabaseRecords(LMG_NOTES_DATABASE_ID, {
		page_size: 100,
	});
	return records.map(extractLmgNote);
}

/**
 * Получает актуальный файл конспекта для указанной страницы (по ID страницы Buildin).
 * Используется, чтобы не полагаться на потенциально протухший URL из кеша.
 */
export async function getFreshLmgNoteFile(noteId: string): Promise<BuildinFile | undefined> {
	const page = await getPage(noteId);
	const filesProp = page.properties?.["Конспект"] as BuildinFilesProperty | undefined;
	const files: BuildinFile[] = filesProp?.files ?? [];
	return files[0];
}

/**
 * Строит нормализованное состояние конспектов ЛМГ для быстрого доступа
 * по книгам и главам.
 */
export function buildNormalizedLmgNotesState(notes: LmgNote[]): NormalizedLmgNotesState {
	const notesById: Record<string, LmgNote> = {};
	const allIds: string[] = [];
	const booksByIndex: Record<number, NormalizedLmgBook> = {};
	const booksByName: Record<string, number> = {};

	const extrasIndex = new Map<string, number>();
	const maxCanonicalIndex = Math.max(...Object.values(BIBLE_BOOK_INDEXES));
	let nextExtraIndex = maxCanonicalIndex + 1;

	for (const note of notes) {
		notesById[note.id] = note;
		allIds.push(note.id);

		const bookName = note.book;
		if (!bookName) continue;

		let bookIdx = getBookIndex(bookName);
		if (!bookIdx) {
			if (!extrasIndex.has(bookName)) {
				extrasIndex.set(bookName, nextExtraIndex++);
			}
			bookIdx = extrasIndex.get(bookName);
		}
		if (!bookIdx) continue;

		const existing = booksByIndex[bookIdx];
		if (!existing) {
			booksByIndex[bookIdx] = {
				name: bookName,
				noteIds: [note.id],
				byChapter: {},
			};
			booksByName[bookName] = bookIdx;
		} else {
			existing.noteIds.push(note.id);
		}

		if (note.chapter && booksByIndex[bookIdx]) {
			const bookRec = booksByIndex[bookIdx]!;
			const list = bookRec.byChapter[note.chapter] || [];
			list.push(note.id);
			bookRec.byChapter[note.chapter] = list;
		}
	}

	const idxToName: Record<number, string | undefined> = {};
	Object.entries(booksByIndex).forEach(([idxStr, book]) => {
		const idx = Number(idxStr);
		if (!idxToName[idx]) {
			idxToName[idx] = book.name;
		}
	});

	const canonicalBooks = Object.keys(BIBLE_BOOK_INDEXES).sort(
		(a, b) => BIBLE_BOOK_INDEXES[a]! - BIBLE_BOOK_INDEXES[b]!
	);

	const booksInOrder: number[] = [];
	for (const canonical of canonicalBooks) {
		const idx = BIBLE_BOOK_INDEXES[canonical];
		if (idx && idxToName[idx]) {
			booksInOrder.push(idx);
		}
	}

	const extrasSorted = Array.from(extrasIndex.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	const extrasOrderedIdx = extrasSorted.map(([, idx]) => idx);

	const allIndexes = [...booksInOrder, ...extrasOrderedIdx];
	const allNames = allIndexes
		.map((idx) => idxToName[idx] || extrasSorted.find(([, i]) => i === idx)?.[0])
		.filter((n): n is string => Boolean(n));

	return {
		notes: {
			byId: notesById,
			allIds,
		},
		books: {
			byIndex: booksByIndex,
			byName: booksByName,
			allIndexes,
			allNames,
		},
	};
}

export function getLmgBookByIndex(
	state: NormalizedLmgNotesState,
	bookIndex: number
): { book: string; bookRec: NormalizedLmgBook } | undefined {
	const books = state.books.allNames;
	const book = books[bookIndex];
	if (!book) return undefined;

	const bookIdx = state.books.byName[book];
	const bookRec = bookIdx ? state.books.byIndex[bookIdx] : undefined;
	if (!bookRec) return undefined;

	return { book, bookRec };
}

export function getLmgChaptersFromBook(bookRec: NormalizedLmgBook): number[] {
	return Object.keys(bookRec.byChapter)
				 .map((ch) => parseInt(ch, 10))
				 .filter((ch) => !isNaN(ch))
				 .sort((a, b) => a - b);
}

export function getLmgNotesByBookAndChapter(
	state: NormalizedLmgNotesState,
	bookRec: NormalizedLmgBook,
	chapterNumber?: number
): LmgNote[] {
	let noteIds: string[];

	if (chapterNumber !== undefined) {
		noteIds = bookRec.byChapter[chapterNumber] ?? [];
	} else {
		noteIds = bookRec.noteIds ?? [];
	}

	return noteIds.map((id) => state.notes.byId[id]!).filter(Boolean);
}

/**
 * Форматирует дату встречи в формате "ДД.MM.ГГГГ, День недели".
 */
export function formatMeetingDateWithWeekday(dateStr: string | undefined): string | undefined {
	if (!dateStr) return undefined;
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return undefined;

	const datePart = d.toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
	const weekday = d.toLocaleDateString("ru-RU", { weekday: "long" });
	const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

	return `${datePart}, ${capitalizedWeekday}`;
}

/**
 * Сортировка конспектов по дате по убыванию (новые выше).
 */
export function sortLmgNotesByDateDesc(notes: LmgNote[]): LmgNote[] {
	return notes
		.slice()
		.sort((a, b) => {
			if (a.date && b.date) {
				const da = new Date(a.date).getTime();
				const db = new Date(b.date).getTime();
				return da - db;
			}
			if (a.date && !b.date) return 1;
			if (!a.date && b.date) return -1;
			return 0;
		});
}
