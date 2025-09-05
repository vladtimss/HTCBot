/**
 * utils/loading.ts
 * --------------------------
 * Утилита для отображения "ожидания" при долгих операциях.
 * Если задача выполняется дольше delayMs — в чат отправляется сообщение.
 * После завершения задача убирает/редактирует сообщение.
 */

import type { Message } from "grammy/types";
import type { MyContext } from "../types/grammy-context";

/** Опции показа сообщения об ожидании */
export interface LoadingOptions {
	text?: string; // текст сообщения (по умолчанию: "⏳ Загружаю…")
	delayMs?: number; // задержка перед показом (мс)
	parseMode?: "Markdown" | "MarkdownV2" | "HTML"; // режим парсинга текста
}

/**
 * Обёртка для асинхронной операции с "ожиданием".
 */
export async function withLoading<T>(ctx: MyContext, task: () => Promise<T>, options: LoadingOptions = {}): Promise<T> {
	const { text = "⏳ Загружаю…", delayMs = 300, parseMode } = options;

	let timer: ReturnType<typeof setTimeout> | undefined;
	let loadingMsg: Message.TextMessage | undefined;
	let shown = false;

	// Запланировать показ сообщения, если операция долгая
	timer = setTimeout(async () => {
		try {
			shown = true;
			loadingMsg = await ctx.reply(text, {
				parse_mode: parseMode,
				link_preview_options: { is_disabled: true }, // отключаем превью
			});
		} catch {
			// Игнорируем ошибки отправки
		}
	}, delayMs);

	try {
		const result = await task();

		// Операция завершилась → убираем сообщение
		if (timer) clearTimeout(timer);
		if (shown && loadingMsg) {
			try {
				await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);
			} catch {
				// Если удалить нельзя → заменяем текст
				try {
					await ctx.api.editMessageText(loadingMsg.chat.id, loadingMsg.message_id, "✅ Готово");
				} catch {
					// Игнорируем любые ошибки
				}
			}
		}

		return result;
	} catch (err) {
		if (timer) clearTimeout(timer);
		if (shown && loadingMsg) {
			try {
				await ctx.api.editMessageText(
					loadingMsg.chat.id,
					loadingMsg.message_id,
					"⚠️ Не удалось загрузить данные"
				);
			} catch {
				// Игнорируем
			}
		}
		throw err;
	}
}
