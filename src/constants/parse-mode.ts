/**
 * constants/parse-mode.ts
 * --------------------------
 * Константы для режимов парсинга текста в Telegram Bot API.
 * Централизованное место для всех значений parse_mode.
 */

/**
 * Режимы парсинга текста, поддерживаемые Telegram Bot API.
 * Используется в опциях ctx.reply, ctx.editMessageText и т.д.
 */
export const PARSE_MODE = {
	/** MarkdownV2 - современный формат Markdown с более строгим синтаксисом */
	MARKDOWN_V2: "MarkdownV2",
} as const;

/**
 * Тип для режима парсинга.
 */
export type ParseMode = typeof PARSE_MODE[keyof typeof PARSE_MODE];

