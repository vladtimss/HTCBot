/**
 * features/htc-wiki/htc-wiki.feature.ts
 * --------------------------
 * Корневой раздел "Полезные материалы" (HTC Wiki)
 */

import { Bot } from "grammy";
import { fmt, bold } from "@grammyjs/parse-mode";
import { MENU_LABELS } from "../../constants/button-lables";
import { COMMON } from "../../services/texts";
import { replyFormatted } from "../../utils/format-helpers";
import { MyContext } from "../../types/grammy-context";
import { HTC_WIKI_BUTTON_LABELS } from "./htc-wiki.constants";
import { replyHtcWikiMenu } from "./htc-wiki.keyboard";
import { registerChildrenCatechism, renderChildrenCatechismRoot } from "./children-catechism/children-catechism.feature";

export async function renderHtcWikiRoot(ctx: MyContext) {
	ctx.session.menuStack = ["htc-wiki"];
	ctx.session.lastSection = "htc-wiki";

	const text = fmt`${bold()}Раздел: Полезные материалы${bold()}${COMMON.useButtonBelow}`;
	await replyFormatted(ctx, text, { reply_markup: replyHtcWikiMenu });
}

export function registerHtcWiki(bot: Bot<MyContext>) {
	// Подфичи
	registerChildrenCatechism(bot);

	bot.hears(MENU_LABELS.MAIN_HTC_WIKI, async (ctx) => {
		await renderHtcWikiRoot(ctx);
	});

	bot.hears(HTC_WIKI_BUTTON_LABELS.CHILDREN_CATECHISM, async (ctx) => {
		await renderChildrenCatechismRoot(ctx);
	});
}

