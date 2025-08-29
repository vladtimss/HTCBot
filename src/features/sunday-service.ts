import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { SUNDAY } from "../services/texts";
import { commonNav } from "../utils/keyboards";

/**
 * Экран "Воскресное богослужение".
 */
export function renderSunday(ctx: MyContext) {
	const kb = commonNav(); // Назад/Главное
	return ctx.editMessageText(`*${SUNDAY.title}*\n\n${SUNDAY.text}`, { parse_mode: "Markdown", reply_markup: kb });
}

/**
 * Для единообразия — если хочется вызывать напрямую из других мест.
 */
export function registerSunday(bot: Bot<MyContext>) {
	bot.callbackQuery("nav:sunday", async (ctx) => {
		ctx.session.menuStack.push("sunday");
		await renderSunday(ctx);
	});
}
