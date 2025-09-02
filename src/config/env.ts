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
	BOT_TOKEN: required("BOT_TOKEN"),
	CALDAV_URL: required("CALDAV_URL"),
	CALDAV_USERNAME: required("CALDAV_USERNAME"),
	CALDAV_PASSWORD: required("CALDAV_PASSWORD"),
	HTC_COMMON_CALENDAR_URL: required("HTC_COMMON_CALENDAR_URL"),
	SERMONS_PODSTER_URL: required("SERMONS_PODSTER_URL"),
	SERMONS_YANDEX_URL: required("SERMONS_YANDEX_URL"),

	// ⚙️ Опциональные переменные
	START_IMAGE: optional("START_IMAGE", "assets/start.jpg"),
	CHANNEL_URL: optional("CHANNEL_URL", "https://t.me/"),
	YANDEX_MAP_URL: optional("YANDEX_MAP_URL", ""),

	// 👥 Списки и структуры
	PRIVILEGED_USER_IDS: parseNumberList("PRIVILEGED_USER_IDS"),
	FOURTH_BUTTON_USER_IDS: parseNumberList("FOURTH_BUTTON_USER_IDS"),

	// ✅ Конфиденциальные структуры в base64-JSON
	//   Пример генерации см. scripts/encode-env.ts
	LEADERS: parseBase64Json<Record<string, LeaderData>>("LEADERS_JSON_BASE64", {}),
	GROUP_ADDRESSES: parseBase64Json<Record<string, GroupAddress[]>>("GROUP_ADDRESSES_JSON_BASE64", {}),
};
