/**
 * features/sermons/sermons.helpers.ts
 * --------------------------
 * Вспомогательные функции для раздела "Проповеди":
 * - форматирование данных для отображения
 * - генерация состояния в сессии
 * - работа с кешем проповедников
 */

import { MyContext } from "../../types/grammy-context";
import { SERMONS_TEXTS } from "./sermons.texts";
import { escapeMdV2 } from "../../utils/text";
import {
	getAllSermonsWithSomeMedia,
	getPreacherNameById,
	buildNormalizedSermonState,
	NormalizedSermonState,
	NormalizedBook,
} from "./sermons.util";
import { withProgressMessages } from "../../utils/loading";
import { Sermon } from "../../types/buildin";

/**
 * Пробует распарсить дату и отформатировать её к виду ДД.ММ.ГГГГ.
 * Если дата некорректна — возвращает undefined.
 */
export function formatDate(dateStr: string | undefined): string | undefined {
	if (!dateStr) return undefined;

	try {
		const normalized = dateStr.replace(/\//g, "-");
		const date = new Date(normalized);
		if (isNaN(date.getTime())) {
			return undefined;
		}
		return date.toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	} catch {
		return undefined;
	}
}

/**
 * Формирует текстовый список проповедей для выбранной книги,
 * используя кеш имён проповедников из `preachersById`.
 */
export async function formatSermonList(sermons: Sermon[], preachersById: Record<string, string>): Promise<string> {
	if (sermons.length === 0) {
		return SERMONS_TEXTS.notFoundInBook;
	}

	let text = `📖 Найдено проповедей: ${sermons.length}\n\n`;

	for (let i = 0; i < sermons.length; i++) {
		const sermon = sermons[i];
		const preacher = sermon.preacher || (sermon.preacherId ? preachersById[sermon.preacherId] : undefined);

		text += `${SERMONS_TEXTS.fields.title}: ${escapeMdV2(sermon.title || SERMONS_TEXTS.fields.defaultTitle)}\n`;
		
		if (sermon.chapter) {
			text += `${SERMONS_TEXTS.fields.chapter}: ${sermon.chapter}\n`;
		}
		
		const formattedDate = formatDate(sermon.date);
		if (formattedDate) {
			text += `${SERMONS_TEXTS.fields.date}: ${escapeMdV2(formattedDate)}\n`;
		}
		
		if (preacher) {
			text += `${SERMONS_TEXTS.fields.preacher}: ${escapeMdV2(preacher)}\n`;
		}
		
		if (sermon.series) {
			text += `${SERMONS_TEXTS.fields.series}: ${escapeMdV2(sermon.series)}\n`;
		}

		if (sermon.sermonText) {
			const textPreview = sermon.sermonText.length > 100 
				? sermon.sermonText.substring(0, 100) + "..." 
				: sermon.sermonText;
			text += `${SERMONS_TEXTS.fields.text}: ${escapeMdV2(textPreview)}\n`;
		}
		
		const platforms: string[] = [];
		if (sermon.media.yandex) {
			const url = escapeMdV2(sermon.media.yandex);
			platforms.push(`${SERMONS_TEXTS.platforms.yandex} \\- ${url}`);
		}
		if (sermon.media.youtube) {
			const url = escapeMdV2(sermon.media.youtube);
			platforms.push(`${SERMONS_TEXTS.platforms.youtube} \\- ${url}`);
		}
		if (sermon.media.vk) {
			const url = escapeMdV2(sermon.media.vk);
			platforms.push(`${SERMONS_TEXTS.platforms.vk} \\- ${url}`);
		}
		if (sermon.media.podster_fm) {
			const url = escapeMdV2(sermon.media.podster_fm);
			platforms.push(`${SERMONS_TEXTS.platforms.podster} \\- ${url}`);
		}
		
		if (platforms.length > 0) {
			text += `${SERMONS_TEXTS.fields.platforms}:\n${platforms.map(p => `  ${p}`).join("\n")}\n`;
		}
		
		text += "\n";
	}

	return text;
}

/**
 * Сортирует проповеди:
 * - сначала по главе (если у обеих есть номер главы)
 * - затем по дате (если у обеих есть дата)
 * - иначе — сохраняет относительный порядок
 */
export function sortSermons(sermons: Sermon[]): Sermon[] {
	return sermons.slice().sort((a: Sermon, b: Sermon) => {
		if (a.chapter && b.chapter) {
			return a.chapter - b.chapter;
		}
		if (a.date && b.date) {
			return new Date(a.date.replace(/\//g, "-")).getTime() - new Date(b.date.replace(/\//g, "-")).getTime();
		}
		return 0;
	});
}

/**
 * Строит (или пересобирает) нормализованное состояние проповедей в сессии.
 * Если в сессии уже есть данные — возвращает их, иначе загружает заново.
 */
export async function generateSermonsState(ctx: MyContext): Promise<NormalizedSermonState | undefined> {
	if (ctx.session.sermonsState) {
		return ctx.session.sermonsState;
	}

	try {
		const { result: sermons } = await withProgressMessages(
			ctx,
			() => getAllSermonsWithSomeMedia(),
			{
				firstMessageText: SERMONS_TEXTS.progressFirst,
				secondMessageText: SERMONS_TEXTS.progressSecond.replace(/\./g, "\\."),
				parseMode: "MarkdownV2",
			}
		);

		if (sermons.length === 0) {
			await ctx.reply(SERMONS_TEXTS.noMediaFound);
			return;
		}

		const state = buildNormalizedSermonState(sermons);
		ctx.session.sermonsState = state;
		return state;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`[sermons] Ошибка повторной загрузки проповедей:`, errorMessage);
		await ctx.reply(`${SERMONS_TEXTS.errorPrefix} ${escapeMdV2(errorMessage)}`, {
			parse_mode: "MarkdownV2",
			link_preview_options: { is_disabled: true },
		});
		return;
	}
}

/**
 * Строит/обновляет кеш проповедников в сессии и,
 * при необходимости, догружает имена для проповедей из списка.
 */
export async function generatePreachersCache(ctx: MyContext, sermons: Sermon[]): Promise<Record<string, string>> {
	const preachersById = ctx.session.preachersById ?? (ctx.session.preachersById = {});
	const missingPreachers = new Set<string>();

	for (const sermon of sermons) {
		if (!sermon.preacher && sermon.preacherId && !preachersById[sermon.preacherId]) {
			missingPreachers.add(sermon.preacherId);
		}
	}

	if (missingPreachers.size === 0) {
		return preachersById;
	}

	await Promise.all(
		Array.from(missingPreachers).map(async (id: string) => {
			const name = await getPreacherNameById(id);
			if (name) {
				preachersById[id] = name;
			}
		})
	);

	return preachersById;
}

/**
 * Получает объект книги (NormalizedBook) по индексу книги в списке.
 * Возвращает undefined, если книга не найдена.
 */
export function getBookByIndex(
	state: NormalizedSermonState,
	bookIndex: number
): { book: string; bookRec: NormalizedBook } | undefined {
	const books = state.books.allNames;
	const book = books[bookIndex];

	if (!book) {
		return undefined;
	}

	const bookIdx = state.books.byName[book];
	const bookRec = bookIdx ? state.books.byIndex[bookIdx] : undefined;

	if (!bookRec) {
		return undefined;
	}

	return { book, bookRec };
}

/**
 * Извлекает список глав из объекта книги (NormalizedBook).
 * Возвращает отсортированный массив номеров глав.
 */
export function getChaptersFromBook(bookRec: NormalizedBook): number[] {
	return Object.keys(bookRec.byChapter)
		.map((ch) => parseInt(ch, 10))
		.filter((ch) => !isNaN(ch))
		.sort((a, b) => a - b);
}

/**
 * Получает список проповедей для книги и опционально для конкретной главы.
 * Если chapterNumber не указан, возвращает все проповеди книги.
 */
export function getSermonsByBookAndChapter(
	state: NormalizedSermonState,
	bookRec: NormalizedBook,
	chapterNumber?: number
): Sermon[] {
	let sermonIds: string[];

	if (chapterNumber !== undefined) {
		// Получаем проповеди для конкретной главы
		sermonIds = bookRec.byChapter[chapterNumber] ?? [];
	} else {
		// Получаем все проповеди книги
		sermonIds = bookRec.sermonIds ?? [];
	}

	return sermonIds.map((id) => state.sermons.byId[id]!).filter((sermon) => sermon !== undefined);
}

