/**
 * features/sunday-service/sunday-service.feature.ts
 * --------------------------
 * Логика раздела "Воскресное богослужение"
 */

import { Bot } from "grammy";
import { MyContext } from "../../types/grammy-context";
import { SUNDAY_TEXTS } from "./sunday-service.texts";
import { MENU_LABELS } from "../../constants/button-lables";
import { env } from "../../config/env";

/**
 * Отрисовывает экран «Воскресное богослужение».
 */
export async function renderSunday(ctx: MyContext) {
	ctx.session.lastSection = "sunday";

	await ctx.replyWithPhoto(env.SUNDAY_SERVICE_IMG, {
		caption: SUNDAY_TEXTS.text.text,
		caption_entities: SUNDAY_TEXTS.text.entities,
	});
}

/**
 * Регистрирует обработчики для раздела «Воскресное богослужение».
 */
export function registerSunday(bot: Bot<MyContext>) {
	bot.hears(MENU_LABELS.MAIN_SUNDAY, async (ctx) => {
		await renderSunday(ctx);
	});

	bot.callbackQuery("nav:sunday", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
		await renderSunday(ctx);
	});
}
