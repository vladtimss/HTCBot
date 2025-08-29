import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
	const v = process.env[name];
	if (!v) throw new Error(`Missing env var: ${name}`);
	return v;
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
	BOT_TOKEN: required("BOT_TOKEN"),
	START_IMAGE: process.env.START_IMAGE ?? "assets/start.jpg",
	CHANNEL_URL: process.env.CHANNEL_URL ?? "https://t.me/",
	PRIVILEGED_USER_IDS: parseNumberList("PRIVILEGED_USER_IDS"),
	FOURTH_BUTTON_USER_IDS: parseNumberList("FOURTH_BUTTON_USER_IDS"),
	CALDAV_URL: required("CALDAV_URL"),
	CALDAV_USERNAME: required("CALDAV_USERNAME"),
	CALDAV_PASSWORD: required("CALDAV_PASSWORD"),
	HTC_COMMON_CALENDAR_URL: required("HTC_COMMON_CALENDAR_URL"),
	LEADERS: parseJson<Record<string, { name: string; phone: string }>>("LEADERS_JSON", {}),
};
