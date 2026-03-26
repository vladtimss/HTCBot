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
	text?: string; // текст сообщения (спиннер добавляется автоматически)
	delayMs?: number; // задержка перед показом (мс)
	parseMode?: ParseMode; // режим парсинга текста
}

/** Состояние загрузки */
interface LoadingState {
	timer?: ReturnType<typeof setTimeout>;
	loadingMsg: Message.TextMessage | undefined;
	spinner: SpinnerControl | undefined;
	shown: boolean;
}

interface SpinnerMessageOptions {
	parseMode?: ParseMode;
	intervalMs?: number;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function removeLoadingMessage(
	ctx: MyContext,
	msg: Message.TextMessage | undefined,
	fallbackText?: string
): Promise<void> {
	if (!msg) {
		return;
	}

	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			await ctx.api.deleteMessage(msg.chat.id, msg.message_id);
			return;
		} catch {
			if (attempt < 2) {
				await sleep(120);
			}
		}
	}

	if (!fallbackText) {
		return;
	}

	try {
		await ctx.api.editMessageText(msg.chat.id, msg.message_id, fallbackText);
	} catch {
		// Игнорируем ошибки редактирования
	}
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
		timer: undefined,
		loadingMsg: undefined,
		spinner: undefined,
		shown: false,
	};

	state.timer = setTimeout(async () => {
		try {
			const { message, spinner } = await replyWithSpinner(ctx, text, { parseMode });
			state.shown = true;
			state.loadingMsg = message;
			state.spinner = spinner;
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
	state.spinner?.stop();
	if (state.shown && state.loadingMsg) {
		await removeLoadingMessage(ctx, state.loadingMsg, "⚠️ Не удалось загрузить данные");
	}
}

/**
 * Обёртка для асинхронной операции с "ожиданием".
 * После завершения удаляет сообщение загрузки.
 */
export async function withLoading<T>(ctx: MyContext, task: () => Promise<T>, options: LoadingOptions = {}): Promise<T> {
	const { text = "Загружаю…", delayMs = 300, parseMode } = options;
	const state = createLoadingTimer(ctx, text, delayMs, parseMode);

	try {
		const result = await task();

		// Операция завершилась → убираем сообщение
		if (state.timer) clearTimeout(state.timer);
		state.spinner?.stop();
		if (state.shown && state.loadingMsg) {
			await removeLoadingMessage(ctx, state.loadingMsg, "✅ Готово");
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
	const { text = "Загружаю…", delayMs = 300, parseMode } = options;
	const state = createLoadingTimer(ctx, text, delayMs, parseMode);

	try {
		const result = await task();
		if (state.timer) clearTimeout(state.timer);
		state.spinner?.stop();
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
	loadingMsg?: Message.TextMessage;
	spinner?: SpinnerControl;
	firstMessageTimer?: ReturnType<typeof setTimeout>;
	secondMessageTimer?: ReturnType<typeof setTimeout>;
	currentText: string;
	isCompleted: boolean;
};

/**
 * Обёртка для долгих операций с прогресс-индикатором.
 *
 * Показывает единый спиннер и при необходимости обновляет его текст,
 * если операция затянулась.
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
		parseMode,
	} = options;

	// Состояние для отслеживания таймеров и сообщений
	const state: ProgressState = {
		isCompleted: false,
		currentText: firstMessageText || secondMessageText || "Загружаю…",
	};

	const safeDelete = async (msg?: Message.TextMessage) => {
		await removeLoadingMessage(ctx, msg);
	};

	// Очистка всех таймеров и удаление всех сообщений
	const cleanup = async () => {
		state.isCompleted = true;

		// Останавливаем все таймеры
		if (state.firstMessageTimer) {
			clearTimeout(state.firstMessageTimer);
		}
		if (state.secondMessageTimer) {
			clearTimeout(state.secondMessageTimer);
		}
		state.spinner?.stop();

		// Удаляем сообщение лоадера
		await safeDelete(state.loadingMsg);
	};

	// Запускаем таймер для показа первого сообщения со спиннером
	state.firstMessageTimer = setTimeout(async () => {
		if (state.isCompleted) {
			return;
		}
		try {
			const { message, spinner } = await replyWithSpinner(ctx, state.currentText, {
				parseMode,
			});
			state.loadingMsg = message;
			state.spinner = spinner;
		} catch {
			// Игнорируем ошибки отправки
		}
	}, firstMessageDelayMs);

	// Если операция долгая, обновляем текст в том же самом спиннере
	if (secondMessageText) {
		state.currentText = firstMessageText || state.currentText;
		state.secondMessageTimer = setTimeout(() => {
			if (state.isCompleted) {
				return;
			}
			state.currentText = secondMessageText;
			state.spinner?.setText(secondMessageText);
		}, Math.max(firstMessageDelayMs, secondMessageIntervalMs));
	}

	// Выполняем задачу и очищаем ресурсы
	try {
		const result = await task();
		await cleanup();
		return { result, firstMessage: state.loadingMsg, secondMessage: undefined };
	} catch (err) {
		await cleanup();
		throw err;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Spinner (анимированный лоадер через edit message)
// ─────────────────────────────────────────────────────────────────────────────

/** Управление анимированным спиннером */
export interface SpinnerControl {
	/** Обновить текст подписи (анимация продолжается) */
	setText(newText: string): void;

	/** Остановить анимацию */
	stop(): void;
}

/** Кадры анимации — вращающиеся часы */
const SPINNER_FRAMES = ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"] as const;

const LOADER_PREFIX_RE = /^(?:[🕐-🕛]|⏳|⌛\uFE0F?)\s*/u;

/** Нормализовать текст: убираем старые loader-эмодзи, спиннер добавляется автоматически */
function normalizeLoadingText(text: string): string {
	return text.replace(LOADER_PREFIX_RE, "");
}

/** Собрать текст текущего кадра спиннера */
export function formatSpinnerText(text: string, frame = 0): string {
	const normalizedText = normalizeLoadingText(text);
	return `${SPINNER_FRAMES[frame]} ${normalizedText}`;
}

/** Отправить сообщение со спиннером и сразу запустить анимацию */
export async function replyWithSpinner(
	ctx: MyContext,
	text: string,
	options: SpinnerMessageOptions = {}
): Promise<{ message: Message.TextMessage; spinner: SpinnerControl }> {
	const { parseMode, intervalMs = 1000 } = options;
	const normalizedText = normalizeLoadingText(text);
	const message = await ctx.reply(formatSpinnerText(normalizedText, 0), {
		parse_mode: parseMode,
		link_preview_options: { is_disabled: true },
	});
	const spinner = startSpinner(ctx, message.chat.id, message.message_id, normalizedText, intervalMs, false, parseMode);
	return { message, spinner };
}

/**
 * Запустить анимированный спиннер на уже отправленном сообщении.
 * При необходимости сначала редактирует сообщение первым кадром, затем каждые
 * `intervalMs` мс меняет кадр (🕐 → 🕑 → ... → 🕛 → 🕐).
 *
 * Сообщение можно либо отправить заранее без эмодзи, либо сразу с первым кадром
 * через `formatSpinnerText(..., 0)` и передать `renderFirstFrame = false`.
 *
 * @param ctx         - контекст бота
 * @param chatId      - ID чата
 * @param messageId   - ID сообщения, которое редактируем
 * @param initialText - текст без эмодзи (добавляется автоматически)
 * @param intervalMs  - интервал смены кадра (по умолчанию 1000 мс)
 * @param renderFirstFrame
 * @param parseMode
 */
export function startSpinner(
	ctx: MyContext,
	chatId: number,
	messageId: number,
	initialText: string,
	intervalMs = 1000,
	renderFirstFrame = true,
	parseMode?: ParseMode
): SpinnerControl {
	let frame = 0;
	let text = normalizeLoadingText(initialText);

	if (renderFirstFrame) {
		void ctx.api
				.editMessageText(chatId, messageId, formatSpinnerText(text, 0), {
					parse_mode: parseMode,
					link_preview_options: { is_disabled: true },
				})
				.catch(() => {});
	}

	const intervalId = setInterval(async () => {
		frame = (frame + 1) % SPINNER_FRAMES.length;
		await ctx.api
				 .editMessageText(chatId, messageId, formatSpinnerText(text, frame), {
					 parse_mode: parseMode,
					 link_preview_options: { is_disabled: true },
				 })
				 .catch(() => {});
	}, intervalMs);

	return {
		setText(newText: string) {
			text = normalizeLoadingText(newText);
		},
		stop() {
			clearInterval(intervalId);
		},
	};
}
