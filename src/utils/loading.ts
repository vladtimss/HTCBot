/**
 * utils/loading.ts
 * --------------------------
 * Утилита для отображения "ожидания" при долгих операциях.
 * Если задача выполняется дольше delayMs — в чат отправляется сообщение.
 * После завершения задача убирает/редактирует сообщение.
 */

import type { Message }   from "grammy/types";
import type { MyContext } from "../types/grammy-context";
import type { ParseMode } from "../constants/parse-mode";

/** Опции показа сообщения об ожидании */
export interface LoadingOptions {
	text?: string; // текст сообщения (по умолчанию: "⏳ Загружаю…")
	delayMs?: number; // задержка перед показом (мс)
	parseMode?: ParseMode; // режим парсинга текста
}

/** Состояние загрузки */
interface LoadingState {
	timer: ReturnType<typeof setTimeout>;
	loadingMsg: Message.TextMessage | undefined;
	shown: boolean;
}

/**
 * Создаёт таймер для показа сообщения загрузки
 */
function createLoadingTimer(
	ctx: MyContext,
	text: string,
	delayMs: number,
	parseMode?: ParseMode
): LoadingState {
	const state: LoadingState = {
		timer: undefined!,
		loadingMsg: undefined,
		shown: false,
	};

	state.timer = setTimeout(async () => {
		try {
			state.shown = true;
			state.loadingMsg = await ctx.reply(text, {
				parse_mode: parseMode,
				link_preview_options: { is_disabled: true },
			});
		} catch {
			// Игнорируем ошибки отправки
		}
	}, delayMs);

	return state;
}

/**
 * Обрабатывает ошибку загрузки: редактирует сообщение или игнорирует
 */
async function handleLoadingError(ctx: MyContext, state: LoadingState): Promise<void> {
	if (state.timer) clearTimeout(state.timer);
	if (state.shown && state.loadingMsg) {
		try {
			await ctx.api.deleteMessage(state.loadingMsg.chat.id, state.loadingMsg.message_id);
		} catch {
			// Если удалить нельзя — пробуем заменить текст
			try {
				await ctx.api.editMessageText(
					state.loadingMsg.chat.id,
					state.loadingMsg.message_id,
					"⚠️ Не удалось загрузить данные"
				);
			} catch {
				// Игнорируем ошибки редактирования
			}
		}
	}
}

/**
 * Обёртка для асинхронной операции с "ожиданием".
 * После завершения удаляет сообщение загрузки.
 */
export async function withLoading<T>(ctx: MyContext, task: () => Promise<T>, options: LoadingOptions = {}): Promise<T> {
	const { text = "⏳ Загружаю…", delayMs = 300, parseMode } = options;
	const state = createLoadingTimer(ctx, text, delayMs, parseMode);

	try {
		const result = await task();

		// Операция завершилась → убираем сообщение
		if (state.timer) clearTimeout(state.timer);
		if (state.shown && state.loadingMsg) {
			try {
				await ctx.api.deleteMessage(state.loadingMsg.chat.id, state.loadingMsg.message_id);
			} catch {
				// Если удалить нельзя → заменяем текст
				try {
					await ctx.api.editMessageText(state.loadingMsg.chat.id, state.loadingMsg.message_id, "✅ Готово");
				} catch {
					// Игнорируем любые ошибки
				}
			}
		}

		return result;
	} catch (err) {
		await handleLoadingError(ctx, state);
		throw err;
	}
}

/**
 * Обёртка для асинхронной операции с "ожиданием".
 * После завершения возвращает сообщение загрузки для дальнейшего редактирования.
 */
export async function withLoadingAndMsg<T>(
	ctx: MyContext,
	task: () => Promise<T>,
	options: LoadingOptions = {}
): Promise<{ result: T; loadingMsg?: Message.TextMessage }> {
	const { text = "⏳ Загружаю…", delayMs = 300, parseMode } = options;
	const state = createLoadingTimer(ctx, text, delayMs, parseMode);

	try {
		const result = await task();
		if (state.timer) clearTimeout(state.timer);
		return { result, loadingMsg: state.loadingMsg };
	} catch (err) {
		await handleLoadingError(ctx, state);
		throw err;
	}
}

/** Опции для прогресс-индикатора */
export interface ProgressOptions {
	firstMessageText?: string;
	secondMessageText?: string;
	firstMessageDelayMs?: number;
	secondMessageIntervalMs?: number;
	secondMessageDurationMs?: number;
	parseMode?: ParseMode;
}

