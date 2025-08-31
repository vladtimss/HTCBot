import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
	const v = process.env[name];
	if (!v) throw new Error(`Missing env var: ${name}`);
	return v;
}

function optional(key: string, fallback: string): string {
	return process.env[key] ?? fallback;
}

function parseNumberList(name: string): number[] {
	return (process.env[name] ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
		.map(Number);
}

function parseJson<T>(name: string, fallback: T): T {
	const raw = process.env[name];
	if (!raw) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

export const env = {
	// 🔐 Обязательные переменные (без них бот не запустится)
	BOT_TOKEN: required("BOT_TOKEN"),
	CALDAV_URL: required("CALDAV_URL"),
	CALDAV_USERNAME: required("CALDAV_USERNAME"),
	CALDAV_PASSWORD: required("CALDAV_PASSWORD"),
	HTC_COMMON_CALENDAR_URL: required("HTC_COMMON_CALENDAR_URL"),

	// ⚙️ Опциональные переменные
	START_IMAGE: optional("START_IMAGE", "assets/start.jpg"),
	CHANNEL_URL: optional("CHANNEL_URL", "https://yandex.ru/maps/213/moscow/?ll=37.617700%2C55.755863&z=10"),
	YANDEX_MAP_URL: optional("YANDEX_MAP_URL", ""),

	// 👥 Списки и структуры
	PRIVILEGED_USER_IDS: parseNumberList("PRIVILEGED_USER_IDS"),
	FOURTH_BUTTON_USER_IDS: parseNumberList("FOURTH_BUTTON_USER_IDS"),
	LEADERS: parseJson<Record<string, { name: string; phone: string }>>("LEADERS_JSON", {}),
};
