/**
 * features/holy-trinity-church/holy-trinity-church.feature.ts
 * --------------------------
 * Раздел «Церковь Святой Троицы»: подразделы (церковный календарь и др.)
 */

import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { MENU_LABELS } from "../../constants/button-lables";
import { requireChurchAccess } from "../../utils/guards";
import { replyFormatted } from "../../utils/format-helpers";
import { replyHolyTrinityChurchKeyboard } from "./holy-trinity-church.keyboard";
import { HOLY_TRINITY_CHURCH_TEXTS } from "./holy-trinity-church.texts";

export async function renderHolyTrinityChurchRoot(ctx: MyContext) {
	ctx.session.lastSection = "holy-trinity-church";
	ctx.session.menuStack = ["holy-trinity-church"];

	await replyFormatted(ctx, HOLY_TRINITY_CHURCH_TEXTS.title, {
		reply_markup: replyHolyTrinityChurchKeyboard(ctx),
	});
}

export function registerHolyTrinityChurch(bot: Bot<MyContext>) {
	bot.hears(MENU_LABELS.MAIN_HOLY_TRINITY_CHURCH, async (ctx) => {
		if (!requireChurchAccess(ctx)) return;

		await renderHolyTrinityChurchRoot(ctx);
	});
}
