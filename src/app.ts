import bot              from "./bot";
import { errorHandler } from "./middlewares/error-handler";
import { log }          from "./middlewares/logger";
import { useCommands }  from "./commands";

(async () => {
	useCommands()
	bot.catch(errorHandler);
	await bot.start({
		drop_pending_updates: true,
		onStart: async () => {
			await log('Bot is running @htchurch_bot');
		},
		allowed_updates: ['message', 'callback_query']
	});
})();