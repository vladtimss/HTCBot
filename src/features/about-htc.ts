// src/features/about-htc.ts
import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { ABOUT } from "../services/texts";
import { env } from "../config/env";
import { replyAboutMenu } from "../utils/keyboards";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * Рендер корня раздела «О нас»
 */
export async function renderAboutRoot(ctx: MyContext) {
	ctx.session.menuStack = ["about"];
	ctx.session.lastSection = "about";

	await ctx.reply(`*${ABOUT.title}*`, {
		parse_mode: "Markdown",
		reply_markup: replyAboutMenu,
	});
}

/**
 * Регистрация хендлеров раздела «О нас»
 */
export function registerAbout(bot: Bot<MyContext>) {
	// Вход в раздел
	bot.hears(MENU_LABELS.ABOUT, async (ctx) => {
		await renderAboutRoot(ctx);
	});

	// Канал
	bot.hears(MENU_LABELS.CHANNEL, async (ctx) => {
		await ctx.reply(`Наш канал: ${env.CHANNEL_URL}`, {
			reply_markup: replyAboutMenu,
		});
		ctx.session.lastSection = "about";
	});

	// Во что мы верим
	bot.hears(MENU_LABELS.BELIEF, async (ctx) => {
		await ctx.reply(`*${ABOUT.beliefButton}*\n\n${ABOUT.belief}`, {
			parse_mode: "Markdown",
			reply_markup: replyAboutMenu,
		});
		ctx.session.lastSection = "about";
	});

	// Наша история
	bot.hears(MENU_LABELS.HISTORY, async (ctx) => {
		await ctx.reply(`*${ABOUT.historyButton}*\n\n${ABOUT.history}`, {
			parse_mode: "Markdown",
			reply_markup: replyAboutMenu,
		});
		ctx.session.lastSection = "about";
	});
}
