import { getAllDatabaseRecords, getPage } from "../../services/buildin";
import { SERMONS_DATABASE_ID, PEOPLE_DATABASE_ID, BIBLE_BOOK_INDEXES, BOOK_ALIASES } from "./sermons.constants";
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

/**
 * Кэш страниц, к которым нет доступа (403 Forbidden).
 * Используется для предотвращения повторных запросов к недоступным страницам.
 */
const forbiddenPagesCache = new Set<string>();

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
	if (!url) {
		return false;
	}
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
 * Получает индекс книги из `BIBLE_BOOK_INDEXES`, учитывая алиасы и нормализацию.
 */
function getBookIndex(bookName: string | undefined): number | undefined {
	if (!bookName) return undefined;

	const normalized = normalizeBookName(bookName);

	// Сначала ищем в алиасах
	const aliasTarget = BOOK_ALIASES[normalized];
	if (aliasTarget && BIBLE_BOOK_INDEXES[aliasTarget]) {
		return BIBLE_BOOK_INDEXES[aliasTarget];
	}

	// Пробуем прямое сопоставление с эталонными названиями через нормализацию
	for (const canonical in BIBLE_BOOK_INDEXES) {
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
		/\.(\d+)[:.]/,      // точка перед числом, затем двоеточие или точка (например, ".18:" или ".18.")
		/\s(\d+)[:.]/,      // пробел перед числом, затем двоеточие или точка (например, " 18:" или " 18.")
		/^(\d+)[:.]/,       // начало строки с числом, затем двоеточие или точка (например, "18:" или "18.")
		/\s(\d+)$/,         // пробел перед числом в конце строки (например, " 18" в конце)
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
 * Проверяет, является ли страница проповедником из базы "Люди".
 * Возвращает имя проповедника, если страница доступна и из правильной базы.
 */
async function checkPreacherPage(pageId: string): Promise<{ name: string; id: string } | undefined> {
	// Проверяем кэш недоступных страниц - если страница уже в кэше, не делаем запрос
	if (forbiddenPagesCache.has(pageId)) {
		return undefined;
	}

	try {
		const page: BuildinPage = await getPage(pageId);
		const parentDbId = page.parent?.database_id;
		if (parentDbId !== PEOPLE_DATABASE_ID) {
			return undefined;
		}
		const name = extractTitle(page.properties?.title as BuildinTitleProperty | undefined);
		if (name) {
			return { name, id: pageId };
		}
		return undefined;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		// Если получили 403 - добавляем в кэш недоступных страниц
		if (errorMessage.includes("403")) {
			forbiddenPagesCache.add(pageId);
			console.error(`[sermons] 403 Forbidden - нет доступа к странице проповедника: ${pageId} (добавлено в кэш, повторные запросы будут пропущены)`);
		} else {
			console.error(`[sermons] Ошибка получения проповедника ${pageId}:`, errorMessage);
		}
		return undefined;
	}
}

/** Получить имя проповедника по ID страницы (когда relation уже известен) */
export async function getPreacherNameById(preacherId: string): Promise<string | undefined> {
	const result = await checkPreacherPage(preacherId);
	return result?.name;
}

/**
 * Проверяет все relations и возвращает правильный ID проповедника из базы "Люди".
 * Если найдено несколько, возвращает первый доступный.
 */
export async function findValidPreacherId(relationIds: string[]): Promise<string | undefined> {
	if (relationIds.length === 0) {
		return undefined;
	}

	// Проверяем все relations параллельно
	const results = await Promise.all(
		relationIds.map(id => checkPreacherPage(id))
	);

	// Находим первый валидный результат
	for (const result of results) {
		if (result) {
			return result.id;
		}
	}

	return undefined;
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

	// Извлекаем проповедника: relation ID и/или имя (select/rich_text)
	const preacherField = properties[SERMON_FIELDS.PREACHER] as
		| BuildinSelectProperty
		| BuildinRichTextProperty
		| BuildinRelationProperty
		| undefined;

	let preacher: string | undefined;
	let preacherId: string | undefined;
	let preacherIds: string[] | undefined;

	if (preacherField?.type === "select") {
		preacher = extractSelect(preacherField);
	} else if (preacherField?.type === "rich_text") {
		preacher = extractRichText(preacherField);
	} else if (preacherField?.type === "relation" && preacherField.relation.length > 0) {
		// Сохраняем все relation IDs для проверки всех вариантов
		preacherIds = preacherField.relation.map(r => r.id);
		preacherId = preacherIds[0]; // Первый для обратной совместимости
		
		// Логируем, если relations несколько
		if (preacherIds.length > 1) {
			console.log(`[sermons] Проповедь "${title}" имеет несколько relations:`, preacherIds);
		}
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
		preacherId,
		preacherIds,
		preacher,
		date,
		media,
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

/**
 * Нормализованная информация о книгах:
 * - `name` — исходное название книги из Buildin
 * - `sermonIds` — все ID проповедей по этой книге
 * - `byChapter` — индекс: номер главы → список ID проповедей
 */
export type NormalizedBook = {
	name: string;
	sermonIds: string[];
	byChapter: Record<number, string[]>;
};

/**
 * Нормализованное состояние проповедей для быстрого доступа:
 * - `sermons` — все проповеди по ID
 * - `books` — книги по индексам/названиям и общий порядок
 * - `series` — серии проповедей
 * - `preachers` — проповедники по имени
 */
export type NormalizedSermonState = {
	sermons: {
		byId: Record<string, Sermon>;
		allIds: string[];
	};
	books: {
		byIndex: Record<number, NormalizedBook>;
		byName: Record<string, number>;
		allIndexes: number[];
		allNames: string[];
	};
	series: {
		byName: Record<string, string[]>;
		allNames: string[];
	};
	preachers: {
		byName: Record<string, string[]>;
		allNames: string[];
	};
};

/**
 * Строит нормализованное состояние для быстрого доступа:
 * - книги по индексам (с учётом возможных разных написаний названий)
 * - серии
 * - проповедники (по имени)
 *
 * Важно:
 * - каждая проповедь всегда попадает в `sermons.byId`
 * - книга без названия или без сопоставляемого индекса игнорируется при построении индексов
 */
export function buildNormalizedSermonState(sermons: Sermon[]): NormalizedSermonState {
	const sermonsById: Record<string, Sermon> = {};
	const sermonsAllIds: string[] = [];
	const booksByIndex: Record<number, NormalizedBook> = {};
	const booksByName: Record<string, number> = {};
	const seriesByName: Record<string, string[]> = {};
	const preachersByName: Record<string, string[]> = {};

	// Книги, которые не удалось сопоставить с `BIBLE_BOOK_INDEXES`, получают новые индексы "поверх" известных
	const extrasIndex = new Map<string, number>();
	const maxCanonicalIndex = Math.max(...Object.values(BIBLE_BOOK_INDEXES));
	let nextExtraIndex = maxCanonicalIndex + 1;

	for (const sermon of sermons) {
		// Всегда сохраняем проповедь в общую таблицу
		sermonsById[sermon.id] = sermon;
		sermonsAllIds.push(sermon.id);

		const bookName = sermon.book;

		// Книга не указана — пропускаем только индексацию по книгам
		if (!bookName) {
			continue;
		}

		// Определяем индекс книги: либо из `BIBLE_BOOK_INDEXES`, либо создаём новый (для несовпадающих названий)
		let bookIdx = getBookIndex(bookName);
		if (!bookIdx) {
			if (!extrasIndex.has(bookName)) {
				extrasIndex.set(bookName, nextExtraIndex++);
			}
			bookIdx = extrasIndex.get(bookName);
		}

		// Если индекс не получился — пропускаем индексацию по книгам
		if (!bookIdx) {
			continue;
		}

		const existing = booksByIndex[bookIdx];
		if (!existing) {
			booksByIndex[bookIdx] = {
				name: bookName,
				sermonIds: [sermon.id],
				byChapter: {},
			};
			booksByName[bookName] = bookIdx;
		} else {
			existing.sermonIds.push(sermon.id);
		}

		// Серии
		if (sermon.series) {
			if (!seriesByName[sermon.series]) {
				seriesByName[sermon.series] = [];
			}
			seriesByName[sermon.series]!.push(sermon.id);
		}

		// Проповедники (по имени)
		if (sermon.preacher) {
			const key = sermon.preacher.trim();
			if (!preachersByName[key]) {
				preachersByName[key] = [];
			}
			preachersByName[key]!.push(sermon.id);
		}

		// Главы внутри книги
		if (sermon.chapter && booksByIndex[bookIdx]) {
			const bookRec = booksByIndex[bookIdx]!;
			const chapterList = bookRec.byChapter[sermon.chapter] || [];
			chapterList.push(sermon.id);
			bookRec.byChapter[sermon.chapter] = chapterList;
		}
	}

	// Сортируем книги: сначала по известному порядку (`BIBLE_BOOK_INDEXES`), затем по имени для остальных
	const idxToName: Record<number, string | undefined> = {};
	Object.entries(booksByIndex).forEach(([idxStr, book]) => {
		const idx = Number(idxStr);
		if (!idxToName[idx]) {
			idxToName[idx] = book.name;
		}
	});

	// Получаем порядок книг из объекта (сортируем по индексам)
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
			allNames: Object.keys(seriesByName).sort(),
		},
		preachers: {
			byName: preachersByName,
			allNames: Object.keys(preachersByName).sort(),
		},
	};
}


/**
 * Возвращает список книг, отсортированных по порядку из `BIBLE_BOOK_INDEXES`,
 * а книги без сопоставления — в конце по алфавиту (по исходным названиям из БД).
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

	// Получаем порядок книг из объекта (сортируем по индексам)
	const canonicalBooks = Object.keys(BIBLE_BOOK_INDEXES).sort(
		(a, b) => BIBLE_BOOK_INDEXES[a]! - BIBLE_BOOK_INDEXES[b]!
	);

	const booksInOrder: string[] = [];
	for (const canonical of canonicalBooks) {
		const idx = BIBLE_BOOK_INDEXES[canonical];
		const name = idx ? idxToName[idx] : undefined;
		if (name) {
			booksInOrder.push(name);
		}
	}

	const booksNotInList = Array.from(new Set(extras)).sort();
	return [...booksInOrder, ...booksNotInList];
}
