import bot                                          from "./bot";
import { errorHandler }                             from "./middlewares/error-handler";
import { log }                                      from "./middlewares/logger";
import { useCommands }                              from "./commands";
import { caldavCalendarIntegrationServiceInstance } from "./services/caldav-calendar-integration.service";

(async () => {
	await caldavCalendarIntegrationServiceInstance.init();

	useCommands()

	bot.catch(errorHandler);

	await bot.start({
		drop_pending_updates: true,
		onStart: async () => {
			await log('Bot is running @htchurch_bot');
		},
		allowed_updates: ['message', 'callback_query', 'my_chat_member']
	});
})();