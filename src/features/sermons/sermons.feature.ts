import { Bot }                                                    from "grammy";
import { MyContext }                                              from "../../types/grammy-context";
import { env }                                                    from "../../config/env";
import {
	inlineBibleBooksMenu,
	inlineBooksBackMenu,
	inlineChaptersBackMenu,
	inlineChaptersMenu,
	inlineSeriesBackMenu,
	inlineSeriesMenu,
	replySermonsMenu
}                                                                 from "./sermons.keyboard";
import { MENU_LABELS }                                            from "../../constants/button-lables";
import { SERMONS_TEXTS }                                          from "./sermons.texts";
import { SERMONS_BUTTON_LABELS }                                  from "./sermons.constants";
import { COMMON }                                                 from "../../services/texts";
import { fmt }                                                    from "@grammyjs/parse-mode";
import { replyFormatted }                                         from "../../utils/format-helpers";
import { buildNormalizedSermonState, getAllSermonsWithSomeMedia } from "./sermons.util";
import { withLoading, withProgressMessages }                      from "../../utils/loading";
import {
	formatSermonList,
	generatePreachersCache,
	generateSermonsState,
	getBookByIndex,
	getChaptersFromBook,
	getSermonsByBookAndChapter,
	getSermonsBySeries,
	getValidSeries,
	sortSermons,
	handleSermonsError,
}                                                                 from "./sermons.helpers";

/**
 * Рендерит корень раздела «Проповеди»:
 * - сбрасывает состояние раздела в сессии
 * - показывает вступительный текст и клавиатуру раздела
 */
export async function renderSermonsRoot(ctx: MyContext) {
	ctx.session.menuStack = ["sermons"];
	ctx.session.lastSection = "sermons";
	ctx.session.sermonsState = undefined;
	ctx.session.preachersById = undefined;

	const text = fmt`${SERMONS_TEXTS.title}${COMMON.useButtonBelow}`;

	await replyFormatted(ctx, text, {
		reply_markup: replySermonsMenu,
	});
}

/**
 * Показывает список серий проповедей.
 * Используется при входе в раздел серий и при возврате к списку серий.
 */
async function renderSeriesList(ctx: MyContext) {
	const state = await generateSermonsState(ctx);
	if (!state) return;

	const validSeries = getValidSeries(state);

	if (validSeries.length === 0) {
		await ctx.reply(SERMONS_TEXTS.noSeriesFound);
		return;
	}

	const text = fmt`${SERMONS_TEXTS.selectSeriesTitle}${COMMON.useButtonBelow}`;

	await replyFormatted(ctx, text, {
		reply_markup: inlineSeriesMenu(validSeries),
	});
}

/**
 * Обрабатывает выбор книги: показывает либо список глав, либо все проповеди книги.
 */
async function handleBookSelection(ctx: MyContext, bookIndex: number) {
	const state = await generateSermonsState(ctx);
	if (!state) return;

	const bookData = getBookByIndex(state, bookIndex);
	if (!bookData) {
		await ctx.reply(SERMONS_TEXTS.bookNotFound);
		return;
	}

	const { book, bookRec } = bookData;
	const chapters = getChaptersFromBook(bookRec);

	if (chapters.length === 0) {
		// Если глав нет, показываем все проповеди книги
		const sermonsByBook = getSermonsByBookAndChapter(state, bookRec);
		const sortedSermons = sortSermons(sermonsByBook);
		const preachersById = await generatePreachersCache(ctx, sortedSermons);
		const text = await formatSermonList(sortedSermons, preachersById);

		await ctx.reply(text, {
			parse_mode: "MarkdownV2",
			link_preview_options: { is_disabled: true },
			reply_markup: inlineBooksBackMenu(),
		});
	} else {
		// Показываем список глав
		const chapterTitle = SERMONS_TEXTS.selectChapterTitle(book);
		const text = fmt`${chapterTitle}${COMMON.useButtonBelow}`;
		await replyFormatted(ctx, text, {
			reply_markup: inlineChaptersMenu(chapters, bookIndex),
		});
	}
}

/**
 * Обрабатывает выбор серии: показывает список проповедей серии.
 */
