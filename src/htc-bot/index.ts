import { Bot }               from 'grammy';
import { loggingMiddleware } from "./middlewares/logging";
import { startCommand }      from "./commands/start";
import dotenv                from 'dotenv';

dotenv.config();

const htcBot = new Bot(process.env.TOKEN);

htcBot.use(loggingMiddleware);

htcBot.command('start', startCommand);

export default htcBot;
