// src/middleware/auth.ts
import { session } from "grammy";
import { MyContext, SessionData } from "../types/grammy-context";
import { buildAccessData } from "../services/access";

/**
 * Начальное состояние сессии пользователя.
 */
function initial(): SessionData {
	return { menuStack: ["main"], lastSection: "main" };
}

/** Встроенная grammy-сессия */
export const sessionMiddleware = session({ initial });

/**
 * authMiddleware
 * Кладём в ctx.access вычисленные флаги и идентификаторы.
 */
export function authMiddleware() {
	return async (ctx: MyContext, next: () => Promise<void>) => {
		ctx.access = buildAccessData(ctx);
		await next();
	};
}
