// src/features/meeting-notes/meeting-keyboards.ts
/**
 * Клавиатуры для раздела "Конспекты ЛМГ"
 * - все подписи на русском
 */

import { InlineKeyboard } from "grammy";
import { getTitle } from "./meeting-helpers";

/** Главное inline-меню конспектов */
export function kbMainInline(): InlineKeyboard {
	const kb = new InlineKeyboard();
	kb.text("Конспект с прошлой встречи", "notes:last").row();
	kb.text("🔎 Искать конспекты", "notes:searchmenu");
	return kb;
}

/** Подменю поиска (inline) */
export function kbSearchMenu(): InlineKeyboard {
	const kb = new InlineKeyboard();
	kb.text("📅 По дате", "notes:bydate").row();
	kb.text("📚 По книге", "notes:bybook").row();
	kb.text("🔑 По ключевым словам", "notes:bykeywords").row();
	kb.text("⬅️ В меню", "notes:menu");
	return kb;
}

/** Клавиатура годов (2022..текущий год) */
export function kbYears(): InlineKeyboard {
	const kb = new InlineKeyboard();
	const current = new Date().getFullYear();
	for (let y = 2022; y <= current; y++) {
		kb.text(String(y), `notes:year:${y}`).row();
	}
	kb.text("⬅️ В меню", "notes:menu");
	return kb;
}

/** Клавиатура месяцев (передаются номера месяцев 1..12) */
export function kbMonths(year: number, monthsNumbers: number[]): InlineKeyboard {
	const MONTH_NAMES = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
	const kb = new InlineKeyboard();
	for (const m of monthsNumbers) {
		const label = MONTH_NAMES[m - 1] ?? String(m);
		kb.text(label, `notes:month:${year}:${m}`).row();
	}
	kb.text("⬅️ Назад к годам", "notes:bydate");
	return kb;
}

/** Список записей — сокращённые кнопки */
export function kbRecordsList(records: any[]): InlineKeyboard {
	const kb = new InlineKeyboard();
	for (const r of records) {
		const ds = r && r.properties ? (r.properties["Дата встречи"]?.date?.start ?? "").split?.("T")?.[0] ?? "" : "";
		const title = getTitle(r);
		const label = `${ds ? ds + " — " : ""}${title}`.slice(0, 40);
		kb.text(label, `notes:get:${r.id}`).row();
	}
	kb.text("⬅️ Назад к месяцам", "notes:bydate");
	return kb;
}
