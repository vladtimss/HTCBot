import { session } from "grammy";
import { MyContext, SessionData } from "../types/grammy-context";
import { isPrivileged, canSeeFourthButton } from "../services/access";

function initial(): SessionData {
	return { menuStack: ["main"] };
}

export const sessionMiddleware = session({ initial });

export function authMiddleware() {
	return async (ctx: MyContext, next: () => Promise<void>) => {
		ctx.access = {
			isPrivileged: isPrivileged(ctx),
			canSeeFourthButton: canSeeFourthButton(ctx),
			username: ctx.from?.username,
			telegramId: ctx.from?.id,
		};
		await next();
	};
}
