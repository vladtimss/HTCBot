import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { SUNDAY } from "../services/texts";
import { commonNav } from "../utils/keyboards";

export function registerSunday(bot: Bot<MyContext>) {
	bot.callbackQuery("nav:sunday", async (ctx) => {
		ctx.session.menuStack.push("sunday");
		await ctx.editMessageText(`*${SUNDAY.title}*\n\n${SUNDAY.text}`, {
			parse_mode: "Markdown",
			reply_markup: commonNav(),
		});
	});
}
