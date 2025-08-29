import { cleanEnv, str } from "envalid";
import dotenv from "dotenv";
dotenv.config();

export const env = cleanEnv(process.env, {
	BOT_TOKEN: str(),
	START_IMAGE: str({ default: "assets/start.png" }),
	CHANNEL_URL: str({ default: "https://t.me/" }),

	// CalDAV (Яндекс)
	CALDAV_URL: str(),
	CALDAV_USERNAME: str(),
	CALDAV_PASSWORD: str(),
	HTC_COMMON_CALENDAR_URL: str(),
});
