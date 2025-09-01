import { Api, Bot, RawApi } from "grammy";
import { env } from "./config/env";
import { MyContext } from "./types/grammy-context";
import { logger } from "./utils/logger";
import { withErrorBoundary } from "./middlewares/error";
import { authMiddleware, sessionMiddleware } from "./middlewares/auth";

import { registerStart } from "./features/start";
import { registerMainMenu, renderMain } from "./features/main-menu";
import { registerSunday } from "./features/sunday-service";
import { registerAbout } from "./features/about-htc";
import { registerSmallGroups } from "./features/small-groups";
import { MENU_LABELS } from "./constants/button-lables";
import { registerChurchCalendar } from "./features/church-calendar";
import { registerNavigation } from "./features/navigation";

/**
 * Инициализация Telegram-бота
 */
const bot = new Bot<MyContext>(env.BOT_TOKEN);

/**
 * ========================
 *   Подключаем middlewares
 * ========================
 */

// Глобальная «обёртка» для ошибок — перехватывает и логирует все ошибки
bot.use(withErrorBoundary());

// Храним данные о пользователе в сессии (например, текущий раздел меню)
bot.use(sessionMiddleware);

// Проверяем авторизацию (например, доступ к закрытым функциям)
bot.use(authMiddleware());

/**
 * ========================
 *   Логирование апдейтов
 * ========================
 */
bot.use(async (ctx, next) => {
	// Формируем объект для логов
	logger.info(
		{
			from: ctx.from?.username, // ник юзера (если есть)
			id: ctx.from?.id, // id пользователя
			type: Object.keys(ctx.update)[1] ?? "unknown", // тип апдейта (message, callback_query и т.п.)
			payload: ctx.message?.text ?? ctx.callbackQuery?.data, // текст сообщения или data из кнопки
		},
		"update"
	);

	// Передаём управление дальше по цепочке middlewares
	await next();
});

/**
 * ========================
 *   Регистрация фич
 * ========================
 * Каждая "фича" — отдельный модуль с собственными командами/обработчиками.
 */
registerStart(bot); // Команда /start
registerMainMenu(bot); // Главное меню
registerSunday(bot); // Воскресное богослужение
registerAbout(bot); // Раздел "О нас"
registerSmallGroups(bot); // Малые группы
registerChurchCalendar(bot); // Церковный календарь
registerNavigation(bot); // Навигация (кнопка назад)

/**
 * ========================
 *   Общий обработчик сообщений
 * ========================
 * Если пользователь пишет текстом в ЛС, а не через кнопки —
 * проверяем, что это не одна из «известных» кнопок.
 * Если неизвестно → показываем главное меню.
 */
bot.on("message", async (ctx) => {
	// Игнорируем групповые чаты
	if (ctx.chat.type !== "private") return;

	// Набор всех допустимых кнопок (reply-клавиатуры)
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

/**
 * ========================
 *   Запуск бота
 * ========================
 */
bot.start({
	onStart: (me) => logger.info(`Bot @${me.username} started`),
});
