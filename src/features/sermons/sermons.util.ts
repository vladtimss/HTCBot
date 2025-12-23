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
				const titleProperty = page.properties?.title as BuildinTitleProperty | undefined;
				const titleField = titleProperty?.title?.[0];
				const title =
					titleField?.plain_text ||
					titleField?.text?.content ||
					undefined;

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

	const yandexProperty = properties[SERMON_FIELDS.MEDIA_YANDEX] as BuildinUrlProperty | undefined;
	const youtubeProperty = properties[SERMON_FIELDS.MEDIA_YOUTUBE] as BuildinUrlProperty | undefined;
	const vkProperty = properties[SERMON_FIELDS.MEDIA_VK] as BuildinUrlProperty | undefined;
	const podsterProperty = properties[SERMON_FIELDS.MEDIA_PODSTER] as BuildinUrlProperty | undefined;

	const yandexUrl = yandexProperty?.url ?? null;
	const youtubeUrl = youtubeProperty?.url ?? null;
	const vkUrl = vkProperty?.url ?? null;
	const podsterUrl = podsterProperty?.url ?? null;

	const media: SermonMedia = {
		yandex: isValidUrl(yandexUrl) ? (yandexUrl || undefined) : undefined,
		youtube: isValidUrl(youtubeUrl) ? (youtubeUrl || undefined) : undefined,
		vk: isValidUrl(vkUrl) ? (vkUrl || undefined) : undefined,
		podster_fm: isValidUrl(podsterUrl) ? (podsterUrl || undefined) : undefined,
	};

	const titleProperty = properties[SERMON_FIELDS.TITLE] as BuildinTitleProperty | undefined;
	const title = titleProperty?.title?.[0]?.plain_text || titleProperty?.title?.[0]?.text?.content;

	const bookProperty = properties[SERMON_FIELDS.BOOK] as BuildinMultiSelectProperty | undefined;
	const book = bookProperty?.multi_select?.[0]?.name;

	const sermonTextProperty = properties[SERMON_FIELDS.SERMON_TEXT] as BuildinRichTextProperty | undefined;
	const sermonText = sermonTextProperty?.rich_text?.[0]?.plain_text || sermonTextProperty?.rich_text?.[0]?.text?.content;

	const seriesProperty = properties[SERMON_FIELDS.SERIES] as BuildinSelectProperty | undefined;
	const series = seriesProperty?.select?.name;

	const chapters = parseChapterFromText(sermonText);
	const chapter = chapters?.[0];

	const preacherField = properties[SERMON_FIELDS.PREACHER] as
		| BuildinSelectProperty
		| BuildinRichTextProperty
		| BuildinRelationProperty
		| undefined;

	let preacher: string | undefined;
	if (preacherField?.type === "select") {
		preacher = preacherField.select?.name;
	} else if (preacherField?.type === "rich_text") {
		preacher = preacherField.rich_text?.[0]?.plain_text || preacherField.rich_text?.[0]?.text?.content;
	}

	const dateProperty =
		(properties[SERMON_FIELDS.DATE] as BuildinDateProperty | undefined) ||
		(properties[SERMON_FIELDS.DATE_ALT] as BuildinDateProperty | undefined);
	const rawDate = dateProperty?.date?.start;
	const date = parseDate(rawDate);

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
		const yandexProperty = record.properties[SERMON_FIELDS.MEDIA_YANDEX] as BuildinUrlProperty | undefined;
		const youtubeProperty = record.properties[SERMON_FIELDS.MEDIA_YOUTUBE] as BuildinUrlProperty | undefined;
		const vkProperty = record.properties[SERMON_FIELDS.MEDIA_VK] as BuildinUrlProperty | undefined;
		const podsterProperty = record.properties[SERMON_FIELDS.MEDIA_PODSTER] as BuildinUrlProperty | undefined;

		const hasSomeMedia =
			(isValidUrl(yandexProperty?.url)) ||
			(isValidUrl(youtubeProperty?.url)) ||
			(isValidUrl(vkProperty?.url)) ||
			(isValidUrl(podsterProperty?.url));

		if (!hasSomeMedia) {
			continue;
		}

		const sermon = extractSermonProperties(record);
		sermons.push(sermon);
	}

	return sermons;
}
