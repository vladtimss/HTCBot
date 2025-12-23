import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { env } from "../../config/env";
import { replySermonsMenu, inlineBibleBooksMenu } from "./sermons.keyboard";
import { MENU_LABELS } from "../../constants/button-lables";
import { SERMONS_TEXTS } from "./sermons.texts";
import { SERMONS_BUTTON_LABELS, SERMONS_INLINE_LABELS } from "./sermons.constants";
import { COMMON } from "../../services/texts";
import { fmt } from "@grammyjs/parse-mode";
import { replyFormatted } from "../../utils/format-helpers";
import { escapeMdV2 } from "../../utils/text";
import {
	getAllSermonsWithSomeMedia,
	getPreacherNameById,
	buildNormalizedSermonState,
	NormalizedSermonState,
} from "./sermons.util";
import { withProgressMessages } from "../../utils/loading";
import { Sermon } from "../../types/buildin";

/** Рендер корня раздела «Проповеди» и сброс состояния раздела. */
export async function renderSermonsRoot(ctx: MyContext) {
	ctx.session.menuStack = ["sermons"];
	ctx.session.lastSection = "sermons";
	ctx.session.sermonsState = undefined;
	ctx.session.preachersById = undefined;

	const text = fmt`${SERMONS_TEXTS.title}

${COMMON.useButtonBelow}`;

	await replyFormatted(ctx, text, {
		reply_markup: replySermonsMenu,
	});
}

/** Форматирует дату проповеди к виду ДД.ММ.ГГГГ. */
function formatDate(dateStr: string | undefined): string | undefined {
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

/** Формирует текстовый список проповедей для выбранной книги. */
async function formatSermonList(sermons: Sermon[], preachersById: Record<string, string>) {
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
 * Гарантирует наличие нормализованных проповедей в сессии.
 * Если данных нет (например, клик по старой инлайн-кнопке), загружает их заново.
 */
async function ensureSermonsState(ctx: MyContext): Promise<NormalizedSermonState | undefined> {
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

/** Регистрирует все хендлеры раздела «Проповеди». */
export function registerSermons(bot: Bot<MyContext>) {
	bot.hears(MENU_LABELS.MAIN_SERMONS, async (ctx) => {
		await renderSermonsRoot(ctx);
	});

	bot.hears(SERMONS_BUTTON_LABELS.SERMONS_PODCASTS, async (ctx) => {
		const podcastsText = SERMONS_TEXTS.podcasts(env.SERMONS_YANDEX_URL, env.SERMONS_PODSTER_URL);
		await replyFormatted(ctx, podcastsText, {
			link_preview_options: { is_disabled: true },
			reply_markup: replySermonsMenu,
		});
	});

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

	bot.callbackQuery(/^sermons:book:(\d+)$/, async (ctx) => {
		const bookIndex = parseInt(ctx.match[1], 10);
		await ctx.answerCallbackQuery();

		const state = await ensureSermonsState(ctx);
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

			const sortedSermons = sermonsByBook
				.slice()
				.sort((a: Sermon, b: Sermon) => {
					if (a.chapter && b.chapter) {
						return a.chapter - b.chapter;
					}
					if (a.date && b.date) {
						return new Date(a.date.replace(/\//g, "-")).getTime() - new Date(b.date.replace(/\//g, "-")).getTime();
					}
					return 0;
				});

			// Кеш проповедников в сессии (переиспользуем между книгами)
			const preachersById = ctx.session.preachersById ?? (ctx.session.preachersById = {});
			const missingPreachers = new Set<string>();

			for (const s of sortedSermons) {
				if (!s.preacher && s.preacherId && !preachersById[s.preacherId]) {
					missingPreachers.add(s.preacherId);
				}
			}

			if (missingPreachers.size > 0) {
				await Promise.all(
					Array.from(missingPreachers).map(async (id: string) => {
						const name = await getPreacherNameById(id);
						if (name) {
							preachersById[id] = name;
						}
					})
				);
			}

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
