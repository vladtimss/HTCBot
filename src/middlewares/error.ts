import { MyContext } from "../types/grammy-context";
import { logger } from "../utils/logger";

export function withErrorBoundary() {
	return async (ctx: MyContext, next: () => Promise<void>) => {
		try {
			await next();
		} catch (err: any) {
			logger.error({ err }, "Bot error");
			if (ctx.callbackQuery) {
				await ctx
					.answerCallbackQuery({
						text: "Произошла ошибка. Попробуйте ещё раз.",
						show_alert: true,
					})
					.catch(() => {});
			} else {
				await ctx.reply("Произошла ошибка. Попробуйте ещё раз.").catch(() => {});
			}
		}
	};
}
