// src/features/main-menu.ts
import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { replyMainKeyboard } from "../utils/keyboards";
import { MENU_LABELS } from "../constants/button-lables";
import { MAIN } from "../services/texts"; // добавили texts

/**
 * 📌 Рендер главного меню
 * - Сбрасывает стек меню в ["main"].
 * - Показывает основные кнопки из replyMainKeyboard.
 */
export async function renderMain(ctx: MyContext) {
	ctx.session.lastSection = "main";
	ctx.session.menuStack = ["main"];

	await ctx.reply(MAIN.title, {
		parse_mode: "Markdown",
		reply_markup: replyMainKeyboard,
	});
}

/**
 * 📌 Регистрация всех обработчиков для главного меню
 */
export function registerMainMenu(bot: Bot<MyContext>) {
	/**
	 * Inline-кнопка «🏠 Главное меню»
	 */
	bot.callbackQuery("nav:main", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await renderMain(ctx);
	});

	/**
	 * Reply-кнопка «🏠 В главное меню»
	 * Используется в клавиатурах внутри разных разделов.
	 */
	bot.hears(MENU_LABELS.MAIN, async (ctx) => {
		await renderMain(ctx);
	});
}