async function handleSeriesSelection(ctx: MyContext, seriesName: string) {
	const state = await generateSermonsState(ctx);
	if (!state) return;

	const sermonsBySeries = getSermonsBySeries(state, seriesName);
	const sortedSermons = sortSermons(sermonsBySeries);

	if (sortedSermons.length === 0) {
		await ctx.reply(SERMONS_TEXTS.notFoundInSeries, {
			link_preview_options: { is_disabled: true },
			reply_markup: inlineSeriesBackMenu(),
		});
		return;
	}

	const preachersById = await generatePreachersCache(ctx, sortedSermons);
	const text = await formatSermonList(sortedSermons, preachersById);

	await ctx.reply(text, {
		parse_mode: "MarkdownV2",
		link_preview_options: { is_disabled: true },
		reply_markup: inlineSeriesBackMenu(),
	});
}

/**
 * Обрабатывает выбор главы: показывает список проповедей главы.
 */
async function handleChapterSelection(ctx: MyContext, bookIndex: number, chapterNumber: number) {
	const state = await generateSermonsState(ctx);
	if (!state) return;

	const bookData = getBookByIndex(state, bookIndex);
	if (!bookData) {
		await ctx.reply(SERMONS_TEXTS.bookNotFound);
		return;
	}

	const { bookRec } = bookData;
	const sermonsByChapter = getSermonsByBookAndChapter(state, bookRec, chapterNumber);
	const sortedSermons = sortSermons(sermonsByChapter);

	if (sortedSermons.length === 0) {
		const chapters = getChaptersFromBook(bookRec);
		await ctx.reply(SERMONS_TEXTS.notFoundInBook, {
			link_preview_options: { is_disabled: true },
			reply_markup: inlineChaptersMenu(chapters, bookIndex),
		});
		return;
	}

	const preachersById = await generatePreachersCache(ctx, sortedSermons);
	const text = await formatSermonList(sortedSermons, preachersById);
	const chapters = getChaptersFromBook(bookRec);

	await ctx.reply(text, {
		parse_mode: "MarkdownV2",
		link_preview_options: { is_disabled: true },
		reply_markup: inlineChaptersBackMenu(chapters, bookIndex),
	});
}

/**
 * Регистрирует все хендлеры раздела «Проповеди»:
 * - вход в раздел
 * - подкасты
 * - поиск по книгам
 * - выбор книги по inline-кнопке
 * - поиск по сериям
 * - выбор серии по inline-кнопке
 */
