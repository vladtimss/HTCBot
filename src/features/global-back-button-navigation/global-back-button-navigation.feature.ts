/**
 * features/global-back-button-navigation/global-back-button-navigation.feature.ts
 * --------------------------
 * Глобальный обработчик кнопки «⬅️ Назад»
 */

import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { NAVIGATION_LABELS } from "../../constants/navigation";
import { replyMainKeyboard } from "../main-menu/main-menu.keyboard";
import { MAIN_TEXTS } from "../main-menu/main-menu.texts";

import { renderAboutRoot } from "../about-htc/about-htc.feature";
import { renderHolyTrinityChurchRoot } from "../holy-trinity-church/holy-trinity-church.feature";
import { renderCalendarRoot } from "../holy-trinity-church/church-calendar/church-calendar.feature";
import { renderMembersMeetingRoot } from "../holy-trinity-church/members-meeting/members-meeting.feature";
import { renderGroupsRoot }              from "../small-groups/small-groups.feature";
import { renderPresbyterianCouncilRoot } from "../holy-trinity-church/presbyterian-council/presbyterian-council.feature";

/**
 * 📌 Глобальный обработчик кнопки «⬅️ Назад»
 * - Использует menuStack для навигации назад
 */
export function registerBackButton(bot: Bot<MyContext>) {
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

			case "holy-trinity-church":
				await renderHolyTrinityChurchRoot(ctx);
				break;

			case "calendar":
			case "lmg":
			case "prayers":
			case "members":
			case "holidays":
			case "family":
				await renderCalendarRoot(ctx);
				break;

			case "members-meeting":
				await renderMembersMeetingRoot(ctx);
				break;

		case "groups":
			await renderGroupsRoot(ctx);
			break;

		case "presbyterian-council":
			await renderPresbyterianCouncilRoot(ctx);
			break;

		case "pc-agenda":
			await renderPresbyterianCouncilRoot(ctx);
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
