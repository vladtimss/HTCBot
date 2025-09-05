/**
 * app.ts
 * --------------------------
 * Точка входа Telegram-бота:
 *  - создаём инстанс бота
 *  - подключаем middleware
 *  - регистрируем модули с обработчиками
 *  - запускаем бота
 */

import { Bot } from "grammy";
import { env } from "./config/env";
import { MyContext } from "./types/grammy-context";
import { logger } from "./utils/logger";
import { withErrorBoundary } from "./middlewares/error";
import { authMiddleware, sessionMiddleware } from "./middlewares/auth";

import { registerStart } from "./features/start";
import { registerMainMenu, renderMain } from "./features/main-menu";
import { registerSunday } from "./features/sunday-service";
import { registerSmallGroups } from "./features/small-groups";
import { MENU_LABELS } from "./constants/button-lables";
import { registerChurchCalendar } from "./features/church-calendar";
import { registerNavigation } from "./features/navigation";
import { registerSermons } from "./features/sermons";
import { registerAboutHTC } from "./features/about-htc";

/** Создание инстанса бота */
const bot = new Bot<MyContext>(env.BOT_TOKEN);

/* ============
 *  Middleware
 * ============ */

// Ловим и логируем ошибки, чтобы бот не падал
bot.use(withErrorBoundary());

// Сессии: храним состояние пользователя (например, текущий раздел)
bot.use(sessionMiddleware);

// Авторизация: добавляет в ctx.access данные о ролях/доступе
bot.use(authMiddleware());

/* ============
 *  Логирование
 * ============ */
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

/* ============
 *  Регистрация фич
 * ============ */
registerStart(bot); // Команда /start
registerMainMenu(bot); // Главное меню
registerSunday(bot); // Воскресное богослужение
registerAboutHTC(bot); // Раздел "О нас"
registerSmallGroups(bot); // Малые группы
registerChurchCalendar(bot); // Церковный календарь
registerSermons(bot); // Проповеди
registerNavigation(bot); // Навигация (кнопка "Назад")

/* ===================================
 *  Общий обработчик сообщений
 * =================================== */
bot.on("message", async (ctx) => {
	// Игнорируем все чаты кроме личных
	if (ctx.chat.type !== "private") return;

	// Известные кнопки главного меню
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

	// Если пришёл неизвестный текст — возвращаем пользователя в главное меню
	if (!ctx.message.text || !known.has(ctx.message.text)) {
		await renderMain(ctx);
	}
});

/* ============
 *  Запуск бота
 * ============ */
bot.start({
	onStart: (me) => logger.info(`Bot @${me.username} started`),
});
