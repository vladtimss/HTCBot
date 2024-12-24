import { Bot } from "grammy";
import env     from "./env";

const bot = new Bot(env.BOT_TOKEN);

export default bot;