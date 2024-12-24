import { ParseMode } from '@grammyjs/types';
import env           from "../env";
import bot           from "../bot";

export const log = async (message: string, parse_mode: ParseMode = 'HTML') => {
	if (!env.LOG_CHANNEL) {
		console.log(message);
		return;
	}
	return await bot.api.sendMessage(env.LOG_CHANNEL, message, {
		parse_mode
	});
};