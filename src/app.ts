import { Bot } from "grammy";
import { env } from "./config/env";
import { MyContext } from "./types/grammy-context";
import { logger } from "./utils/logger";
import { withErrorBoundary } from "./middlewares/error";
import { sessionMiddleware, authMiddleware } from "./middlewares/auth";

// фичи
import { registerStart } from "./features/start";
import { registerMainMenu, mainMenuKeyboard } from "./features/main-menu";
import { registerSunday } from "./features/sunday-service";
import { registerAbout } from "./features/about-htc";
import { registerSmallGroups } from "./features/small-groups";

const bot = new Bot<MyContext>(env.BOT_TOKEN);

// middleware
bot.use(withErrorBoundary());
bot.use(sessionMiddleware);
bot.use(authMiddleware());

bot.use(async (ctx, next) => {
	logger.info(
		{
			from: ctx.from?.username,
			id: ctx.from?.id,
			type: ctx.update.update_id,
			msg: ctx.message?.text ?? ctx.callbackQuery?.data,
		},
		"update"
	);
	await next();
});

// фичи
registerStart(bot);
registerMainMenu(bot);
registerSunday(bot);
registerAbout(bot);
registerSmallGroups(bot);

// если пользователь напишет текстом в ЛС — покажем меню
bot.on("message", async (ctx) => {
	if (ctx.chat.type === "private") {
		await ctx.reply("*Главное меню*", {
			parse_mode: "Markdown",
			reply_markup: mainMenuKeyboard(ctx),
		});
	}
});

// запуск
bot.start({
	onStart: (me) => logger.info(`Bot @${me.username} started`),
});
