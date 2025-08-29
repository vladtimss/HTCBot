import { MyContext } from "../types/grammy-context";
import { PRO_USER_IDS, PRO_USERNAMES, FOURTH_BUTTON_USER_IDS, FOURTH_BUTTON_USERNAMES } from "../data/priviliged-users";

/**
 * Проверка «расширенного доступа» (лидеры/служители).
 * Сейчас — локально. Позже можно заменить на Builtin AI API.
 */
export function isProUser(ctx: MyContext): boolean {
	const uid = ctx.from?.id;
	const uname = ctx.from?.username?.toLowerCase();
	const idMatch = uid ? PRO_USER_IDS.includes(uid) : false;
	const unameMatch = uname
		? [...PRO_USERNAMES, ...FOURTH_BUTTON_USERNAMES].map((s) => s.toLowerCase()).includes(uname)
		: false;
	return idMatch || unameMatch;
}

/**
 * Кто имеет право видеть 4-ю кнопку на главной.
 * Можно выделить иной набор пользователей, чем для pro-доступа.
 */
export function canSeeFourthButton(ctx: MyContext): boolean {
	const uid = ctx.from?.id;
	const uname = ctx.from?.username?.toLowerCase();
	const idMatch = uid ? FOURTH_BUTTON_USER_IDS.includes(uid) : false;
	const unameMatch = uname ? FOURTH_BUTTON_USERNAMES.map((s) => s.toLowerCase()).includes(uname) : false;
	return idMatch || unameMatch || isProUser(ctx);
}
