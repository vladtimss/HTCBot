import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { env } from "../config/env";
import { START } from "../services/texts";
import { InlineKeyboard } from "grammy";
import { logger } from "../utils/logger";

/**
 * /start: отправка картинки (если есть), заголовка, описания и кнопки "Начать".
 */
export function registerStart(bot: Bot<MyContext>) {
	bot.command("start", async (ctx) => {
		// Сброс в корень меню
		ctx.session.menuStack = ["main"];

		const kb = new InlineKeyboard().text(START.button, "nav:main");

		try {
			// Пытаемся отправить локальную картинку. Если файла нет, отправляем текст.
			await ctx.replyWithPhoto(
				// можно URL, но тут используем путь к локальному файлу из .env
				env.START_IMAGE,
				{
					caption: `*${START.title}*\n\n${START.description}`,
					parse_mode: "Markdown",
					reply_markup: kb,
				}
			);
		} catch (e) {
			logger.warn({ e }, "Failed to send start image, fallback to text");
			await ctx.reply(`*${START.title}*\n\n${START.description}`, { parse_mode: "Markdown", reply_markup: kb });
		}
	});
}
