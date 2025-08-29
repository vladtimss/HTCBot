import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "../types/grammy-context";
import { ABOUT } from "../services/texts";
import { env } from "../config/env";
import { urlKeyboard, commonNav } from "../utils/keyboards";

export function renderAboutRoot(ctx: MyContext) {
	const kb = new InlineKeyboard()
		.text(ABOUT.channelButton, "about:channel")
		.row()
		.text(ABOUT.beliefButton, "about:belief")
		.row()
		.text(ABOUT.historyButton, "about:history")
		.row()
		.text(ABOUT.backButton, "nav:back")
		.row()
		.text(ABOUT.mainButton, "nav:main");

	return ctx.editMessageText(`*${ABOUT.title}*`, {
		parse_mode: "Markdown",
		reply_markup: kb,
	});
}

export function registerAbout(bot: Bot<MyContext>) {
	bot.callbackQuery("nav:about", async (ctx) => {
		ctx.session.menuStack.push("about");
		await renderAboutRoot(ctx);
	});

	bot.callbackQuery("about:channel", async (ctx) => {
		// Откроем URL через кнопку. Для этого используем клаву с url-кнопкой.
		await ctx.editMessageText("*Канал нашей церкви:*", {
			parse_mode: "Markdown",
			reply_markup: urlKeyboard("Открыть канал", env.CHANNEL_URL),
		});
	});

	bot.callbackQuery("about:belief", async (ctx) => {
		await ctx.editMessageText(`*Во что мы верим*\n\n${ABOUT.belief}`, {
			parse_mode: "Markdown",
			reply_markup: commonNav(),
		});
	});

	bot.callbackQuery("about:history", async (ctx) => {
		await ctx.editMessageText(`*Наша история*\n\n${ABOUT.history}`, {
			parse_mode: "Markdown",
			reply_markup: commonNav(),
		});
	});
}
