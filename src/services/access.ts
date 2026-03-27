/**
 * services/access.ts
 * --------------------------
 * Проверка доступа: члены церкви, пресвитеры, лидеры ЛМГ, dev-симуляция ролей.
 */

import type { AccessData, MyContext } from "../types/grammy-context";
import { env } from "../config/env";

/** Роли для DEV_ACCESS_ROLE (симуляция одного тестового пользователя) */
export type DevAccessRole = "other" | "membership" | "lmg" | "pastor";

/** Нормализация username: убираем @ и приводим к lower-case */
export function normalizeUsername(u?: string | null): string | null {
	if (!u) return null;
	return u.replace(/^@/, "").toLowerCase();
}

function parseDevAccessRole(raw?: string): DevAccessRole | null {
	if (!raw) return null;
	const r = raw.trim().toLowerCase();
	if (r === "other" || r === "membership" || r === "lmg" || r === "pastor") return r;
	return null;
}

function roleToAccess(role: DevAccessRole): Pick<AccessData, "isPrivileged" | "isPresbyterianCouncil" | "isLmgLeader"> {
	switch (role) {
		case "other":
			return { isPrivileged: false, isPresbyterianCouncil: false, isLmgLeader: false };
		case "membership":
			return { isPrivileged: true, isPresbyterianCouncil: false, isLmgLeader: false };
		case "lmg":
			return { isPrivileged: true, isPresbyterianCouncil: false, isLmgLeader: true };
		case "pastor":
			return { isPrivileged: true, isPresbyterianCouncil: true, isLmgLeader: true };
	}
}

/**
 * Лидер ЛМГ: union `LMG_USERNAMES` и `tgUserName` из LEADERS_JSON_BASE64.
 */
export function isLmgLeaderFromEnv(uname: string | null): boolean {
	if (!uname) return false;
	if (env.LMG_USERNAMES.includes(uname)) return true;
	const leaders = Object.values(env.LEADERS ?? {});
	return leaders.some((leader) => normalizeUsername(leader.tgUserName) === uname);
}

/**
 * Собирает права для ctx: списки из env или симуляция роли (DEV_ACCESS_*).
 */
export function buildAccessData(ctx: MyContext): AccessData {
	const username = ctx.from?.username;
	const telegramId = ctx.from?.id;
	const uname = normalizeUsername(username);

	if (
		env.DEV_ACCESS_ENABLED &&
		env.DEV_ACCESS_USERNAME &&
		uname &&
		uname === env.DEV_ACCESS_USERNAME
	) {
		const role = parseDevAccessRole(env.DEV_ACCESS_ROLE);
		if (role) {
			const flags = roleToAccess(role);
			return {
				...flags,
				username,
				telegramId,
				devAccessSimulatedRole: role,
			};
		}
	}

	return {
		isPrivileged: Boolean(uname && env.AUTHORIZED_USERNAMES.includes(uname)),
		isPresbyterianCouncil: Boolean(uname && env.PRESBYTERIAN_COUNCIL_USERNAMES.includes(uname)),
		isLmgLeader: isLmgLeaderFromEnv(uname),
		username,
		telegramId,
		devAccessSimulatedRole: undefined,
	};
}

/**
 * @deprecated Используйте ctx.access после authMiddleware; оставлено для совместимости.
 */
export function isHTChurchLMG(ctx: MyContext): boolean {
	return Boolean(ctx.access?.isLmgLeader);
}
