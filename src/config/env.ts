import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
	const v = process.env[name];
	if (!v) throw new Error(`Missing env var: ${name}`);
	return v;
}

export const env = {
	BOT_TOKEN: required("BOT_TOKEN"),
	START_IMAGE: process.env.START_IMAGE ?? "assets/start.jpg",
	CHANNEL_URL: process.env.CHANNEL_URL ?? "https://t.me/",
	PRIVILEGED_USER_IDS: (process.env.PRIVILEGED_USER_IDS ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => Number(s)),
	FOURTH_BUTTON_USER_IDS: (process.env.FOURTH_BUTTON_USER_IDS ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => Number(s)),

	CALDAV_URL: required("CALDAV_URL"),
	CALDAV_USERNAME: required("CALDAV_USERNAME"),
	CALDAV_PASSWORD: required("CALDAV_PASSWORD"),
	HTC_COMMON_CALENDAR_URL: required("HTC_COMMON_CALENDAR_URL"),

	SMALL_GROUPS_RAW: process.env.SMALL_GROUPS ?? "[]",
};
