import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { replyMainKeyboard } from "../utils/keyboards";
import { fetchUpcomingEvents, formatEvent } from "../services/calendar";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * Рендер главного меню
 */
export async function renderMain(ctx: MyContext) {
	ctx.session.lastSection = "main";
	ctx.session.menuStack = ["main"];

	await ctx.reply(`*Главное меню*\n_(Воспользуйтесь кнопками внизу)_`, {
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
}
