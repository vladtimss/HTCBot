import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { START } from "../services/texts";
import { env } from "../config/env";
import { replyMainKeyboard } from "../utils/keyboards";

export function registerStart(bot: Bot<MyContext>) {
	bot.command("start", async (ctx) => {
		ctx.session.menuStack = ["main"];
		ctx.session.lastSection = "main";

		const kb = new InlineKeyboard().text(START.button, "nav:main");

		try {
			await ctx.replyWithPhoto(env.START_IMAGE, {
				caption: `*${START.title}*\n\n${START.description}`,
				parse_mode: "Markdown",
				reply_markup: kb,
			});
		} catch {
			await ctx.reply(`*${START.title}*\n\n${START.description}`, {
				parse_mode: "Markdown",
				reply_markup: kb,
			});
		}

		// Показать широкое главное меню
		await ctx.reply("Главное меню:", { reply_markup: replyMainKeyboard });
	});
}
