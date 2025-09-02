// src/utils/guards.ts
import { MyContext } from "../types/grammy-context";
import { replyMainKeyboard } from "../utils/keyboards";
import { COMMON } from "../services/texts";

/**
 * Если пользователь не привилегирован — мягко перекидываем в главное меню.
 * Возвращает true, если доступ есть, иначе false.
 */
export function requirePrivileged(ctx: MyContext): boolean {
	if (ctx.access?.isPrivileged) return true;

	// мягкий редирект в ГМ без сообщений о правах
	ctx.session.menuStack = ["main"];
	ctx.session.lastSection = "main";
	ctx.reply(COMMON.mainMenuTitle, { reply_markup: replyMainKeyboard(ctx) });

	return false;
}
