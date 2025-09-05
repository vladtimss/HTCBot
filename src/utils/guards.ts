/**
 * utils/guards.ts
 * --------------------------
 * Проверки доступа (гварды).
 * Здесь — проверка на "привилегированного" пользователя.
 */

import { MyContext } from "../types/grammy-context";
import { replyMainKeyboard } from "../utils/keyboards";
import { COMMON } from "../services/texts";

/**
 * Проверяет, есть ли у пользователя привилегии.
 * Если нет — мягко перекидывает в главное меню.
 * @returns true, если доступ разрешён
 */
export function requirePrivileged(ctx: MyContext): boolean {
	if (ctx.access?.isPrivileged) return true;

	// Сброс меню → главное
	ctx.session.menuStack = ["main"];
	ctx.session.lastSection = "main";

	ctx.reply(COMMON.mainMenuTitle, { reply_markup: replyMainKeyboard(ctx) });

	return false;
}
