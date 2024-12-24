import { cleanEnv, str } from 'envalid';
import dotenv from 'dotenv';
dotenv.config();

const env = cleanEnv(process.env, {
	BOT_TOKEN: str(),
	LOG_CHANNEL: str(),
	YANDEX_CALENDAR_APP_KEY: str()
});

export default env;