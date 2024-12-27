import bot    from "../bot";
import start  from "./start";

export const useCommands = (): void => {
	bot.use(start);
};