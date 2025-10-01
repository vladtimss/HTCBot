import dotenv from "dotenv";
import { GroupAddress } from "../data/small-groups";
dotenv.config();

/** Берём обязательную переменную окружения, иначе бросаем ошибку */
function required(name: string): string {
	const v = process.env[name];
	if (!v) throw new Error(`Missing env var: ${name}`);
	return v;
}

/** Опциональная переменная с фолбэком */
function optional(key: string, fallback: string): string {
	return process.env[key] ?? fallback;
}

/** Парсим список чисел вида "1,2,3" => number[] */
function parseNumberList(name: string): number[] {
	return (process.env[name] ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
		.map(Number);
}

/** Парсер base64-JSON из ENV (для «красивых» многострочных json через кодирование) */
function parseBase64Json<T>(name: string, fallback: T): T {
	const raw = process.env[name];
	if (!raw) return fallback;
	try {
		const json = Buffer.from(raw, "base64").toString("utf-8");
		return JSON.parse(json) as T;
	} catch {
		return fallback;
	}
}

/**
 * Парсер username телеграмма
 * @param v
 * @returns
 */
const parseUsernames = (v?: string): string[] =>
	(v ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => s.replace(/^@/, "").toLowerCase());

/** Локальный тип данных лидера, хранящийся в ENV (ключом выступает id) */
type LeaderData = {
	firstName: string;
	lastName: string;
	phone: string;
	tgUserName?: string;
	tgId?: number | string;
};

export const env = {
	// 🔐 Обязательные переменные
	BOT_TOKEN: process.env.NODE_ENV === "production" ? required("BOT_TOKEN") : required("DEV_BOT_TOKEN"),
	CALDAV_URL: required("CALDAV_URL"),
	CALDAV_USERNAME: required("CALDAV_USERNAME"),
	CALDAV_PASSWORD: required("CALDAV_PASSWORD"),
	HTC_COMMON_CALENDAR_URL: required("HTC_COMMON_CALENDAR_URL"),
	SERMONS_PODSTER_URL: required("SERMONS_PODSTER_URL"),
	SERMONS_YANDEX_URL: required("SERMONS_YANDEX_URL"),

	// ⚙️ Опциональные переменные
	START_IMAGE: optional("START_IMAGE", "assets/greet.png"),
	SUNDAY_SERVICE_IMG: optional("SUNDAY_SERVICE_IMG", ""),
	CHANNEL_URL: optional("CHANNEL_URL", "https://t.me/"),
	CALENDAR_SUBSCRIBE_URL: optional("CALENDAR_SUBSCRIBE_URL", ""),
	YANDEX_MAP_URL: optional("YANDEX_MAP_URL", ""),

	// 👥 Списки и структуры
	AUTHORIZED_USERNAMES: parseUsernames(process.env.AUTHORIZED_USERNAMES),

	// ✅ Конфиденциальные структуры в base64-JSON
	//   Пример генерации см. scripts/encode-env.ts
	LEADERS: parseBase64Json<Record<string, LeaderData>>("LEADERS_JSON_BASE64", {}),
	GROUP_ADDRESSES: parseBase64Json<Record<string, GroupAddress[]>>("GROUP_ADDRESSES_JSON_BASE64", {}),
	// Buildin.ai
	BUILDIN_API_TOKEN: required("BUILDIN_API_TOKEN"),
};
