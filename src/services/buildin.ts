// src/services/buildin.ts
/**
 * Сервис для работы с Buildin API
 * - централизует HTTP-вызовы
 * - query / getPage / listAllRecords
 */

import { DATABASES } from "../config/databases.buildin";

const API_URL = "https://api.buildin.ai/v1";
const TOKEN = process.env.BUILDIN_TOKEN ?? "";

if (!TOKEN) {
	console.warn("⚠️ BUILDIN_TOKEN не задан (env). Buildin API вызовы будут падать.");
}

/** Универсальный запрос к Buildin (парсит JSON и бросает ошибку при не-ok) */
export async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
	const url = `${API_URL}${endpoint}`;
	const res = await fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${TOKEN}`,
			"Content-Type": "application/json",
			...(options.headers || {}),
		},
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "<no-body>");
		throw new Error(`Buildin API error: ${res.status} ${text}`);
	}

	return (await res.json()) as any;
}

/** POST /databases/{databaseId}/query */
export async function queryDatabaseById(databaseId: string, body: object): Promise<any> {
	return request(`/databases/${databaseId}/query`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

/** Удобный wrapper: query по ключу из DATABASES (например "lmgNotes") */
export async function queryDatabase(dbKey: keyof typeof DATABASES, body: object): Promise<any> {
	const id = DATABASES[dbKey];
	return queryDatabaseById(id, body);
}

/** GET /v1/pages/{pageId} */
export async function getPage(pageId: string): Promise<any> {
	return request(`/pages/${pageId}`, { method: "GET" });
}

/**
 * Собрать все записи базы постранично.
 * maxRecords — защита от бесконечной загрузки.
 */
export async function listAllRecords(dbKey: keyof typeof DATABASES, pageSize = 100, maxRecords = 2000): Promise<any[]> {
	const out: any[] = [];
	let start_cursor: string | undefined = undefined;

	while (true) {
		const body: any = { page_size: pageSize };
		if (start_cursor) body.start_cursor = start_cursor;

		const resp = await queryDatabase(dbKey, body); // resp: { results, next_cursor, has_more }
		const items: any[] = resp.results ?? [];
		out.push(...items);

		// остановки
		if (!resp.has_more) break;
		start_cursor = resp.next_cursor;
		if (!start_cursor) break;
		if (out.length >= maxRecords) break;
	}

	return out.slice(0, maxRecords);
}

/** Экспорт удобного объекта и именованных функций */
export const buildin = {
	request,
	queryDatabaseById,
	queryDatabase,
	getPage,
	listAllRecords,
};

export default buildin;
