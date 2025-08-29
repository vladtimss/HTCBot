import { Bot } from "grammy";
import { env } from "./config/env";
import { MyContext } from "./types/grammy-context";
import { logger } from "./utils/logger";
import { withErrorBoundary } from "./middlewares/error";
import { authMiddleware, sessionMiddleware } from "./middlewares/auth";

import { registerStart } from "./features/start";
import { registerMainMenu, mainMenuKeyboard } from "./features/main-menu";
import { registerSunday } from "./features/sunday-service";
import { registerAbout } from "./features/about-htc";
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

// Универсальный «Назад»: вытаскиваем предыдущий экран и рендерим его
bot.callbackQuery("nav:back", async (ctx) => {
	if (ctx.session.menuStack.length > 1) {
		ctx.session.menuStack.pop(); // убираем текущий экран
	}
	const current = ctx.session.menuStack.at(-1) ?? "main";

	switch (current) {
		case "main":
			await ctx.editMessageText("*Главное меню*", {
				parse_mode: "Markdown",
				reply_markup: mainMenuKeyboard(ctx),
			});
			break;

		case "sunday":
			// здесь можно напрямую вызвать логику для воскресных служений
			await ctx.editMessageText(
				"📖 Расписание воскресных богослужений:\n\n• 11:00 — основное служение\n• 18:00 — молодежное служение",
				{
					parse_mode: "Markdown",
					reply_markup: {
						inline_keyboard: [[{ text: "⬅️ Назад", callback_data: "nav:back" }]],
					},
				}
			);
			break;

		default:
			// Для всех прочих — откат в главное меню
			await ctx.editMessageText("*Главное меню*", {
				parse_mode: "Markdown",
				reply_markup: mainMenuKeyboard(ctx),
			});
			ctx.session.menuStack = ["main"];
	}
});

// Если юзер пишет текстом в ЛС — показываем главное меню
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
