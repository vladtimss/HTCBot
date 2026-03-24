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

import { registerStart } from "./features/start/start.feature";
import { registerMainMenu, renderMain } from "./features/main-menu/main-menu.feature";
import { registerSunday } from "./features/sunday-service/sunday-service.feature";
import { registerSmallGroups } from "./features/small-groups/small-groups.feature";
import { MENU_LABELS } from "./constants/button-lables";
import { NAVIGATION_LABELS } from "./constants/navigation";
import { ABOUT_BUTTON_LABELS } from "./features/about-htc/about-htc.constants";
import { CALENDAR_BUTTON_LABELS } from "./features/church-calendar/church-calendar.constants";
import { registerChurchCalendar } from "./features/church-calendar/church-calendar.feature";
import { registerBackButton } from "./features/global-back-button-navigation/global-back-button-navigation.feature";
import { registerSermons } from "./features/sermons/sermons.feature";
import { registerAboutHTC } from "./features/about-htc/about-htc.feature";
import { registerLmgNotesFeature } from "./features/lmg-notes/lmg-notes.feature";
import { registerPresbyterianCouncil } from "./features/presbyterian-council/presbyterian-council.feature";
import { PRESBYTERIAN_COUNCIL_BUTTON_LABELS } from "./features/presbyterian-council/presbyterian-council.constants";

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
registerLmgNotesFeature(bot);
registerPresbyterianCouncil(bot); // Пресвитерский совет
registerChurchCalendar(bot); // Церковный календарь
registerSermons(bot); // Проповеди
registerBackButton(bot); // Кнопка "Назад"

/* ===================================
 *  Общий обработчик сообщений
 * =================================== */
bot.on("message", async (ctx) => {
	// Игнорируем все чаты кроме личных
	if (ctx.chat.type !== "private") return;

	// Известные кнопки главного меню
	const known = new Set<string>([
		MENU_LABELS.MAIN_SUNDAY,
		MENU_LABELS.MAIN_GROUPS,
		MENU_LABELS.MAIN_PRESBYTERIAN_COUNCIL,
		CALENDAR_BUTTON_LABELS.CAL_NEXT3,
		MENU_LABELS.MAIN_ABOUT,
		NAVIGATION_LABELS.NAV_MAIN,
		NAVIGATION_LABELS.NAV_BACK,
		ABOUT_BUTTON_LABELS.ABOUT_CHANNEL,
		ABOUT_BUTTON_LABELS.ABOUT_BELIEF,
		ABOUT_BUTTON_LABELS.ABOUT_HISTORY,
		PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA,
		PRESBYTERIAN_COUNCIL_BUTTON_LABELS.PC_AGENDA_NEXT,
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
