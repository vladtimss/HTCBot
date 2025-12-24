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
import { escapeMdV2, escapeUrlV2 } from "../../utils/text";
import {
	getAllSermonsWithSomeMedia,
	getPreacherNameById,
	findValidPreacherId,
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
 * 
 * Формат каждой проповеди:
 * 1. 📌 Название
 * 2. 📖 Текст проповеди
 * 3. 📅 дата - Имя автора
 * 4. 🎧 Слушайте проповедь
 * 5. 🎵 Яндекс (ссылка)
 */
export async function formatSermonList(sermons: Sermon[], preachersById: Record<string, string>): Promise<string> {
	if (sermons.length === 0) {
		return SERMONS_TEXTS.notFoundInBook;
	}

	let text = "";

	for (let i = 0; i < sermons.length; i++) {
		const sermon = sermons[i];
		// Получаем проповедника: сначала из sermon.preacher, затем из кэша по ID
		const preacher = sermon.preacher || (sermon.preacherId ? preachersById[sermon.preacherId] : undefined);
		
		// Отладочный вывод для диагностики
		if (sermon.preacherId && !preacher) {
			console.log(`[sermons] Проповедник не найден для проповеди "${sermon.title}":`, {
				preacherId: sermon.preacherId,
				hasPreacherInSermon: !!sermon.preacher,
				hasPreacherInCache: !!preachersById[sermon.preacherId],
				cacheKeys: Object.keys(preachersById),
			});
		}

		// 1. Иконка + Название (жирным)
		const title = escapeMdV2(sermon.title || SERMONS_TEXTS.fields.defaultTitle);
		text += `✨ *${title}*\n\n`;

		// 2. Иконка с Библией/книгой + Текст проповеди
		if (sermon.sermonText) {
			text += `📖 ${escapeMdV2(sermon.sermonText)}\n`;
		}

		// 3. Иконка даты/автора + дата - Имя и Фамилия автора
		const formattedDate = formatDate(sermon.date);
		if (formattedDate || preacher) {
			const datePart = formattedDate ? escapeMdV2(formattedDate) : "";
			const preacherPart = preacher ? escapeMdV2(preacher) : "";
			
			// Всегда показываем дату и проповедника вместе, если оба есть
			if (datePart && preacherPart) {
				text += `📅 ${datePart} \\- ${preacherPart}\n\n`;
			} else if (datePart) {
				// Если есть только дата, показываем её
				text += `📅 ${datePart}\n\n`;
			} else if (preacherPart) {
				// Если есть только проповедник, показываем его
				text += `📅 ${preacherPart}\n\n`;
			}
		}

		// 4. Иконка подкастов + "Слушайте проповедь" (жирным)
		// Показываем только если есть хотя бы одна платформа
		const hasAnyMedia = sermon.media.yandex || sermon.media.youtube || sermon.media.vk || sermon.media.podster_fm;
		if (hasAnyMedia) {
			text += `🎧 *Слушайте проповедь*\n`;
		}

		// 5. Иконка Яндекс + Яндекс (ссылка)
		if (sermon.media.yandex) {
			const url = escapeUrlV2(sermon.media.yandex);
			const linkText = escapeMdV2("Яндекс");
			text += `🎵 [${linkText}](${url})\n`;
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

	// Для каждой проповеди проверяем всех проповедников
	for (const sermon of sermons) {
		// Если проповедник уже есть в sermon.preacher, используем его
		if (sermon.preacher) {
			// Если есть preacherId, сохраняем его в кэш для будущего использования
			if (sermon.preacherId && !preachersById[sermon.preacherId]) {
				preachersById[sermon.preacherId] = sermon.preacher;
			}
			continue;
		}

		// Если проповедника нет, проверяем все relation IDs
		const idsToCheck = sermon.preacherIds && sermon.preacherIds.length > 0 
			? sermon.preacherIds 
			: (sermon.preacherId ? [sermon.preacherId] : []);

		if (idsToCheck.length === 0) {
			continue;
		}

		// Сначала проверяем кэш - может быть один из IDs уже загружен
		let foundInCache = false;
		for (const id of idsToCheck) {
			if (preachersById[id]) {
				// Нашли в кэше, обновляем preacherId в sermon
				(sermon as any).preacherId = id;
				foundInCache = true;
				break;
			}
		}

		if (foundInCache) {
			continue;
		}

		// Если не нашли в кэше, проверяем все IDs и находим правильный
		const validId = await findValidPreacherId(idsToCheck);
		if (validId) {
			const name = await getPreacherNameById(validId);
			if (name) {
				preachersById[validId] = name;
				// Обновляем preacherId в sermon для будущего использования
				(sermon as any).preacherId = validId;
			} else {
				// Логируем, если не удалось загрузить проповедника
				console.log(`[sermons] Не удалось загрузить проповедника для проповеди "${sermon.title}", проверены IDs:`, idsToCheck);
			}
		}
	}

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

