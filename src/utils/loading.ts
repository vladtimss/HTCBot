// src/utils/loading.ts
/**
 * Универсальная утилита с индикатором загрузки.
 *
 * Показать сообщение о загрузке только через delayMs (по умолчанию 300ms).
 * Если операция закончилась раньше — сообщение не показывается.
 * Если сообщение показано — гарантированно попытаемся удалить его в finally (ожидаем
 * завершения ctx.reply, чтобы не оставить "висящий" loader).
 *
 * ctx должен быть grammY-контекстом (можно any).
 */

export async function withLoading<T>(
	ctx: any,
	fn: () => Promise<T>,
	opts?: { text?: string; delayMs?: number }
): Promise<T> {
	const text = opts?.text ?? "⏳ Пожалуйста, подождите...";
	const delayMs = typeof opts?.delayMs === "number" ? opts.delayMs : 500;

	let loaderMsg: any = null; // объект сообщения, если оно появилось
	let loaderPromise: Promise<any> | null = null; // промис ctx.reply (если был запущен)
	let timer: NodeJS.Timeout | null = null;

	// Запланировать показ loader'а через delayMs.
	timer = setTimeout(() => {
		// Сохраняем промис — чтобы в finally можно было дождаться создания сообщения
		loaderPromise = (async () => {
			try {
				const m = await ctx.reply(text);
				loaderMsg = m;
				return m;
			} catch (e) {
				// если не удалось показать loader — безопасно игнорируем
				loaderMsg = null;
				return null;
			}
		})();
	}, delayMs);

	try {
		// Выполняем основную работу
		const res = await fn();
		return res;
	} finally {
		// Отменяем таймер (если он ещё не сработал)
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}

		// Если показ loader'а запущен (loaderPromise существует) - дождёмся его завершения,
		// чтобы получить message_id и корректно удалить сообщение.
		if (loaderPromise) {
			try {
				await loaderPromise;
			} catch {
				// игнорируем ошибки показа loader'а
			}
		}

		// Если сообщение loader'а успешно показалось — удаляем его
		if (loaderMsg) {
			try {
				// пытаемся получить chatId/messageId из ответа на ctx.reply
				const chatId = loaderMsg?.chat?.id ?? ctx?.chat?.id ?? (ctx?.callbackQuery as any)?.message?.chat?.id;
				const messageId = (loaderMsg as any)?.message_id ?? (loaderMsg as any)?.message?.message_id;
				if (chatId && messageId) {
					try {
						await ctx.api.deleteMessage(chatId, messageId);
					} catch {
						// игнорируем — возможно сообщение уже удалено/недоступно
					}
				}
			} catch {
				// игнорируем любые ошибки удаления
			}
		}
	}
}
