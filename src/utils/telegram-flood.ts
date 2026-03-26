/**
 * Защита от flood (429) Telegram Bot API:
 * - автоповтор на уровне API: см. `app.ts` — `bot.api.config.use(autoRetry({ ... }))`
 *   (https://grammy.dev/plugins/auto-retry);
 * - безопасные ответы пользователю в catch (без каскада 429);
 * - хелперы проверки ошибки.
 */

import type { FormattedString } from "@grammyjs/parse-mode";
import { GrammyError } from "grammy";
import type { Message } from "grammy/types";
import { MyContext } from "../types/grammy-context";
import { logger } from "./logger";

/** Ограничение частоты запросов к Bot API (flood). */
export function isGrammyTooManyRequests(err: unknown): err is GrammyError {
	return err instanceof GrammyError && err.error_code === 429;
}

/** Секунды ожидания из ответа Telegram, если есть. */
export function getGrammyRetryAfterSeconds(err: unknown): number | undefined {
	if (!isGrammyTooManyRequests(err)) return undefined;
	const sec = err.parameters?.retry_after;
	return typeof sec === "number" ? sec : undefined;
}

type ReplyOptions = Parameters<MyContext["reply"]>[1];

/**
 * Отправка сообщения; при 429 не бросает (логирует) — для catch и уведомлений об ошибках.
 * Успешные сценарии: ctx.reply + плагин autoRetry в app.ts.
 */
export async function safeReply(
	ctx: MyContext,
	text: string,
	options?: ReplyOptions
): Promise<Message.TextMessage | undefined> {
	try {
		return (await ctx.reply(text, options)) as Message.TextMessage;
	} catch (e) {
		if (isGrammyTooManyRequests(e)) {
			logger.warn(
				{ chat_id: ctx.chat?.id, retry_after: getGrammyRetryAfterSeconds(e) },
				"safeReply: flood, skip"
			);
			return undefined;
		}
		throw e;
	}
}

export async function safeReplyFormatted(
	ctx: MyContext,
	formatted: FormattedString,
	options?: ReplyOptions
): Promise<Message.TextMessage | undefined> {
	return safeReply(ctx, formatted.text, {
		...options,
		entities: formatted.entities,
	});
}
