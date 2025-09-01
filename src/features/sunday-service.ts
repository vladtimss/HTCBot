import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { SUNDAY } from "../services/texts";
import { MENU_LABELS } from "../constants/button-lables";

export async function renderSunday(ctx: MyContext) {
	ctx.session.lastSection = "sunday";
	await ctx.reply(`${SUNDAY.text}`, {
		parse_mode: "HTML",
		reply_markup: {
			keyboard: [[{ text: MENU_LABELS.MAIN }]],
			resize_keyboard: true,
			is_persistent: true,
		},
	});
}

export function registerSunday(bot: Bot<MyContext>) {
	bot.hears(MENU_LABELS.SUNDAY, async (ctx) => {
		await renderSunday(ctx);
	});

	// На всякий случай поддержим inline вход (если где-то используем)
	bot.callbackQuery("nav:sunday", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await renderSunday(ctx);
	});
}
