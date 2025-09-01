// src/features/about-htc.ts
import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { ABOUT } from "../services/texts";
import { env } from "../config/env";
import { replyAboutMenu, replyBackToAbout, replyMainKeyboard } from "../utils/keyboards";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * Рендер корня раздела О нас»
 * - Запоминаем, что мы в разделе about
 * - Показываем меню раздела (reply-клавиатура)
 */
export async function renderAboutRoot(ctx: MyContext) {
	ctx.session.lastSection = "about";
	await ctx.reply(`*${ABOUT.title}*`, {
		parse_mode: "Markdown",
		reply_markup: replyAboutMenu,
	});
}

/**
 * Универсальный рендер страницы внутри «О нас»
 * kind: 'belief' | 'history'
 */
async function renderAboutSubpage(ctx: MyContext, kind: "belief" | "history") {
	const title = kind === "belief" ? "Во что мы верим" : "Наша история";
	const body = kind === "belief" ? ABOUT.belief : ABOUT.history;

	ctx.session.lastSection = `about/${kind}`;
	await ctx.reply(`*${title}*\n\n${body}`, {
		parse_mode: "Markdown",
		reply_markup: replyBackToAbout, // «⬅️ Назад» к корню раздела
	});
}

/**
 * Хелпер для вызова рендера из других мест
 */
export async function renderAboutBelief(ctx: MyContext) {
	return renderAboutSubpage(ctx, "belief");
}

/**
 * Хелпер для вызова рендера из других мест
 */
export async function renderAboutHistory(ctx: MyContext) {
	return renderAboutSubpage(ctx, "history");
}

/**
 * Регистрация хендлеров раздела «О нас»
 */
export function registerAbout(bot: Bot<MyContext>) {
	// Вход в раздел из Reply-клавиатуры
	bot.hears(MENU_LABELS.ABOUT, async (ctx) => {
		await renderAboutRoot(ctx);
	});

	// Кнопки внутри reply-меню «О нас»
	bot.hears(MENU_LABELS.CHANNEL, async (ctx) => {
		// Reply-клавиатура не поддерживает URL-кнопки, шлём ссылку текстом
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

	/**
	 * «⬅️ Назад»
	 * - Если мы на подстранице раздела about — вернуться к корню раздела
	 * - Иначе — в единое «Главное меню» (ОБЩИЙ helper replyMainKeyboard)
	 *
	 */
	bot.hears(MENU_LABELS.BACK, async (ctx) => {
		if (ctx.session.lastSection?.startsWith("about/")) {
			await renderAboutRoot(ctx);
			return;
		}
		// Единый вызов главного меню
		await ctx.reply("Главное меню:", {
			reply_markup: replyMainKeyboard,
		});
		ctx.session.lastSection = "main";
	});
}
