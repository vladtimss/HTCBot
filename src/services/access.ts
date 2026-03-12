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
 * Проверяет, есть ли у пользователя общие привилегии (член церкви).
 * Основано только на списке AUTHORIZED_USERNAMES.
 */
export function isHTChurchMember(ctx: MyContext): boolean {
	const uname = normalizeUsername(ctx.from?.username);
	if (!uname) return false;
	return env.AUTHORIZED_USERNAMES.includes(uname);
}

/**
 * Проверяет, является ли пользователь лидером ЛМГ.
 * Основано на env.LEADERS (LEADERS_JSON_BASE64), поле tgUserName.
 */
export function isHTChurchLMG(ctx: MyContext): boolean {
	const uname = normalizeUsername(ctx.from?.username);
	if (!uname) return false;

	const leaders = Object.values(env.LEADERS ?? {});
	return leaders.some((leader) => normalizeUsername(leader.tgUserName) === uname);
}
