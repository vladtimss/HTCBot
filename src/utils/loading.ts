// src/utils/loading.ts
import type { Message } from "grammy/types";
import type { MyContext } from "../types/grammy-context";

/**
 * Опции отображения "ожидания"
 */
export interface LoadingOptions {
	/**
	 * Текст, который будет показан, если операция длится дольше задержки
	 * По умолчанию: "⏳ Загружаю…"
	 */
	text?: string;
	/**
	 * Задержка перед показом сообщения (мс). Если задача завершится быстрее — сообщение не показывается.
	 * По умолчанию: 300 мс
	 */
	delayMs?: number;
	/**
	 * parse_mode для сообщения "ожидания" (опционально)
	 */
	parseMode?: "Markdown" | "MarkdownV2" | "HTML";
}

/**
 * Обёртка для асинхронной операции, которая:
 * 1) Показвает сообщение "ожидания" только если операция длится дольше заданной задержки.
 * 2) Удаляет (или редактирует) сообщение после завершения операции.
 *
 * @param ctx - контекст grammY
 * @param task - асинхронная операция
 * @param options - настройки отображения
 * @returns результат выполнения task()
 */
export async function withLoading<T>(ctx: MyContext, task: () => Promise<T>, options: LoadingOptions = {}): Promise<T> {
	const { text = "⏳ Загружаю…", delayMs = 300, parseMode } = options;

	let timer: ReturnType<typeof setTimeout> | undefined;
	let loadingMsg: Message.TextMessage | undefined;
	let shown = false;

	// Планируем показать сообщение только если задача "долго" выполняется
	timer = setTimeout(async () => {
		try {
			shown = true;
			loadingMsg = await ctx.reply(text, {
				parse_mode: parseMode,
				// чтобы случайные ссылки не раскрывали превью
				link_preview_options: { is_disabled: true },
			});
		} catch {
			// Молча игнорируем ошибки отправки "ожидания"
		}
	}, delayMs);

	try {
		const result = await task();

		// Завершилось — убираем "ожидание"
		if (timer) clearTimeout(timer);
		if (shown && loadingMsg) {
			try {
				// Удаляем сообщение, чтобы не засорять чат
				await ctx.api.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);
			} catch {
				// Если удалить нельзя (например, отсутствуют права) — попробуем заменить текст
				try {
					await ctx.api.editMessageText(loadingMsg.chat.id, loadingMsg.message_id, "✅ Готово");
				} catch {
					// игнор
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
				// игнор
			}
		}
		throw err;
	}
}
