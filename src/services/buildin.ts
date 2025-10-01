// src/services/buildin.ts
import { env } from "../config/env";

const BASE_URL = "https://api.buildin.ai/v1";

async function apiFetch(path: string, init: RequestInit = {}) {
	const url = BASE_URL + path;
	const headers = {
		Authorization: `Bearer ${env.BUILDIN_API_TOKEN}`,
		"Content-Type": "application/json",
		...(init.headers ?? {}),
	};

	const res = await fetch(url, { ...init, headers });
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Buildin API error ${res.status}: ${text}`);
	}
	return res.json();
}

export async function getDatabase(databaseId: string) {
	return apiFetch(`/databases/${databaseId}`);
}

export async function queryDatabase(databaseId: string, body: any = { page_size: 50 }) {
	return apiFetch(`/databases/${databaseId}/query`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export function formatDatabaseProperties(db: any) {
	const props = db?.properties ?? {};
	return Object.keys(props).map((k) => ({
		id: k,
		name: props[k].name,
		type: props[k].type,
		raw: props[k],
	}));
}
