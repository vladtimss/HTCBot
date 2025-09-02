// src/services/access.ts
import { MyContext } from "../types/grammy-context";
import { env } from "../config/env";

// нормализуем username: убираем @ и приводим к lower-case
function normalizeUsername(u?: string | null): string | null {
	if (!u) return null;
	return u.replace(/^@/, "").toLowerCase();
}

/**
 * Привилегирован ли пользователь (по username из ENV)
 */
export function isPrivileged(ctx: MyContext): boolean {
	const uname = normalizeUsername(ctx.from?.username);
	if (!uname) return false;
	return env.AUTHORIZED_USERNAMES.includes(uname);
}
