/**
 * features/main-menu/main-menu.feature.ts
 * --------------------------
 * Логика главного меню
 */

import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { replyMainKeyboard } from "./main-menu.keyboard";
import { NAVIGATION_LABELS } from "../../constants/navigation";
import { MAIN_TEXTS } from "./main-menu.texts";

/**
 * 📌 Рендер главного меню
 * - Сбрасывает стек меню в ["main"].
 * - Показывает основные кнопки из replyMainKeyboard.
 */
export async function renderMain(ctx: MyContext) {
	ctx.session.lastSection = "main";
	ctx.session.menuStack = ["main"];

	await ctx.reply(MAIN_TEXTS.title.text, {
		entities: MAIN_TEXTS.title.entities,
		reply_markup: replyMainKeyboard(ctx),
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
	bot.hears(NAVIGATION_LABELS.NAV_MAIN, async (ctx) => {
		await renderMain(ctx);
	});
}
