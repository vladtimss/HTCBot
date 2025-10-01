// src/services/buildin.ts
import { env } from "../config/env";

const BASE_URL = "https://api.buildin.ai/v1";

/**
 * Универсальный fetch-клиент для Buildin.
 * - Добавляет Authorization
 * - По-умолчанию Accept: application/json
 * - По-умолчанию отправляет Cookie: locale=en-us (как в твоём postman)
 * - Парсит JSON если возможно, иначе возвращает текст
 */
async function apiFetch(path: string, init: RequestInit = {}) {
	const url = BASE_URL.replace(/\/+$/, "") + path;
	const defaultHeaders: Record<string, string> = {
		Authorization: `Bearer ${env.BUILDIN_API_TOKEN}`,
		Accept: "application/json",
		// Buildin в твоём примере использует cookie locale, поэтому добавляем по умолчанию.
		// Если это мешает — можно убрать или переопределить через init.headers.
		Cookie: "locale=en-us",
	};

	// Не ставим Content-Type по-умолчанию для GET (чтобы не мешать),
	// но для тела (POST/PUT) лучше присутствовать.
	if (init.body && !(init.headers && (init.headers as any)["Content-Type"])) {
		defaultHeaders["Content-Type"] = "application/json";
	}

	const headers = Object.assign({}, defaultHeaders, init.headers ?? {});

	// Если тело передан не строкой — сериализуем
	const body = init.body && typeof init.body !== "string" ? JSON.stringify(init.body) : init.body;

	// Выполняем запрос
	const res = await fetch(url, { ...init, headers, body });
	const text = await res.text().catch(() => "");

	// Пытаемся распарсить JSON
	let data: any;
	try {
		data = JSON.parse(text);
	} catch {
		data = text;
	}

	if (!res.ok) {
		// Подробная ошибка для логов / дебага
		const message = typeof data === "string" ? data : JSON.stringify(data);
		throw new Error(`Buildin API error ${res.status}: ${message}`);
	}

	return data;
}

/** Получить блок (page/block) по ID — оставил для совместимости */
export async function getBlock(blockId: string) {
	return apiFetch(`/blocks/${blockId}`);
}

/** Получить дочерние блоки страницы */
export async function getBlockChildren(blockId: string) {
	return apiFetch(`/blocks/${blockId}/children`);
}

/**
 * Получить полную информацию о базе (database)
 * Возвращает весь JSON с полями, properties и т.д.
 */
export async function getDatabase(databaseId: string) {
	return apiFetch(`/databases/${databaseId}`);
}

/**
 * POST /databases/{id}/query — если понадобятся запросы к БД
 */
export async function queryDatabase(databaseId: string, body: any = { page_size: 50 }) {
	return apiFetch(`/databases/${databaseId}/query`, {
		method: "POST",
		body,
		// body сериализуется в apiFetch
	});
}
