import { ErrorHandler } from "grammy";
import { escape }       from 'html-escaper';
import { log }          from "./logger";

export const errorHandler: ErrorHandler = async (err) => {
	if (err) {
		try {
			const msg =
				err.message + `\n<code>${escape(JSON.stringify(err, null, 2))}</code>`;
			if (err.message.match("'sendChatAction' failed!")) {
				await err.ctx.leaveChat();
				await log(msg, 'HTML');
				return;
			}
			await log(msg, 'HTML');
			await err.ctx.reply(msg, { parse_mode: 'HTML' });
		} catch (e) {
			console.error(e);
		}
	}
};