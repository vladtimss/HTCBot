import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { START } from "../services/texts";
import { env } from "../config/env";
import { replyMainKeyboard } from "../utils/keyboards";

/**
 * Регистрирует обработчик команды /start.
 * Показывает приветственное сообщение с кнопкой
 */
export function registerStart(bot: Bot<MyContext>) {
	// Команда /start
	bot.command("start", async (ctx) => {
		// Инициализируем состояние меню в сессии
		ctx.session.menuStack = ["main"];
		ctx.session.lastSection = "main";

		// Кнопка перехода в главное меню
		const kb = new InlineKeyboard().text(START.button, "nav:main");

		// Текст приветствия
		const welcomeText = `*${START.title}*\n\n${START.description}`;

		// Пытаемся отправить картинку + текст, если картинка не доступна — отправляем только текст
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

		// Отправляем широкую клавиатуру главного меню
		await ctx.reply("Главное меню:", { reply_markup: replyMainKeyboard });
	});
}
