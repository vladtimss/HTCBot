// src/services/buildin.ts
import { env } from "../config/env";
import type {
	BuildinDatabaseQueryResponse,
	BuildinDatabaseQueryOptions,
	BuildinDatabaseRecord,
	BuildinPage,
} from "../types/buildin";

const BASE_URL = "https://api.buildin.ai/v1";

if (!env.BUILDIN_API_TOKEN) {
	console.warn("⚠️ BUILDIN API token is not set (env.BUILDIN_API_TOKEN). Buildin requests will fail.");
}

/**
 * Универсальный запрос к Buildin API.
 * - Берёт токен из env.ts
 * - Добавляет Accept: application/json
 * - Добавляет Content-Type только если есть тело
 * - Возвращает распарсенный JSON или бросает подробную ошибку
 */
async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const url = `${BASE_URL}${normalizedPath}`;

	const headers: Record<string, string> = {
		Authorization: `Bearer ${env.BUILDIN_API_TOKEN}`,
		Accept: "application/json",
		// В твоём примере в Postman был Cookie: locale=en-us — оставляем возможность переопределить через init.headers
		Cookie: "locale=en-us",
		...(init.headers ? (init.headers as Record<string, string>) : {}),
	};

	// Если есть тело и Content-Type не указан — добавляем application/json
	let body = init.body;
	if (body !== undefined && !(headers["Content-Type"] || headers["content-type"])) {
		headers["Content-Type"] = "application/json";
	}
	if (body !== undefined && typeof body !== "string") {
		// сериализация тела, если это не строка
		try {
			body = JSON.stringify(body);
		} catch (e) {
			// если сериализация упала — оставим как есть
		}
	}

	let res: Response;
	try {
		res = await fetch(url, { ...init, headers, body });
	} catch (err) {
		console.error("[buildin] fetch error:", err);
		throw new Error(`Buildin fetch failed: ${(err as Error).message}`);
	}

	const text = await res.text().catch(() => "");
	let data: T;
	try {
		data = text ? (JSON.parse(text) as T) : (text as T);
	} catch {
		data = text as T;
	}

	if (!res.ok) {
		// Сформируем читаемое сообщение
		const bodyStr = typeof data === "string" ? data : JSON.stringify(data);
		
		// Для ошибок 403 логируем с информацией о пути, к которому нет доступа
		if (res.status === 403) {
			console.error(`[buildin] 403 Forbidden - нет доступа к: ${path}`);
		} else {
			console.error("[buildin] error response:", { status: res.status, body: bodyStr });
		}
		
		throw new Error(`Buildin API error ${res.status}: ${bodyStr}`);
	}
	return data;
}

/** POST /databases/{databaseId}/query — запрос записей */
export async function queryDatabase(
	databaseId: string,
	body: BuildinDatabaseQueryOptions = { page_size: 50 }
): Promise<BuildinDatabaseQueryResponse> {
	return apiFetch<BuildinDatabaseQueryResponse>(`/databases/${databaseId}/query`, {
		method: "POST",
		body: body as unknown as RequestInit["body"],
	});
}

/**
 * Получить все записи из базы данных с пагинацией
 */
export async function getAllDatabaseRecords(
	databaseId: string,
	options: BuildinDatabaseQueryOptions = {}
): Promise<BuildinDatabaseRecord[]> {
	const allRecords: BuildinDatabaseRecord[] = [];
	let cursor: string | undefined | null;
	let hasMore = true;
	const pageSize = options.page_size ?? 100;

	while (hasMore) {
		const response = await queryDatabase(databaseId, {
			page_size: pageSize,
			start_cursor: cursor ?? undefined,
			filter: options.filter,
			sorts: options.sorts,
		});

		allRecords.push(...(response.results ?? []));
		hasMore = response.has_more ?? false;
		cursor = response.next_cursor ?? undefined;
	}

	return allRecords;
}

/**
 * GET /pages/{pageId} — получить страницу по ID
 */
export async function getPage(pageId: string): Promise<BuildinPage> {
	return apiFetch<BuildinPage>(`/pages/${pageId}`, { method: "GET" });
}

