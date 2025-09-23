// src/features/meeting-notes/meeting-keyboards.ts
/**
 * Клавиатуры для раздела "Конспекты ЛМГ"
 */

import { InlineKeyboard } from "grammy";
import { getTitle } from "./meeting-helpers";

/** Главное inline-меню */
export function kbMainInline(): InlineKeyboard {
	const kb = new InlineKeyboard();
	kb.text("📖 Конспект с прошлой встречи", "notes:last").row();
	kb.text("🔎 Искать конспекты", "notes:searchmenu");
	return kb;
}

/** Подменю поиска */
export function kbSearchMenu(): InlineKeyboard {
	const kb = new InlineKeyboard();
	kb.text("📅 По дате", "notes:bydate").row();
	kb.text("📚 По книге", "notes:bybook").row();
	kb.text("🔑 По ключевым словам", "notes:bykeywords").row();
	kb.text("⬅️ В меню", "notes:menu");
	return kb;
}

/** Клавиатура после последней встречи */
export function kbAfterLast(): InlineKeyboard {
	const kb = new InlineKeyboard();
	kb.text("📖 Конспект с прошлой встречи", "notes:last").row();
	kb.text("🔎 Искать конспекты", "notes:searchmenu").row();
	kb.text("⬅️ К разделу МГ", "notes:backmg");
	return kb;
}

/** Года 2022..current */
export function kbYears(): InlineKeyboard {
	const kb = new InlineKeyboard();
	const current = new Date().getFullYear();
	for (let y = 2022; y <= current; y++) {
		kb.text(String(y), `notes:year:${y}`).row();
	}
	kb.text("⬅️ В меню", "notes:menu");
	return kb;
}

/** Месяцы (ярлыки) */
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

/**
 * Список записей — принимает backAction (куда вести при нажатии "Назад")
 * records — массив записей (объекты buildin)
 */
export function kbRecordsList(records: any[], backAction: string): InlineKeyboard {
	const kb = new InlineKeyboard();
	for (const r of records) {
		const ds = r?.properties?.["Дата встречи"]?.date?.start?.split?.("T")?.[0] ?? "";
		const title = getTitle(r);
		const label = `${ds ? ds + " — " : ""}${title}`.slice(0, 40);
		// callback data: notes:get:<pageId>
		kb.text(label, `notes:get:${r.id}`).row();
	}
	kb.text("⬅️ Назад", backAction);
	return kb;
}
