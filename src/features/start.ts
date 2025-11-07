import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { COMMON, greet } from "../services/texts";
import { env } from "../config/env";
import { replyMainKeyboard } from "../utils/keyboards";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * Регистрирует обработчик команды /start.
 * Показывает приветственное сообщение с кнопкой перехода в главное меню.
 */
export function registerStart(bot: Bot<MyContext>) {
	bot.command("start", async (ctx) => {
		// Инициализируем состояние меню в сессии
		ctx.session.menuStack = ["main"];
		ctx.session.lastSection = "main";

		// Кнопка «🏠 Главное меню»
        const kb = new InlineKeyboard().text(MENU_LABELS.GLOBAL_START, "nav:main");

		try {
			await ctx.replyWithPhoto(env.START_IMAGE, {
				caption: greet(ctx),
				parse_mode: "Markdown",
				reply_markup: kb,
			});
		} catch (e) {
			await ctx.reply(greet(ctx), {
				parse_mode: "Markdown",
				reply_markup: kb,
			});
		}

		// Отправляем клавиатуру главного меню
		await ctx.reply(COMMON.mainMenuTitle, { reply_markup: replyMainKeyboard(ctx) });
	});
}
