import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { ABOUT } from "../services/texts";
import { env } from "../config/env";
import { commonNav } from "../utils/keyboards";

export function registerAbout(bot: Bot<MyContext>) {
	bot.callbackQuery("nav:about", async (ctx) => {
		ctx.session.menuStack.push("about");
		const kb = new InlineKeyboard()
			.text(ABOUT.channelButton, "about:channel")
			.row()
			.text(ABOUT.beliefButton, "about:belief")
			.text(ABOUT.historyButton, "about:history")
			.row()
			.text("⬅️ Назад", "nav:back")
			.row()
			.text("🏠 В главное меню", "nav:main");

		await ctx.editMessageText(`*${ABOUT.title}*`, {
			parse_mode: "Markdown",
			reply_markup: kb,
		});
	});

	bot.callbackQuery("about:channel", async (ctx) => {
		await ctx.editMessageText("*Канал нашей церкви:*", {
			parse_mode: "Markdown",
			reply_markup: new InlineKeyboard()
				.url("Открыть канал", env.CHANNEL_URL)
				.row()
				.text("⬅️ Назад", "nav:back")
				.row()
				.text("🏠 В главное меню", "nav:main"),
		});
	});

	bot.callbackQuery("about:belief", async (ctx) => {
		await ctx.editMessageText(`*Во что мы верим*\n\n${ABOUT.belief}`, {
			parse_mode: "Markdown",
			reply_markup: commonNav(),
		});
	});

	bot.callbackQuery("about:history", async (ctx) => {
		ctx.session.menuStack.push("history");
		console.log(ctx.session.menuStack);
		await ctx.editMessageText(`*Наша история*\n\n${ABOUT.history}`, {
			parse_mode: "Markdown",
			reply_markup: commonNav(),
		});
	});
}
