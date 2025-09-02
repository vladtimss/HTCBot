import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { START, COMMON } from "../services/texts";
import { env } from "../config/env";
import { replyMainKeyboard } from "../utils/keyboards";

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
		const kb = new InlineKeyboard().text(START.button, "nav:main");

		// Текст приветствия
		const welcomeText = `*${START.title}*\n\n${START.description}`;

		try {
			await ctx.replyWithPhoto(env.START_IMAGE, {
				caption: welcomeText,
				parse_mode: "Markdown",
				reply_markup: kb,
			});
		} catch {
			await ctx.reply(welcomeText, {
				parse_mode: "Markdown",
				reply_markup: kb,
			});
		}

		// Отправляем клавиатуру главного меню
		await ctx.reply(COMMON.mainMenuTitle, { reply_markup: replyMainKeyboard(ctx) });
	});
}
