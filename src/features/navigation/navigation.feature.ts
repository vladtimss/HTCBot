/**
 * features/navigation/navigation.feature.ts
 * --------------------------
 * Логика навигации (кнопка "Назад")
 */

import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { NAVIGATION_LABELS } from "../../constants/navigation";
import { replyMainKeyboard } from "../main-menu/main-menu.keyboard";
import { MAIN_TEXTS } from "../main-menu/main-menu.texts";

import { renderAboutRoot } from "../about-htc/about-htc.feature";
import { renderCalendarRoot } from "../church-calendar/church-calendar.feature";
import { renderGroupsRoot } from "../small-groups/small-groups.feature";

/**
 * 📌 Универсальный обработчик кнопки «⬅️ Назад»
 * - Использует menuStack для навигации
 */
export function registerNavigation(bot: Bot<MyContext>) {
	bot.hears(NAVIGATION_LABELS.NAV_BACK, async (ctx) => {
		// Если стека нет или в нём только один элемент → кидаем в главное меню
		if (!ctx.session.menuStack || ctx.session.menuStack.length <= 1) {
			await ctx.reply(MAIN_TEXTS.title.text, {
				entities: MAIN_TEXTS.title.entities,
				reply_markup: replyMainKeyboard(ctx),
			});
			ctx.session.lastSection = "main";
			ctx.session.menuStack = ["main"];
			return;
		}
		console.log(ctx.session.menuStack);
		// Убираем текущий раздел
		ctx.session.menuStack.pop();
		const prev = ctx.session.menuStack[ctx.session.menuStack.length - 1];
		console.log(prev);

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

			case "groups":
				await renderGroupsRoot(ctx);
				break;

			default:
				// если не знаем что это → кидаем в главное меню
				await ctx.reply(MAIN_TEXTS.title.text, {
					entities: MAIN_TEXTS.title.entities,
					reply_markup: replyMainKeyboard(ctx),
				});
				ctx.session.lastSection = "main";
				ctx.session.menuStack = ["main"];
				break;
		}
	});
}