export function registerSermons(bot: Bot<MyContext>) {
	/**
	 * Вход в раздел «Проповеди» из главного меню.
	 */
	bot.hears(MENU_LABELS.MAIN_SERMONS, async (ctx) => {
		await renderSermonsRoot(ctx);
	});

	/**
	 * Показ информации о подкастах с проповедями.
	 */
	bot.hears(SERMONS_BUTTON_LABELS.SERMONS_PODCASTS, async (ctx) => {
		const podcastsText = SERMONS_TEXTS.podcasts(env.SERMONS_YANDEX_URL, env.SERMONS_PODSTER_URL);
		await replyFormatted(ctx, podcastsText, {
			link_preview_options: { is_disabled: true },
			reply_markup: replySermonsMenu,
		});
	});

	/**
	 * Вход в режим поиска проповедей по книгам Библии.
	 * Загружает и нормализует все проповеди, затем показывает список книг.
	 */
	bot.hears(SERMONS_BUTTON_LABELS.SERMONS_BY_BOOK, async (ctx) => {
		ctx.session.menuStack.push("sermons-books");
		ctx.session.lastSection = "sermons-books";

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

			ctx.session.sermonsState = buildNormalizedSermonState(sermons);

			const books = ctx.session.sermonsState?.books.allNames || [];

			const text = fmt`${SERMONS_TEXTS.selectBookTitle}${COMMON.useButtonBelow}`;

			await replyFormatted(ctx, text, {
				reply_markup: inlineBibleBooksMenu(books),
			});
		} catch (error) {
			await handleSermonsError(ctx, error, SERMONS_TEXTS.errorLoadingSermons, "Ошибка получения проповедей");
		}
	});

	/**
	 * Обработка выбора книги из inline-списка:
	 * - гарантирует наличие состояния проповедей
	 * - находит все главы по выбранной книге
	 * - показывает inline-клавиатуру с главами (4 в строку)
	 */
	bot.callbackQuery(/^sermons:book:(\d+)$/, async (ctx) => {
		const bookIndex = parseInt(ctx.match[1], 10);
		await ctx.answerCallbackQuery();

		try {
			await handleBookSelection(ctx, bookIndex);
		} catch (error) {
			await handleSermonsError(ctx, error, SERMONS_TEXTS.errorLoadingChapters, "Ошибка обработки выбора книги");
		}
	});

	/**
	 * Обработка возврата к списку книг.
	 */
	bot.callbackQuery(/^sermons:books$/, async (ctx) => {
		await ctx.answerCallbackQuery();

		const state = await generateSermonsState(ctx);
		if (!state) return;

		const books = state.books.allNames || [];
		const text = fmt`${SERMONS_TEXTS.selectBookTitle}${COMMON.useButtonBelow}`;

		await replyFormatted(ctx, text, {
			reply_markup: inlineBibleBooksMenu(books),
		});
	});

	/**
	 * Вход в режим поиска проповедей по сериям.
	 * Загружает и нормализует все проповеди, затем показывает список серий (исключая пустые и "НЕТ").
	 */
	bot.hears(SERMONS_BUTTON_LABELS.SERMONS_BY_SERIES, async (ctx) => {
		ctx.session.menuStack.push("sermons-series");
		ctx.session.lastSection = "sermons-series";

		try {
			await renderSeriesList(ctx);
		} catch (error) {
			await handleSermonsError(ctx, error, SERMONS_TEXTS.errorLoadingSeries, "Ошибка получения серий");
		}
	});

	/**
	 * Обработка выбора серии из inline-списка:
	 * - гарантирует наличие состояния проповедей
	 * - находит все проповеди по выбранной серии
	 * - подгружает недостающие имена проповедников
	 * - выводит отформатированный список проповедей
	 */
	bot.callbackQuery(/^sermons:series:(\d+)$/, async (ctx) => {
		const seriesIndex = parseInt(ctx.match[1], 10);
		await ctx.answerCallbackQuery();

		const state = await generateSermonsState(ctx);
		if (!state) return;

		const validSeries = getValidSeries(state);
		const seriesName = validSeries[seriesIndex];

		if (!seriesName) {
			await ctx.reply(SERMONS_TEXTS.seriesNotFound);
			return;
		}

		// Используем withLoading с задержкой - сообщение покажется только если операция длится дольше 500ms
		await withLoading(
			ctx,
			async () => {
				await handleSeriesSelection(ctx, seriesName);
			},
			{
				text: SERMONS_TEXTS.prepareBookList,
				delayMs: 500,
			}
		).catch(async (error) => {
			await handleSermonsError(ctx, error, SERMONS_TEXTS.errorLoadingSermons, `Ошибка получения проповедей для серии ${seriesName}`);
		});
	});

	/**
	 * Обработка возврата к списку серий.
	 */
	bot.callbackQuery(/^sermons:series:back$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		await renderSeriesList(ctx);
	});

	/**
	 * Обработка выбора главы из inline-списка:
	 * - гарантирует наличие состояния проповедей
	 * - находит все проповеди по выбранной книге и главе
	 * - подгружает недостающие имена проповедников
	 * - выводит отформатированный список проповедей
	 */
	bot.callbackQuery(/^sermons:book:(\d+):chapter:(\d+)$/, async (ctx) => {
		const bookIndex = parseInt(ctx.match[1], 10);
		const chapterNumber = parseInt(ctx.match[2], 10);
		await ctx.answerCallbackQuery();

		const state = await generateSermonsState(ctx);
		if (!state) return;

		const bookData = getBookByIndex(state, bookIndex);
		if (!bookData) {
			await ctx.reply(SERMONS_TEXTS.bookNotFound);
			return;
		}

		// Используем withLoading с задержкой - сообщение покажется только если операция длится дольше 500ms
		await withLoading(
			ctx,
			async () => {
				await handleChapterSelection(ctx, bookIndex, chapterNumber);
			},
			{
				text: SERMONS_TEXTS.prepareBookList,
				delayMs: 500,
			}
		).catch(async (error) => {
			await handleSermonsError(ctx, error, SERMONS_TEXTS.errorLoadingSermons, `Ошибка получения проповедей для главы ${chapterNumber}`);
		});
	});
}
