/**
 * error.ts
 *
 * Middleware-«обёртка» для глобальной обработки ошибок.
 *
 * Задачи:
 * 1. Поймать любое исключение внутри цепочки middleware/хендлеров.
 * 2. Залогировать ошибку через общий logger.
 * 3. Уведомить пользователя сообщением («Попробуйте ещё раз»).
 */

import { MyContext } from "../types/grammy-context";
import { logger } from "../utils/logger";
import { isGrammyTooManyRequests, safeReply } from "../utils/telegram-flood";

/**
 * withErrorBoundary
 *
 * Возвращает middleware, которое оборачивает каждый апдейт в try/catch.
 *
 * Поведение:
 * - Если код внутри `next()` проходит без ошибок → просто продолжаем цепочку.
 * - Если возникает исключение:
 *   - Логируем его (logger.error).
 *   - В зависимости от типа апдейта (callbackQuery или обычное сообщение)
 *     уведомляем пользователя.
 *     * Для callbackQuery используем answerCallbackQuery с show_alert: true
 *       → всплывающее окно в Telegram.
 *     * Для обычного текста — отправляем reply с текстом ошибки.
 *
 * catch(() => {}) после отправки ответа нужен для того,
 * чтобы даже если Telegram API вернёт ошибку (например, «сообщение слишком старое»),
 * бот не упал повторно внутри обработчика ошибки.
 */
export function withErrorBoundary() {
	return async (ctx: MyContext, next: () => Promise<void>) => {
		try {
			// Выполняем остальные middleware/хендлеры
			await next();
		} catch (err: any) {
			// Логируем ошибку со всеми деталями
			logger.error({ err }, "Bot error");

			if (isGrammyTooManyRequests(err)) {
				return;
			}

			if (ctx.callbackQuery) {
				await ctx
					.answerCallbackQuery({
						text: "Произошла ошибка. Попробуйте ещё раз.",
						show_alert: true,
					})
					.catch(() => {});
			} else {
				await safeReply(ctx, "Произошла ошибка. Попробуйте ещё раз.");
			}
		}
	};
}
