import { Bot } from "grammy";
import { env } from "./config/env";
import { MyContext } from "./types/grammy-context";
import { logger } from "./utils/logger";
import { withErrorBoundary } from "./middlewares/error";
import { authMiddleware, sessionMiddleware } from "./middlewares/auth";

import { registerStart } from "./features/start";
import { registerMainMenu, renderMain, MENU_LABELS } from "./features/main-menu";
import { registerSunday, renderSunday } from "./features/sunday-service";
import { registerAbout, renderAboutRoot, renderAboutBelief, renderAboutHistory } from "./features/about-htc";
import { registerSmallGroups } from "./features/small-groups";

const bot = new Bot<MyContext>(env.BOT_TOKEN);

// middlewares
bot.use(withErrorBoundary());
bot.use(sessionMiddleware);
bot.use(authMiddleware());

// лог каждого апдейта
bot.use(async (ctx, next) => {
	logger.info(
		{
			from: ctx.from?.username,
			id: ctx.from?.id,
			type: Object.keys(ctx.update)[1] ?? "unknown",
			payload: ctx.message?.text ?? ctx.callbackQuery?.data,
		},
		"update"
	);
	await next();
});

// регистрация фич
registerStart(bot);
registerMainMenu(bot);
registerSunday(bot);
registerAbout(bot);
registerSmallGroups(bot);

// Если юзер пишет текстом в ЛС — просто показываем актуальное верхнее меню
bot.on("message", async (ctx) => {
	if (ctx.chat.type !== "private") return;

	// Если это не одна из известных кнопок — покажем главное меню
	const known = new Set([
		MENU_LABELS.SUNDAY,
		MENU_LABELS.GROUPS,
		MENU_LABELS.NEXT3,
		MENU_LABELS.ABOUT,
		MENU_LABELS.MAIN,
		MENU_LABELS.BACK,
		MENU_LABELS.CHANNEL,
		MENU_LABELS.BELIEF,
		MENU_LABELS.HISTORY,
	]);

	if (!ctx.message.text || !known.has(ctx.message.text)) {
		await renderMain(ctx);
	}
});

// запуск
bot.start({
	onStart: (me) => logger.info(`Bot @${me.username} started`),
});
