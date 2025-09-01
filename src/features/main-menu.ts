import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { replyMainKeyboard } from "../utils/keyboards";
import { fetchUpcomingEvents, formatEvent } from "../services/calendar";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * Рендер главного меню (универсальный метод, чтобы не дублировать код).
 */
export async function renderMain(ctx: MyContext) {
	ctx.session.lastSection = "main";
	ctx.session.menuStack = ["main"];

	await ctx.reply("*Главное меню*", {
		parse_mode: "Markdown",
		reply_markup: replyMainKeyboard,
	});
}

/**
 * Регистрация всех хендлеров для главного меню.
 */
export function registerMainMenu(bot: Bot<MyContext>) {
	/**
	 * Inline-кнопка «🏠 Главное меню» (например, из /start или других экранов).
	 */
	bot.callbackQuery("nav:main", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await renderMain(ctx);
	});

	/**
	 * Reply-кнопка «🏠 В главное меню».
	 */
	bot.hears(MENU_LABELS.MAIN, async (ctx) => {
		await renderMain(ctx);
	});

	/**
	 * Кнопка: «🗓️ Показать три ближайших события».
	 */
	bot.hears(MENU_LABELS.NEXT3, async (ctx) => {
		ctx.session.lastSection = "next3";

		const events = await fetchUpcomingEvents(3);
		const text = events.length ? events.map(formatEvent).join("\n\n") : "Ближайших событий не найдено.";

		await ctx.reply(`*Ближайшие события:*\n\n${text}`, {
			parse_mode: "Markdown",
			reply_markup: {
				// здесь показываем только возврат в главное меню
				keyboard: [[{ text: MENU_LABELS.MAIN }]],
				resize_keyboard: true,
				is_persistent: true,
			},
		});
	});
}
