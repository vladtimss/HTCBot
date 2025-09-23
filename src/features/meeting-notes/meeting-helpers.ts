// src/features/meeting-notes/meeting-helpers.ts
/**
 * Вспомогательные функции для meeting-notes
 * - парсинг полей записи
 * - поддержка разных форматов даты/глав/файлов
 */

export type RecordObj = any;

/** Безопасно получить заголовок (Тема / title) */
export function getTitle(record: RecordObj): string {
	return (
		record?.properties?.["Тема"]?.title?.[0]?.plain_text ??
		record?.properties?.title?.title?.[0]?.plain_text ??
		record?.properties?.title?.title?.[0]?.text?.content ??
		"Без названия"
	);
}

/** Достать строку даты YYYY-MM-DD или null */
export function getDate(record: RecordObj): string | null {
	// Основной формат: properties["Дата встречи"].date.start
	const p = record?.properties?.["Дата встречи"];
	const d = p?.date?.start ?? null;
	if (!d) return null;
	return String(d).split("T")[0];
}

/** Достать все даты-подобные строки из записи (многополевая поддержка) */
export function extractAllDateStrings(record: RecordObj): string[] {
	const out = new Set<string>();
	const props = record?.properties ?? {};
	for (const k of Object.keys(props)) {
		const p = props[k];
		if (!p) continue;
		if (p?.date?.start) out.add(String(p.date.start).split("T")[0]);
		// проверяем вложенные места (на всякий)
		for (const sk of Object.keys(p)) {
			const val = (p as any)[sk];
			if (val && typeof val === "object") {
				if (val.start) out.add(String(val.start).split("T")[0]);
				if (val.date?.start) out.add(String(val.date.start).split("T")[0]);
			}
		}
	}
	return Array.from(out);
}

/** Преобразовать строку даты в timestamp (ms) или null. Поддерживается YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY. */
export function parseDateToTs(dateStr: string | null | undefined): number | null {
	if (!dateStr) return null;
	const norm = String(dateStr).trim().replace(/\//g, "-");
	const t = Date.parse(norm);
	if (!isNaN(t)) return t;
	const m = norm.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
	if (m) {
		const [, dd, mm, yyyy] = m;
		const iso = `${yyyy}-${mm}-${dd}`;
		const t2 = Date.parse(iso);
		if (!isNaN(t2)) return t2;
	}
	const mm2 = norm.match(/(\d{4})-(\d{2})-(\d{2})/);
	if (mm2) return Date.parse(`${mm2[1]}-${mm2[2]}-${mm2[3]}`);
	return null;
}

/** Возвращает массив книг (multi_select) */
export function getBooks(record: RecordObj): string[] {
	const ms = record?.properties?.["Книга"]?.multi_select;
	if (Array.isArray(ms)) return ms.map((m: any) => String(m.name));
	return [];
}

/**
 * Возвращает массив глав:
 * - если multi_select — берём значения,
 * - иначе — распарсим текст (поддержка разделителей: запятая, точка с запятой, en-dash, em-dash, дефис).
 */
export function getChapters(record: RecordObj): string[] {
	const ms = record?.properties?.["Глава"]?.multi_select;
	if (Array.isArray(ms) && ms.length) return ms.map((m: any) => String(m.name));

	const rt = record?.properties?.["Глава"]?.rich_text;
	const raw = rt?.map((t: any) => t.plain_text).join(" ") ?? record?.properties?.["Глава"];
	if (!raw) return [];

	// Разделители: , ; en-dash (\u2013) em-dash (\u2014) hyphen (\u002D)
	return String(raw)
		.split(/[,\u003B\u2013\u2014\u002D]/)
		.map((s: string) => s.trim())
		.filter(Boolean);
}

/** Возвращает список файлов из поля "Конспект" в виде { name, url } */
export function getFiles(record: RecordObj): { name: string; url: string }[] {
	const prop = record?.properties?.["Конспект"];
	const files = prop?.files ?? [];
	if (!Array.isArray(files)) return [];
	return files
		.map((f: any) => {
			const url = f?.file?.url ?? f?.external?.url ?? null;
			const name = f?.name ?? null;
			if (!url) return null;
			return { name: name ?? "document", url };
		})
		.filter(Boolean) as { name: string; url: string }[];
}

/** Текстовое поле "Текст" */
export function getText(record: RecordObj): string {
	const rt = record?.properties?.["Текст"]?.rich_text ?? [];
	return (rt.map((t: any) => t.plain_text ?? "") ?? []).join(" ");
}

/** По массиву записей и году возвращает массив номеров месяцев (1..12), отсортированный */
export function getMonthNumbers(records: RecordObj[], year: number): number[] {
	const months = new Set<number>();
	for (const r of records) {
		for (const ds of extractAllDateStrings(r)) {
			const ts = parseDateToTs(ds);
			if (!ts) continue;
			const d = new Date(ts);
			if (d.getFullYear() === year) months.add(d.getMonth() + 1);
		}
	}
	return Array.from(months).sort((a, b) => a - b);
}

/** Сформировать текст карточки/описания записи (строка) */
export function formatRecordMessage(record: RecordObj): string {
	const title = getTitle(record);
	const books = getBooks(record).join(", ");
	const chapters = getChapters(record).join(", ");
	const date = getDate(record) ?? "";
	const text = getText(record) ?? "";
	const id = record?.id ?? record?.page_id ?? "";
	let out = `📄 ${title}\n`;
	if (books) out += `📚 ${books}${chapters ? ` — гл. ${chapters}` : ""}\n`;
	if (date) out += `🗓 ${date}\n`;
	if (text) out += `\n📝 ${text}\n`;
	if (id) out += `\nID: ${id}`;
	return out.trim();
}
