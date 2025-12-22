/**
 * features/lmg-notes/lmg-notes.util.ts
 * --------------------------
 * Утилиты для работы с конспектами ЛМГ
 */

import { InputFile } from "grammy";

/**
 * Нормализация даты из формата Buildin
 */
export function normalizeDate(dateStr: string): string {
	if (!dateStr) return dateStr;
	// убираем время
	let clean = dateStr.split("T")[0];
	// бывают "2024/03-11" → заменяем второй разделитель на "/"
	clean = clean.replace(/(\d{4})[/-](\d{2})[-/](\d{2})/, "$1-$2-$3");
	return clean;
}

/**
 * Скачивание файла по URL и преобразование в InputFile для отправки в Telegram
 */
export async function fetchFileAsInput(url: string, fileName: string): Promise<InputFile> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Не удалось скачать файл: ${res.status}`);
	const buffer = Buffer.from(await res.arrayBuffer());
	return new InputFile(buffer, fileName);
}
