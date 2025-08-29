import { session } from "grammy";
import { MyContext, SessionData } from "../types/grammy-context";
import { canSeeFourthButton, isProUser } from "../services/access";

function initial(): SessionData {
	return { menuStack: ["main"] };
}

export const sessionMiddleware = session({ initial });

export function authMiddleware() {
	return async (ctx: MyContext, next: () => Promise<void>) => {
		ctx.access = {
			isProUser: isProUser(ctx),
			username: ctx.from?.username,
			telegramId: ctx.from?.id,
		};
		ctx.canSeeFourthButton = canSeeFourthButton(ctx);
		await next();
	};
}
