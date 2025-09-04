// src/features/about-htc.ts
import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { ABOUT, BELIEF, COMMON, HISTORY } from "../services/texts";
import { env } from "../config/env";
import { replyAboutMenu } from "../utils/keyboards";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * Рендер корня раздела «О нас»
 */
export async function renderAboutRoot(ctx: MyContext) {
	ctx.session.menuStack = ["about"];
	ctx.session.lastSection = "about";

	await ctx.reply(`*Раздел: ${ABOUT.title}*\n\n${COMMON.useButtonBelow}`, {
		parse_mode: "Markdown",
		reply_markup: replyAboutMenu,
	});
}

/**
 * Регистрация хендлеров раздела «О нас»
 */
export function registerAboutHTC(bot: Bot<MyContext>) {
	// Вход в раздел
	bot.hears(MENU_LABELS.ABOUT, async (ctx) => {
		await renderAboutRoot(ctx);
	});

	// Канал — отправляем ссылку из env
	bot.hears(MENU_LABELS.CHANNEL, async (ctx) => {
		await ctx.reply(`Наш канал: ${env.CHANNEL_URL}`, {
			reply_markup: replyAboutMenu,
		});
		ctx.session.menuStack = ["about"];
		ctx.session.lastSection = "about";
	});

	// Во что мы верим — просто информационное сообщение внутри раздела
	bot.hears(MENU_LABELS.BELIEF, async (ctx) => {
		await ctx.replyWithPhoto("https://disk.yandex.ru/i/D40j3pRDbGGFMw", {
			caption: BELIEF,
			parse_mode: "Markdown",
			reply_markup: replyAboutMenu,
		});
		ctx.session.menuStack = ["about"];
		ctx.session.lastSection = "about";
	});

	// Наша история
	bot.hears(MENU_LABELS.HISTORY, async (ctx) => {
		await ctx.reply(HISTORY, {
			parse_mode: "Markdown",
			reply_markup: replyAboutMenu,
			link_preview_options: { is_disabled: true },
		});
		ctx.session.menuStack = ["about"];
		ctx.session.lastSection = "about";
	});
}
