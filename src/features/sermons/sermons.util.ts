import { getAllDatabaseRecords, getPage } from "../../services/buildin";
import { SERMONS_DATABASE_ID, PEOPLE_DATABASE_ID } from "./sermons.constants";
import {
	Sermon,
	SermonMedia,
	BuildinTitleProperty,
	BuildinRichTextProperty,
	BuildinSelectProperty,
	BuildinMultiSelectProperty,
	BuildinUrlProperty,
	BuildinDateProperty,
	BuildinDatabaseRecord,
	BuildinRelationProperty,
	BuildinPage,
} from "../../types/buildin";
import {
	extractTitle,
	extractRichText,
	extractSelect,
	extractMultiSelect,
	extractUrl,
	extractDate,
} from "../../helpers/buildin-helpers";
import { ALL_BIBLE_BOOKS } from "./sermons.constants";

const SERMON_FIELDS = {
	TITLE: "title",
	BOOK: "Книга Библии",
	SERMON_TEXT: "Текст для проповеди",
	SERIES: "Серия",
	PREACHER: "Проповедник",
	DATE: "Дата проповеди",
	DATE_ALT: "Дата",
	MEDIA_YANDEX: "media.yandex",
	MEDIA_YOUTUBE: "media.youtube",
	MEDIA_VK: "media.vk",
	MEDIA_PODSTER: "media.podster_fm",
} as const;

function isValidUrl(url: string | undefined | null): boolean {
	if (!url || typeof url !== "string") return false;
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

/**
 * Нормализует название книги: нижний регистр, убирает пробелы/дефисы/точки.
 */
function normalizeBookName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[\s.\-]/g, "")
		.replace(/ё/g, "е");
}

/**
 * Алиасы: нормализованное имя -> каноническое название (как в ALL_BIBLE_BOOKS).
 * Дополняем по мере необходимости, чтобы ловить разные варианты написаний.
 */
const BOOK_ALIASES: Record<string, string> = {
	"1етимофею": "1 Тимофею",
	"1тимофею": "1 Тимофею",
	"2етимофею": "2 Тимофею",
	"2тимофею": "2 Тимофею",
	"отлуки": "От Луки",
};

/**
 * Карта канонических названий -> индекс (1-based) для быстрого сопоставления.
 */
const BIBLE_BOOK_INDEXES: Record<string, number> = ALL_BIBLE_BOOKS.reduce((acc, book, idx) => {
	acc[book] = idx + 1;
	return acc;
}, {} as Record<string, number>);

/**
 * Получает канонический индекс книги, учитывая алиасы и нормализацию.
 */
function getBookIndex(bookName: string | undefined): number | undefined {
	if (!bookName) return undefined;

	const normalized = normalizeBookName(bookName);

	// Сначала ищем в алиасах
	const aliasTarget = BOOK_ALIASES[normalized];
	if (aliasTarget && BIBLE_BOOK_INDEXES[aliasTarget]) {
		return BIBLE_BOOK_INDEXES[aliasTarget];
	}

	// Пробуем прямое сопоставление с каноном через нормализацию
	for (const canonical of ALL_BIBLE_BOOKS) {
		if (normalizeBookName(canonical) === normalized) {
			return BIBLE_BOOK_INDEXES[canonical];
		}
	}

	return undefined;
}

export function parseChapterFromText(text: string | undefined): number[] | undefined {
	if (!text) return;

	const cleanText = text.trim();
	const chapterPatterns = [
		/\.(\d+)[:.]/,
		/\s(\d+)[:.]/,
		/^(\d+)[:.]/,
	];

	for (const pattern of chapterPatterns) {
		const match = cleanText.match(pattern);
		if (match) {
			const chapter = parseInt(match[1], 10);
			if (!isNaN(chapter) && chapter > 0) {
				return [chapter];
			}
		}
	}
}

