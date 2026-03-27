/**
 * utils/guards.ts
 * --------------------------
 * Проверки доступа (гварды).
 * Здесь — проверка на "привилегированного" пользователя.
 */

import { MyContext } from "../types/grammy-context";
import { replyMainKeyboard } from "../features/main-menu/main-menu.keyboard";
import { COMMON }        from "../services/texts";
import { safeReply }     from "./telegram-flood";

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

	void safeReply(ctx, COMMON.mainMenuTitle, { reply_markup: replyMainKeyboard(ctx) });

	return false;
}

/**
 * Проверяет, является ли пользователь лидером ЛМГ.
 * Если нет — мягко перекидывает в главное меню.
 */
export function requireLmgLeader(ctx: MyContext): boolean {
	if (ctx.access?.isLmgLeader) return true;

	// Сброс меню → главное
	ctx.session.menuStack = ["main"];
	ctx.session.lastSection = "main";

	void safeReply(ctx, COMMON.mainMenuTitle, { reply_markup: replyMainKeyboard(ctx) });

	return false;
}

/**
 * Доступ к разделу «Церковь»: только члены церкви (AUTHORIZED). Пасторы дублируются в списке.
 */
export function requireChurchAccess(ctx: MyContext): boolean {
	if (ctx.access?.isPrivileged) return true;

	ctx.session.menuStack = ["main"];
	ctx.session.lastSection = "main";

	void safeReply(ctx, COMMON.mainMenuTitle, { reply_markup: replyMainKeyboard(ctx) });

	return false;
}

/**
 * Проверяет, является ли пользователь членом Пресвитерского совета.
 * Если нет — мягко перекидывает в главное меню.
 */
export function requirePresbyterianCouncil(ctx: MyContext): boolean {
	if (ctx.access?.isPresbyterianCouncil) return true;

	// Сброс меню → главное
	ctx.session.menuStack = ["main"];
	ctx.session.lastSection = "main";

	void safeReply(ctx, COMMON.mainMenuTitle, { reply_markup: replyMainKeyboard(ctx) });

	return false;
}
