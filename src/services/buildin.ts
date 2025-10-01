// src/services/buildin.ts
import { env } from "../config/env";

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
async function apiFetch(path: string, init: RequestInit = {}): Promise<any> {
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

	// Лог запроса для дебага
	console.debug("[buildin] request:", {
		method: init.method ?? "GET",
		url,
		headers,
		bodyPreview: typeof body === "string" ? body.slice(0, 400) : body,
	});

	let res: Response;
	try {
		res = await fetch(url, { ...init, headers, body });
	} catch (err) {
		console.error("[buildin] fetch error:", err);
		throw new Error(`Buildin fetch failed: ${(err as Error).message}`);
	}

	const text = await res.text().catch(() => "");
	let data: any;
	try {
		data = text ? JSON.parse(text) : text;
	} catch {
		data = text;
	}

	if (!res.ok) {
		// Сформируем читаемое сообщение
		const bodyStr = typeof data === "string" ? data : JSON.stringify(data);
		console.error("[buildin] error response:", { status: res.status, body: bodyStr });
		throw new Error(`Buildin API error ${res.status}: ${bodyStr}`);
	}

	console.debug("[buildin] response ok:", {
		status: res.status,
		preview: typeof data === "string" ? data.slice(0, 400) : data,
	});
	return data;
}

/** GET /databases/{databaseId} — возвращает полную структуру базы (properties, title и т.д.) */
export async function getDatabase(databaseId: string): Promise<any> {
	return apiFetch(`/databases/${databaseId}`, { method: "GET" });
}

/** POST /databases/{databaseId}/query — запрос записей (если понадобится) */
export async function queryDatabase(databaseId: string, body: any = { page_size: 50 }): Promise<any> {
	return apiFetch(`/databases/${databaseId}/query`, { method: "POST", body });
}

/** GET /blocks/{id} — если потребуется работать с блоками/pages */
export async function getBlock(blockId: string): Promise<any> {
	return apiFetch(`/blocks/${blockId}`, { method: "GET" });
}

/** GET /blocks/{id}/children */
export async function getBlockChildren(blockId: string): Promise<any> {
	return apiFetch(`/blocks/${blockId}/children`, { method: "GET" });
}

export const buildin = {
	apiFetch,
	getDatabase,
	queryDatabase,
	getBlock,
	getBlockChildren,
};

export default buildin;
