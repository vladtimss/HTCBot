import { BotError, Context, GrammyError, HttpError } from "grammy";

/**
 *
 */
export const getErrorHeler = (botError: BotError<Context>): string => {
	const {error} = botError;

	if (error instanceof GrammyError) {
		return `Error in request: ${error.description}`
	} else if (error instanceof HttpError) {
		return `Could not contact to Telegram: ${error}`
	} else {
		return `Unknown error: ${error}`
	}
}