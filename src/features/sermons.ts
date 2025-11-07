// src/features/sermons.ts
import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { env } from "../config/env";
import { replySermonsMenu } from "../utils/keyboards";
import { MENU_LABELS } from "../constants/button-lables";
import { COMMON, SERMONS } from "../services/texts";

/**
 * 📌 Рендер корня раздела «Проповеди»
 */
export async function renderSermonsRoot(ctx: MyContext) {
	ctx.session.menuStack = ["sermons"];
	ctx.session.lastSection = "sermons";

	await ctx.reply(`${SERMONS.title}\n\n${COMMON.useButtonBelow}`, {
		parse_mode: "Markdown",
		reply_markup: replySermonsMenu,
	});
}

/**
 * 📌 Регистрация хендлеров раздела «Проповеди»
 */
export function registerSermons(bot: Bot<MyContext>) {
    // Вход в раздел из главного меню
    bot.hears(MENU_LABELS.MAIN_SERMONS, async (ctx) => {
		await renderSermonsRoot(ctx);
	});

	// Подкасты
	bot.hears(MENU_LABELS.SERMONS_PODCASTS, async (ctx) => {
		await ctx.reply(SERMONS.podcasts(env.SERMONS_YANDEX_URL, env.SERMONS_PODSTER_URL), {
			parse_mode: "Markdown",
			link_preview_options: { is_disabled: true },
			reply_markup: replySermonsMenu,
		});
	});
}
