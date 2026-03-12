/**
 * utils/guards.ts
 * --------------------------
 * Проверки доступа (гварды).
 * Здесь — проверка на "привилегированного" пользователя.
 */

import { MyContext } from "../types/grammy-context";
import { replyMainKeyboard } from "../features/main-menu/main-menu.keyboard";
import { COMMON }        from "../services/texts";
import { isHTChurchLMG } from "../services/access";

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

/**
 * Проверяет, является ли пользователь лидером ЛМГ.
 * Если нет — мягко перекидывает в главное меню.
 */
export function requireLmgLeader(ctx: MyContext): boolean {
	if (isHTChurchLMG(ctx)) return true;

	// Сброс меню → главное
	ctx.session.menuStack = ["main"];
	ctx.session.lastSection = "main";

	ctx.reply(COMMON.mainMenuTitle, { reply_markup: replyMainKeyboard(ctx) });

	return false;
}
