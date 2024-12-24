import { cleanEnv, str } from 'envalid';
import dotenv from 'dotenv';
dotenv.config();

const env = cleanEnv(process.env, {
	BOT_TOKEN: str(),
	LOG_CHANNEL: str(),
});

export default env;