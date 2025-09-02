import { Bot } from "grammy";
import { MyContext } from "../types/grammy-context";
import { SUNDAY } from "../services/texts";
import { MENU_LABELS } from "../constants/button-lables";

/**
 * Отрисовывает экран «Воскресное богослужение».
 */
export async function renderSunday(ctx: MyContext) {
	ctx.session.lastSection = "sunday";

	// Клавиатура: только кнопка «⬅️ Назад»
	const backToMainKeyboard = {
		keyboard: [[{ text: MENU_LABELS.BACK }]],
		resize_keyboard: true,
		is_persistent: true,
	};

	await ctx.reply(SUNDAY.text, {
		parse_mode: "HTML",
		reply_markup: backToMainKeyboard,
	});
}

/**
 * Регистрирует обработчики для раздела «Воскресное богослужение».
 */
export function registerSunday(bot: Bot<MyContext>) {
	bot.hears(MENU_LABELS.SUNDAY, async (ctx) => {
		await renderSunday(ctx);
	});

	bot.callbackQuery("nav:sunday", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await renderSunday(ctx);
	});
}
