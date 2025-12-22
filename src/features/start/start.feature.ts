/**
 * features/start/start.feature.ts
 * --------------------------
 * Логика команды /start
 */

import { Bot, InlineKeyboard } from "grammy";
import { MyContext }           from "../../types/grammy-context";
import { COMMON }              from "../../services/texts";
import { greet }               from "./start.texts";
import { env }                 from "../../config/env";
import { replyMainKeyboard }   from "../main-menu/main-menu.keyboard";
import { NAVIGATION_LABELS }   from "../../constants/navigation";

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
		const kb = new InlineKeyboard().text(NAVIGATION_LABELS.GLOBAL_START, "nav:main");

		const greeting = greet(ctx);
		try {
			await ctx.replyWithPhoto(env.START_IMAGE, {
				caption: greeting.text,
				caption_entities: greeting.entities,
				reply_markup: kb,
			});
		} catch (e) {
			await ctx.reply(greeting.text, {
				entities: greeting.entities,
				reply_markup: kb,
			});
		}

		// Отправляем клавиатуру главного меню
		await ctx.reply(COMMON.mainMenuTitle, { reply_markup: replyMainKeyboard(ctx) });
	});
}
