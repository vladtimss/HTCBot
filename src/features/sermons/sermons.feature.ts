import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { env } from "../../config/env";
import { replySermonsMenu, inlineBibleBooksMenu } from "./sermons.keyboard";
import { MENU_LABELS } from "../../constants/button-lables";
import { SERMONS_TEXTS } from "./sermons.texts";
import { SERMONS_BUTTON_LABELS } from "./sermons.constants";
import { COMMON } from "../../services/texts";
import { fmt } from "@grammyjs/parse-mode";
import { replyFormatted } from "../../utils/format-helpers";
import { getAllSermonsWithSomeMedia, buildNormalizedSermonState } from "./sermons.util";
import { withProgressMessages } from "../../utils/loading";
import { Sermon } from "../../types/buildin";
import { formatSermonList, generateSermonsState, generatePreachersCache, sortSermons } from "./sermons.helpers";

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
 * Регистрирует все хендлеры раздела «Проповеди»:
 * - вход в раздел
 * - подкасты
 * - поиск по книгам
 * - выбор книги по inline-кнопке
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
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`[sermons] Ошибка получения проповедей:`, errorMessage);
			await ctx.reply(`❌ Ошибка при загрузке проповедей: ${errorMessage}`);
		}
	});

	/**
	 * Обработка выбора книги из inline-списка:
	 * - гарантирует наличие состояния проповедей
	 * - находит все проповеди по выбранной книге
	 * - подгружает недостающие имена проповедников
	 * - выводит отформатированный список проповедей
	 */
	bot.callbackQuery(/^sermons:book:(\d+)$/, async (ctx) => {
		const bookIndex = parseInt(ctx.match[1], 10);
		await ctx.answerCallbackQuery();

		const state = await generateSermonsState(ctx);
		if (!state) return;

		const books = state.books.allNames;
		const book = books[bookIndex];

		if (!book) {
			await ctx.reply(SERMONS_TEXTS.bookNotFound);
			return;
		}

		// Явно показываем сообщение о подготовке списка и гарантированно его удаляем
		const loadingMsg = await ctx.reply(SERMONS_TEXTS.prepareBookList, {
			link_preview_options: { is_disabled: true },
		});

		try {
			const bookIdx = state.books.byName[book];
			const bookRec = bookIdx ? state.books.byIndex[bookIdx] : undefined;
			const sermonIds = bookRec?.sermonIds ?? [];
			const sermonsByBook: Sermon[] = sermonIds.map((id) => state.sermons.byId[id]!);
			const sortedSermons = sortSermons(sermonsByBook);

			const preachersById = await generatePreachersCache(ctx, sortedSermons);

			const text = await formatSermonList(sortedSermons, preachersById);

			await ctx.reply(text, {
				parse_mode: "MarkdownV2",
				link_preview_options: { is_disabled: true },
				reply_markup: inlineBibleBooksMenu(books),
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`[sermons] Ошибка получения проповедей для книги ${book}:`, errorMessage);
			await ctx.reply(`❌ Ошибка при загрузке проповедей: ${errorMessage}`);
		} finally {
			try {
				await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);
			} catch {
				// Игнорируем ошибки удаления
			}
		}
	});
}