type ProgressState = {
	firstMessage?: Message.TextMessage;
	secondMessage?: Message.TextMessage;
	firstMessageTimer?: ReturnType<typeof setTimeout>;
	secondMessageInterval?: ReturnType<typeof setInterval>;
	secondMessageDeleteTimer?: ReturnType<typeof setTimeout>;
	isCompleted: boolean;
};

/**
 * Обёртка для долгих операций с прогресс-индикатором.
 * 
 * Показывает два сообщения:
 * 1. Первое сообщение - показывается сразу (с задержкой firstMessageDelayMs)
 * 2. Второе сообщение - показывается периодически (каждые secondMessageIntervalMs),
 *    автоматически удаляется через secondMessageDurationMs
 * 
 * При завершении операции (успешном или с ошибкой) все сообщения удаляются.
 */
export async function withProgressMessages<T>(
	ctx: MyContext,
	task: () => Promise<T>,
	options: ProgressOptions = {}
): Promise<{ result: T; firstMessage?: Message.TextMessage; secondMessage?: Message.TextMessage }> {
	const {
		firstMessageText = "",
		secondMessageText = "",
		firstMessageDelayMs = 300,
		secondMessageIntervalMs = 5000,
		secondMessageDurationMs = 2000,
		parseMode,
	} = options;

	// Состояние для отслеживания таймеров и сообщений
	const state: ProgressState = { isCompleted: false };

	// Безопасная отправка сообщения (игнорирует ошибки)
	const safeReply = async (text: string, mode?: ParseMode) => {
		try {
			return await ctx.reply(text, {
				parse_mode: mode,
				link_preview_options: { is_disabled: true },
			});
		} catch {
			return undefined;
		}
	};

	// Безопасное удаление сообщения (игнорирует ошибки)
	const safeDelete = async (msg?: Message.TextMessage) => {
		if (!msg) {
			return;
		}
		try {
			await ctx.api.deleteMessage(msg.chat.id, msg.message_id);
		} catch {
			// Игнорируем ошибки удаления
		}
	};

	// Очистка всех таймеров и удаление всех сообщений
	const cleanup = async () => {
		state.isCompleted = true;

		// Останавливаем все таймеры
		if (state.firstMessageTimer) {
			clearTimeout(state.firstMessageTimer);
		}
		if (state.secondMessageInterval) {
			clearInterval(state.secondMessageInterval);
		}
		if (state.secondMessageDeleteTimer) {
			clearTimeout(state.secondMessageDeleteTimer);
		}

		// Удаляем все сообщения
		await safeDelete(state.firstMessage);
		await safeDelete(state.secondMessage);
	};

	// Показ второго сообщения с автоматическим удалением через указанное время
	const showSecondMessage = async () => {
		// Не показываем, если операция завершена или сообщение уже показано
		if (state.isCompleted || state.secondMessage) {
			return;
		}

		// Отправляем второе сообщение
		state.secondMessage = await safeReply(secondMessageText, parseMode ?? "MarkdownV2");

		if (!state.secondMessage) {
			return;
		}

		// Устанавливаем таймер на автоматическое удаление второго сообщения
		state.secondMessageDeleteTimer = setTimeout(async () => {
			if (state.isCompleted) {
				return;
			}
			await safeDelete(state.secondMessage);
			state.secondMessage = undefined;
		}, secondMessageDurationMs);
	};

	// Запускаем таймер для показа первого сообщения
	state.firstMessageTimer = setTimeout(async () => {
		if (state.isCompleted) {
			return;
		}
		state.firstMessage = await safeReply(firstMessageText, parseMode);
	}, firstMessageDelayMs);

	// Запускаем таймер для первого показа второго сообщения,
	// затем запускаем интервал для периодического показа
	setTimeout(() => {
		if (state.isCompleted) {
			return;
		}
		// Показываем второе сообщение первый раз
		void showSecondMessage();
		// Запускаем интервал для периодического показа второго сообщения
		state.secondMessageInterval = setInterval(showSecondMessage, secondMessageIntervalMs);
	}, secondMessageIntervalMs);

	// Выполняем задачу и очищаем ресурсы
	try {
		const result = await task();
		await cleanup();
		return { result, firstMessage: state.firstMessage, secondMessage: state.secondMessage };
	} catch (err) {
		await cleanup();
		throw err;
	}
}
