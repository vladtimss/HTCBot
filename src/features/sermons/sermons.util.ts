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
 * Проверяет, есть ли у записи хотя бы одно валидное медиа-поле
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
