// src/features/navigation.ts
import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { MENU_LABELS } from "../constants/button-lables";
import { replyMainKeyboard } from "../utils/keyboards";
import { MAIN } from "../services/texts";

import { renderAboutRoot } from "./about-htc";
import { renderCalendarRoot } from "./church-calendar";

/**
 * 📌 Универсальный обработчик кнопки «⬅️ Назад»
 * - Использует menuStack для навигации
 */
export function registerNavigation(bot: Bot<MyContext>) {
	bot.hears(MENU_LABELS.BACK, async (ctx) => {
		console.log(1);
		// Если стека нет или в нём только один элемент → кидаем в главное меню
		if (!ctx.session.menuStack || ctx.session.menuStack.length <= 1) {
			await ctx.reply(MAIN.title, {
				parse_mode: "Markdown",
				reply_markup: replyMainKeyboard(ctx),
			});
			ctx.session.lastSection = "main";
			ctx.session.menuStack = ["main"];
			return;
		}

		// Убираем текущий раздел
		ctx.session.menuStack.pop();
		const prev = ctx.session.menuStack[ctx.session.menuStack.length - 1];

		// Выбираем что отрендерить в зависимости от раздела
		switch (prev) {
			case "about":
				await renderAboutRoot(ctx);
				break;

			case "calendar":
			case "lmg":
			case "prayers":
			case "members":
			case "holidays":
			case "family":
				await renderCalendarRoot(ctx);
				break;

			default:
				// если не знаем что это → кидаем в главное меню
				await ctx.reply(MAIN.title, {
					parse_mode: "Markdown",
					reply_markup: replyMainKeyboard(ctx),
				});
				ctx.session.lastSection = "main";
				ctx.session.menuStack = ["main"];
				break;
		}
	});
}
