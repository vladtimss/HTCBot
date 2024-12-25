import { cleanEnv, str } from 'envalid';
import dotenv from 'dotenv';
dotenv.config();

const env = cleanEnv(process.env, {
	BOT_TOKEN: str(),
	LOG_CHANNEL: str(),
	CALDAV_URL: str(),
	CALDAV_USERNAME: str(),
	CALDAV_PASSWORD: str(),
	HTC_COMMON_CALENDAR_URL: str(),
	HTC_PASTORS_CALENDAR_URL: str()
});

export default env;