import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { env } from "../../config/env";
import { replySermonsMenu, inlineBibleBooksMenu } from "./sermons.keyboard";
import { MENU_LABELS } from "../../constants/button-lables";
import { SERMONS_TEXTS } from "./sermons.texts";
import { SERMONS_BUTTON_LABELS, SERMONS_INLINE_LABELS, ALL_BIBLE_BOOKS } from "./sermons.constants";
import { COMMON } from "../../services/texts";
import { fmt, bold } from "@grammyjs/parse-mode";
import { replyFormatted } from "../../utils/format-helpers";
import { escapeMdV2 }                                  from "../../utils/text";
import { getAllSermonsWithSomeMedia, getPreacherName } from "./sermons.util";
import { withLoadingAndMsg, withLoading }              from "../../utils/loading";
import { BuildinRelationProperty, Sermon } from "../../types/buildin";

export async function renderSermonsRoot(ctx: MyContext) {
	ctx.session.menuStack = ["sermons"];
	ctx.session.lastSection = "sermons";
	ctx.session.sermons = undefined;

	const text = fmt`${SERMONS_TEXTS.title}

${COMMON.useButtonBelow}`;

	await replyFormatted(ctx, text, {
		reply_markup: replySermonsMenu,
	});
}

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

async function formatSermonList(sermons: Sermon[]) {
	if (sermons.length === 0) {
		return "❌ Проповеди по этой книге не найдены\\.";
	}

	const preacherPromises = sermons.map(async (sermon) => {
		if (sermon.preacher) {
			return sermon.preacher;
		}

		const preacherField = sermon.raw.properties["Проповедник"] as BuildinRelationProperty | undefined;
		if (preacherField?.type === "relation" && preacherField.relation.length > 0) {
			return await getPreacherName(preacherField);
		}

		return undefined;
	});

	const preachers = await Promise.all(preacherPromises);

	let text = `📖 Найдено проповедей: ${sermons.length}\n\n`;

	for (let i = 0; i < sermons.length; i++) {
		const sermon = sermons[i];
		const preacher = preachers[i] || sermon.preacher;

		text += `📌 Название: ${escapeMdV2(sermon.title || "Без названия")}\n`;
		
		if (sermon.chapter) {
			text += `📄 Глава: ${sermon.chapter}\n`;
		}
		
		const formattedDate = formatDate(sermon.date);
		if (formattedDate) {
			text += `📅 Дата: ${escapeMdV2(formattedDate)}\n`;
		}
		
		if (preacher) {
			text += `👤 Проповедник: ${escapeMdV2(preacher)}\n`;
		}
		
		if (sermon.series) {
			text += `📚 Серия: ${escapeMdV2(sermon.series)}\n`;
		}

		if (sermon.sermonText) {
			const textPreview = sermon.sermonText.length > 100 
				? sermon.sermonText.substring(0, 100) + "..." 
				: sermon.sermonText;
			text += `📝 Текст: ${escapeMdV2(textPreview)}\n`;
		}
		
		const platforms: string[] = [];
		if (sermon.media.yandex) {
			const url = escapeMdV2(sermon.media.yandex);
			platforms.push(`Яндекс \\- ${url}`);
		}
		if (sermon.media.youtube) {
			const url = escapeMdV2(sermon.media.youtube);
			platforms.push(`YouTube \\- ${url}`);
		}
		if (sermon.media.vk) {
			const url = escapeMdV2(sermon.media.vk);
			platforms.push(`VK \\- ${url}`);
		}
		if (sermon.media.podster_fm) {
			const url = escapeMdV2(sermon.media.podster_fm);
			platforms.push(`Podster\\.fm \\- ${url}`);
		}
		
		if (platforms.length > 0) {
			text += `🔗 Платформы:\n${platforms.map(p => `  ${p}`).join("\n")}\n`;
		}
		
		text += "\n";
	}

	return text;
}

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
			const { result: sermons, loadingMsg } = await withLoadingAndMsg(
				ctx,
				() => getAllSermonsWithSomeMedia(),
				{ text: "⏳ Загружаю проповеди…" }
			);

			if (loadingMsg) {
				await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id).catch(() => {});
			}

			if (sermons.length === 0) {
				await ctx.reply("❌ Проповеди с медиа не найдены\\.");
				return;
			}

			ctx.session.sermons = sermons;

			const booksSet = new Set<string>();
			for (const sermon of sermons) {
				if (sermon.book) {
					booksSet.add(sermon.book);
				}
			}

			const booksInOrder: string[] = [];
			const booksNotInList: string[] = [];

			for (const book of ALL_BIBLE_BOOKS) {
				if (booksSet.has(book)) {
					booksInOrder.push(book);
				}
			}

			for (const book of booksSet) {
				if (!ALL_BIBLE_BOOKS.includes(book)) {
					booksNotInList.push(book);
				}
			}

			const books = [...booksInOrder, ...booksNotInList.sort()];

			const text = fmt`${bold()}${SERMONS_INLINE_LABELS.SELECT_BOOK}${bold()}

${COMMON.useButtonBelow}`;

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

		const sermons = ctx.session.sermons;
		if (!sermons || sermons.length === 0) {
			await ctx.reply("❌ Проповеди не загружены\\. Попробуйте выбрать раздел снова\\.");
			return;
		}

		const booksSet = new Set<string>();
		for (const sermon of sermons) {
			if (sermon.book) {
				booksSet.add(sermon.book);
			}
		}

		const booksInOrder: string[] = [];
		const booksNotInList: string[] = [];

		for (const book of ALL_BIBLE_BOOKS) {
			if (booksSet.has(book)) {
				booksInOrder.push(book);
			}
		}

		for (const book of booksSet) {
			if (!ALL_BIBLE_BOOKS.includes(book)) {
				booksNotInList.push(book);
			}
		}

		const books = [...booksInOrder, ...booksNotInList.sort()];
		const book = books[bookIndex];

		if (!book) {
			await ctx.reply("❌ Книга не найдена\\.");
			return;
		}

		try {
			await withLoading(
				ctx,
				async () => {
					const filteredSermons = sermons
						.filter((s) => s.book === book)
						.sort((a, b) => {
							if (a.chapter && b.chapter) {
								return a.chapter - b.chapter;
							}
							if (a.date && b.date) {
								return new Date(a.date.replace(/\//g, "-")).getTime() - new Date(b.date.replace(/\//g, "-")).getTime();
							}
							return 0;
						});

					const text = await formatSermonList(filteredSermons);

					await ctx.reply(text, {
						parse_mode: "MarkdownV2",
						link_preview_options: { is_disabled: true },
						reply_markup: inlineBibleBooksMenu(books),
					});
				},
				{ text: "⏳ Загружаю проповеди…" }
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`[sermons] Ошибка получения проповедей для книги ${book}:`, errorMessage);
			await ctx.reply(`❌ Ошибка при загрузке проповедей: ${errorMessage}`);
		}
	});

	bot.callbackQuery("sermons:back", async (ctx) => {
		await ctx.answerCallbackQuery();
		await renderSermonsRoot(ctx);
	});
}
