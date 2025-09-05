/**
 * services/access.ts
 * --------------------------
 * Проверка доступа (привилегирован ли пользователь).
 */

import { MyContext } from "../types/grammy-context";
import { env } from "../config/env";

/** Нормализация username: убираем @ и приводим к lower-case */
function normalizeUsername(u?: string | null): string | null {
	if (!u) return null;
	return u.replace(/^@/, "").toLowerCase();
}

/**
 * Проверяет, есть ли у пользователя привилегии.
 * Основано на списке AUTHORIZED_USERNAMES.
 */
export function isPrivileged(ctx: MyContext): boolean {
	const uname = normalizeUsername(ctx.from?.username);
	if (!uname) return false;
	return env.AUTHORIZED_USERNAMES.includes(uname);
}
