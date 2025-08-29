import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { ABOUT } from "../services/texts";
import { env } from "../config/env";
import { MENU_LABELS } from "./main-menu";
import { replyAboutMenu, replyBackToAbout } from "../utils/keyboards";

export async function renderAboutRoot(ctx: MyContext) {
	ctx.session.lastSection = "about";
	await ctx.reply(`*${ABOUT.title}*`, {
		parse_mode: "Markdown",
		reply_markup: replyAboutMenu,
	});
}

export async function renderAboutBelief(ctx: MyContext) {
	ctx.session.lastSection = "about/belief";
	await ctx.reply(`*Во что мы верим*\n\n${ABOUT.belief}`, {
		parse_mode: "Markdown",
		reply_markup: replyBackToAbout,
	});
}

export async function renderAboutHistory(ctx: MyContext) {
	ctx.session.lastSection = "about/history";
	await ctx.reply(`*Наша история*\n\n${ABOUT.history}`, {
		parse_mode: "Markdown",
		reply_markup: replyBackToAbout,
	});
}

export function registerAbout(bot: Bot<MyContext>) {
	// Вход в раздел из Reply-клавиатуры
	bot.hears(MENU_LABELS.ABOUT, async (ctx) => {
		await renderAboutRoot(ctx);
	});

	// Кнопки внутри reply-меню «Кто мы»
	bot.hears(MENU_LABELS.CHANNEL, async (ctx) => {
		// открываем ссылку просто текстом, т.к. ReplyKeyboard не умеет url
		await ctx.reply(`Наш канал: ${env.CHANNEL_URL}`, {
			reply_markup: replyAboutMenu,
		});
		ctx.session.lastSection = "about";
	});

	bot.hears(MENU_LABELS.BELIEF, async (ctx) => {
		await renderAboutBelief(ctx);
	});

	bot.hears(MENU_LABELS.HISTORY, async (ctx) => {
		await renderAboutHistory(ctx);
	});

	// «⬅️ Назад» из belief/history → в «Кто мы»
	bot.hears(MENU_LABELS.BACK, async (ctx) => {
		if (ctx.session.lastSection === "about/belief" || ctx.session.lastSection === "about/history") {
			await renderAboutRoot(ctx);
			return;
		}
		// иначе — в главное меню
		await ctx.reply("Главное меню:", {
			reply_markup: {
				keyboard: [
					[{ text: MENU_LABELS.SUNDAY }],
					[{ text: MENU_LABELS.GROUPS }],
					[{ text: MENU_LABELS.NEXT3 }],
					[{ text: MENU_LABELS.ABOUT }],
				],
				resize_keyboard: true,
				is_persistent: true,
			},
		});
		ctx.session.lastSection = "main";
	});

	// «⬅️ В главное меню» из about-меню
	bot.hears(MENU_LABELS.ABOUT_BACK, async (ctx) => {
		await ctx.reply("Главное меню:", {
			reply_markup: {
				keyboard: [
					[{ text: MENU_LABELS.SUNDAY }],
					[{ text: MENU_LABELS.GROUPS }],
					[{ text: MENU_LABELS.NEXT3 }],
					[{ text: MENU_LABELS.ABOUT }],
				],
				resize_keyboard: true,
				is_persistent: true,
			},
		});
		ctx.session.lastSection = "main";
	});
}