function parseDate(dateStr: string | undefined): string | undefined {
	if (!dateStr) return undefined;

	try {
		const normalized = dateStr.replace(/\//g, "-");
		const date = new Date(normalized);
		if (isNaN(date.getTime())) {
			return undefined;
		}
		return dateStr;
	} catch {
		return undefined;
	}
}

/**
 * Проверяет, есть ли у записи хотя бы одно валидное медиа-поле.
 */
function hasSomeMedia(properties: BuildinDatabaseRecord["properties"]): boolean {
	return (
		isValidUrl(extractUrl(properties[SERMON_FIELDS.MEDIA_YANDEX] as BuildinUrlProperty | undefined)) ||
		isValidUrl(extractUrl(properties[SERMON_FIELDS.MEDIA_YOUTUBE] as BuildinUrlProperty | undefined)) ||
		isValidUrl(extractUrl(properties[SERMON_FIELDS.MEDIA_VK] as BuildinUrlProperty | undefined)) ||
		isValidUrl(extractUrl(properties[SERMON_FIELDS.MEDIA_PODSTER] as BuildinUrlProperty | undefined))
	);
}

/**
 * Получает имя проповедника из relation поля.
 *
 * Поле "Проповедник" может быть типа relation - в этом случае там хранится только id страницы,
 * поэтому нужно дополнительно запросить страницу с человеком, чтобы получить его ФИО.
 */
export async function getPreacherName(relationField: BuildinRelationProperty): Promise<string | undefined> {
	if (!relationField.relation || relationField.relation.length === 0) {
		return;
	}

	for (const relation of relationField.relation) {
		if (!relation.id) {
			continue;
		}

		try {
			const page: BuildinPage = await getPage(relation.id);
			const parentDbId = page.parent?.database_id;
			if (parentDbId === PEOPLE_DATABASE_ID) {
				const title = extractTitle(page.properties?.title as BuildinTitleProperty | undefined);
				if (title) {
					return title;
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			// Логируем ошибки 403 с ID страницы, к которой нет доступа
			if (errorMessage.includes("403")) {
				console.error(`[sermons] 403 Forbidden - нет доступа к странице проповедника: ${relation.id}`);
			} else {
				console.error(`[sermons] Ошибка получения проповедника ${relation.id}:`, errorMessage);
			}
		}
	}
}

function extractSermonProperties(record: BuildinDatabaseRecord): Sermon {
	const { properties } = record;

	// Извлекаем медиа-ссылки (проверяем валидность URL)
	const yandexUrl = extractUrl(properties[SERMON_FIELDS.MEDIA_YANDEX] as BuildinUrlProperty | undefined);
	const youtubeUrl = extractUrl(properties[SERMON_FIELDS.MEDIA_YOUTUBE] as BuildinUrlProperty | undefined);
	const vkUrl = extractUrl(properties[SERMON_FIELDS.MEDIA_VK] as BuildinUrlProperty | undefined);
	const podsterUrl = extractUrl(properties[SERMON_FIELDS.MEDIA_PODSTER] as BuildinUrlProperty | undefined);

	const media: SermonMedia = {
		yandex: isValidUrl(yandexUrl) ? yandexUrl : undefined,
		youtube: isValidUrl(youtubeUrl) ? youtubeUrl : undefined,
		vk: isValidUrl(vkUrl) ? vkUrl : undefined,
		podster_fm: isValidUrl(podsterUrl) ? podsterUrl : undefined,
	};

	// Извлекаем основные поля
	const title = extractTitle(properties[SERMON_FIELDS.TITLE] as BuildinTitleProperty | undefined);
	const book = extractMultiSelect(properties[SERMON_FIELDS.BOOK] as BuildinMultiSelectProperty | undefined)[0];
	const sermonText = extractRichText(properties[SERMON_FIELDS.SERMON_TEXT] as BuildinRichTextProperty | undefined);
	const series = extractSelect(properties[SERMON_FIELDS.SERIES] as BuildinSelectProperty | undefined);

	// Парсим главу из текста проповеди
	const chapter = parseChapterFromText(sermonText)?.[0];

	// Извлекаем проповедника
	// Поле "Проповедник" может быть типа relation (только id, нужно дополнительно запрашивать ФИО),
	// select или rich_text
	const preacherField = properties[SERMON_FIELDS.PREACHER] as
		| BuildinSelectProperty
		| BuildinRichTextProperty
		| BuildinRelationProperty
		| undefined;

	let preacher: string | undefined;
	if (preacherField?.type === "select") {
		preacher = extractSelect(preacherField);
	} else if (preacherField?.type === "rich_text") {
		preacher = extractRichText(preacherField);
	}

	// Извлекаем дату (пробуем два поля)
	const date = parseDate(
		extractDate(
			(properties[SERMON_FIELDS.DATE] as BuildinDateProperty | undefined) ||
				(properties[SERMON_FIELDS.DATE_ALT] as BuildinDateProperty | undefined)
		)
	);

	return {
		id: record.id,
		title,
		book,
		chapter,
		sermonText,
		series,
		preacher,
		date,
		media,
		raw: record,
	};
}

export async function getAllSermonsWithSomeMedia(): Promise<Sermon[]> {
	const allRecords = await getAllDatabaseRecords(SERMONS_DATABASE_ID, {
		page_size: 100,
	});

	const sermons: Sermon[] = [];

	for (const record of allRecords) {
		if (!hasSomeMedia(record.properties)) {
			continue;
		}

		sermons.push(extractSermonProperties(record));
	}

	return sermons;
}

export type NormalizedBook = {
	name: string;
	sermonIds: string[];
	byChapter: Map<number, string[]>;
};

export type NormalizedSermonState = {
	sermons: {
		byId: Map<string, Sermon>;
		allIds: string[];
	};
	books: {
		byIndex: Map<number, NormalizedBook>;
		byName: Map<string, number>;
		allIndexes: number[];
		allNames: string[];
	};
	series: {
		byName: Map<string, string[]>;
		allNames: string[];
	};
	preachers: {
		byName: Map<string, string[]>;
		allNames: string[];
	};
};

/**
 * Строит нормализованное состояние для быстрого доступа:
 * - книги по индексам (канон + прочие)
 * - серии
 * - проповедники (по имени)
 */
export function buildNormalizedSermonState(sermons: Sermon[]): NormalizedSermonState {
	const sermonsById = new Map<string, Sermon>();
	const sermonsAllIds: string[] = [];
	const booksByIndex = new Map<number, NormalizedBook>();
	const booksByName = new Map<string, number>();
	const seriesByName = new Map<string, string[]>();
	const preachersByName = new Map<string, string[]>();

	const extrasIndex = new Map<string, number>();
	let nextExtraIndex = ALL_BIBLE_BOOKS.length + 1;

	for (const sermon of sermons) {
		// сохраняем проповедь в таблицу
		sermonsById.set(sermon.id, sermon);
		sermonsAllIds.push(sermon.id);

		const bookName = sermon.book;

		// Книга не указана — пропускаем
		if (!bookName) {
			continue;
		}

		// Определяем индекс книги: либо канон, либо доп. индекс для прочих
		let bookIdx = getBookIndex(bookName);
		if (!bookIdx) {
			if (!extrasIndex.has(bookName)) {
				extrasIndex.set(bookName, nextExtraIndex++);
			}
			bookIdx = extrasIndex.get(bookName);
		}

		// Если индекс не получился — пропускаем
		if (!bookIdx) {
			continue;
		}

		const existing = booksByIndex.get(bookIdx);
		if (!existing) {
			booksByIndex.set(bookIdx, {
				name: bookName,
				sermonIds: [sermon.id],
				byChapter: new Map<number, string[]>(),
			});
			booksByName.set(bookName, bookIdx);
		} else {
			existing.sermonIds.push(sermon.id);
		}

		// Серии
		if (sermon.series) {
			if (!seriesByName.has(sermon.series)) {
				seriesByName.set(sermon.series, []);
			}
			seriesByName.get(sermon.series)!.push(sermon.id);
		}

		// Проповедники (по имени)
		if (sermon.preacher) {
			const key = sermon.preacher.trim();
			if (!preachersByName.has(key)) {
				preachersByName.set(key, []);
			}
			preachersByName.get(key)!.push(sermon.id);
		}

		// Главы внутри книги
		if (sermon.chapter && booksByIndex.has(bookIdx)) {
			const bookRec = booksByIndex.get(bookIdx)!;
			const chapterList = bookRec.byChapter.get(sermon.chapter) || [];
			chapterList.push(sermon.id);
			bookRec.byChapter.set(sermon.chapter, chapterList);
		}
	}

	// Сортируем книги: канон -> прочие (по имени)
	const idxToName: Record<number, string | undefined> = {};
	for (const [idx, book] of booksByIndex.entries()) {
		if (!idxToName[idx]) {
			idxToName[idx] = book.name;
		}
	}

	const booksInOrder: number[] = [];
	for (const canonical of ALL_BIBLE_BOOKS) {
		const idx = BIBLE_BOOK_INDEXES[canonical];
		if (idxToName[idx]) {
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
		sermons: {
			byId: sermonsById,
			allIds: sermonsAllIds,
		},
		books: {
			byIndex: booksByIndex,
			byName: booksByName,
			allIndexes,
			allNames,
		},
		series: {
			byName: seriesByName,
			allNames: Array.from(seriesByName.keys()).sort(),
		},
		preachers: {
			byName: preachersByName,
			allNames: Array.from(preachersByName.keys()).sort(),
		},
	};
}


/**
 * Возвращает список книг, отсортированных по канону ALL_BIBLE_BOOKS,
 * а книги вне канона — в конце по алфавиту (по исходным названиям из БД).
 */
export function getSortedBooks(sermons: Sermon[]): string[] {
	const idxToName: Record<number, string | undefined> = {};
	const extras: string[] = [];

	for (const sermon of sermons) {
		const name = sermon.book;
		if (!name) continue;

		const idx = getBookIndex(name);
		if (idx) {
			if (!idxToName[idx]) {
				idxToName[idx] = name;
			}
		} else {
			extras.push(name);
		}
	}

	const booksInOrder: string[] = [];
	for (const canonical of ALL_BIBLE_BOOKS) {
		const idx = BIBLE_BOOK_INDEXES[canonical];
		const name = idxToName[idx];
		if (name) {
			booksInOrder.push(name);
		}
	}

	const booksNotInList = Array.from(new Set(extras)).sort();
	return [...booksInOrder, ...booksNotInList];
}
