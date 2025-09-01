/**
 * auth.ts
 *
 * Здесь лежат два middleware:
 * 1) sessionMiddleware — подключает grammy сессию (ctx.session) и задаёт её начальное состояние.
 * 2) authMiddleware — вычисляет «доступы» пользователя (ctx.access), чтобы дальше
 *    в хендлерах можно было быстро понять, что ему показывать.
 *
 * ВАЖНО: sessionMiddleware должен быть подключён ДО authMiddleware,
 * чтобы внутри authMiddleware уже была доступна ctx.session
 */

import { session } from "grammy";
import { MyContext, SessionData } from "../types/grammy-context";
import { isPrivileged, canSeeFourthButton } from "../services/access";

/**
 * Начальное состояние сессии пользователя.
 *
 * menuStack — «стек» навигации текста/разделов, который можно использовать для простого «назад».
 *             По умолчанию кладём "main", чтобы бот знал, что мы на главном экране.
 * lastSection — последняя логическая секция, где находится пользователь (например: "main", "about", "about/belief", "sunday", ...).
 *               Удобно для контекстных кнопок «Назад» или условия показа разных клавиатур.
 */
function initial(): SessionData {
	return { menuStack: ["main"], lastSection: "main" };
}

/**
 * sessionMiddleware
 *
 * Подключает встроенную в grammy сессию.
 * - По умолчанию хранится в памяти процесса (in-memory). После рестарта бота сессии пропадут.
 *
 * Здесь мы передаём `initial`, чтобы у каждого нового пользователя
 * ctx.session создавалась сразу с ожидаемой структурой.
 */
export const sessionMiddleware = session({ initial });

/**
 * authMiddleware
 *
 * Обогащает контекст `ctx` полем `access`, где лежат флаги доступа и базовые идентификаторы.
 * Это удобный, быстрый слой авторизации/фич-флагов для ветвления логики в обработчиках:
 *   - access.isPrivileged        — расширенный доступ (лидеры/админы и т.п.)
 *   - access.canSeeFourthButton  — пример фича-флага для отображения дополнительной кнопки
 *   - access.username            — @username из Telegram, если есть
 *   - access.telegramId          — числовой id пользователя Telegram
 *
 * Реальные правила доступа инкапсулированы в сервисе services/access.ts:
 *   - isPrivileged(ctx)
 *   - canSeeFourthButton(ctx)
 *
 * ПРИМЕЧАНИЕ: ctx.from может быть undefined в некоторых типах апдейтов (нестандартные случаи),
 * поэтому доступ к полям берём опционально (через ?.).
 */
export function authMiddleware() {
	return async (ctx: MyContext, next: () => Promise<void>) => {
		// Вычисляем и сохраняем «доступы» на текущий апдейт
		ctx.access = {
			isPrivileged: isPrivileged(ctx),
			canSeeFourthButton: canSeeFourthButton(ctx),
			username: ctx.from?.username,
			telegramId: ctx.from?.id,
		};

		// Передаём управление следующему middleware/хендлеру
		await next();
	};
}
