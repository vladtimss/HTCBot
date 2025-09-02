import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { env } from "../config/env";
import { replySermonsMenu } from "../utils/keyboards";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * Рендер корня раздела «Проповеди»
 */
export async function renderSermonsRoot(ctx: MyContext) {
	ctx.session.menuStack = ["sermons"];
	ctx.session.lastSection = "sermons";

	await ctx.reply("*Проповеди*", {
		parse_mode: "Markdown",
		reply_markup: replySermonsMenu,
	});
}

/**
 * Регистрация хендлеров раздела «Проповеди»
 */
export function registerSermons(bot: Bot<MyContext>) {
	// Вход в раздел из главного меню
	bot.hears(MENU_LABELS.SERMONS, async (ctx) => {
		await renderSermonsRoot(ctx);
	});

	// Подкасты
	bot.hears(MENU_LABELS.SERMONS_PODCASTS, async (ctx) => {
		await ctx.reply(
			`🎧 Наши проповеди доступны в подкастах:\n\n` +
				`- [Яндекс.Музыка](${env.SERMONS_YANDEX_URL})\n` +
				`- [Podster.fm](${env.SERMONS_PODSTER_URL})`,
			{
				parse_mode: "Markdown",
				link_preview_options: { is_disabled: true },
				reply_markup: replySermonsMenu,
			}
		);
	});
}
