/**
 * utils/format-helpers.ts
 * --------------------------
 * Вспомогательные функции для работы с FormattedString
 */

import type { FormattedString } from "@grammyjs/parse-mode";
import type { MyContext } from "../types/grammy-context";

/**
 * Отправляет FormattedString как обычное сообщение
 */
export async function replyFormatted(ctx: MyContext, formatted: FormattedString, options?: Parameters<MyContext["reply"]>[1]) {
	return ctx.reply(formatted.text, {
		...options,
		entities: formatted.entities,
	});
}

/**
 * Отправляет FormattedString как caption для фото
 */
export async function replyPhotoWithFormattedCaption(
	ctx: MyContext,
	photo: Parameters<MyContext["replyWithPhoto"]>[0],
	formatted: FormattedString,
	options?: Parameters<MyContext["replyWithPhoto"]>[1]
) {
	return ctx.replyWithPhoto(photo, {
		...options,
		caption: formatted.text,
		caption_entities: formatted.entities,
	});
}
