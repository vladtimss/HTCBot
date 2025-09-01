import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { replyMainKeyboard } from "../utils/keyboards";
import { fetchUpcomingEvents, formatEvent } from "../services/calendar";
import { MENU_LABELS } from "../constants/button-lables";

export async function renderMain(ctx: MyContext) {
	ctx.session.lastSection = "main";
	await ctx.reply("*Главное меню*", {
		parse_mode: "Markdown",
		reply_markup: replyMainKeyboard,
	});
}

export function registerMainMenu(bot: Bot<MyContext>) {
	// Переход в главное меню из inline «Начать» или из разделов
	bot.callbackQuery("nav:main", async (ctx) => {
		ctx.session.menuStack = ["main"];
		ctx.session.lastSection = "main";
		await ctx.answerCallbackQuery().catch(() => {});
		await renderMain(ctx);
	});

	// «🏠 В главное меню» как reply-кнопка
	bot.hears(MENU_LABELS.MAIN, async (ctx) => {
		ctx.session.lastSection = "main";
		ctx.session.menuStack = ["main"];
		await renderMain(ctx);
	});

	// Показать 3 ближайших события
	bot.hears(MENU_LABELS.NEXT3, async (ctx) => {
		ctx.session.lastSection = "next3";
		const events = await fetchUpcomingEvents(3);
		const text = events.length ? events.map(formatEvent).join("\n\n") : "Ближайших событий не найдено.";

		// В этом экране только «🏠 В главное меню»
		await ctx.reply(`*Ближайшие события:*\n\n${text}`, {
			parse_mode: "Markdown",
			reply_markup: {
				keyboard: [[{ text: MENU_LABELS.MAIN }]],
				resize_keyboard: true,
				is_persistent: true,
			},
		});
	});
}
