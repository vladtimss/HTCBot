// src/types/buildin.ts

/** Файл, прикреплённый в Notion (BuildIn) */
export interface BuildinFile {
	name?: string;
	file?: { url?: string };
	external?: { url?: string };
}

/** Одна встреча ЛМГ */
export interface Meeting {
	date: string; // ISO-строка из Notion, например "2025-09-23"
	files: BuildinFile[];
	raw: any; // вся оригинальная страница (если нужно глубже парсить)
}
